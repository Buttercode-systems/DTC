import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { performance } from "node:perf_hooks";

const baseURL = process.env.PERF_BASE_URL || "http://127.0.0.1:3000";
const thresholdMs = Number(process.env.PERF_THRESHOLD_MS || 50);
const samples = Number(process.env.PERF_SAMPLES || 25);
const warmups = Number(process.env.PERF_WARMUPS || 5);
const manifestPath = process.env.PERF_MANIFEST || ".next/server/app-paths-manifest.json";
const fixturesPath = process.env.PERF_FIXTURES || "tests/performance/generated-fixtures.json";
const outputPath = process.env.PERF_OUTPUT || "performance-results.json";

if (!existsSync(manifestPath)) throw new Error(`Missing ${manifestPath}. Run npm run build first.`);
if (!existsSync(fixturesPath)) throw new Error(`Missing ${fixturesPath}. Run npm run perf:fixtures first.`);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const fixtures = JSON.parse(readFileSync(fixturesPath, "utf8"));
const ignored = new Set(fixtures.ignore || []);

function normalizeRoute(key) {
  if (!key.endsWith("/page")) return null;
  let route = key.slice(0, -5) || "/";
  route = route.replace(/\/\([^/]+\)/g, "");
  route = route.replace(/\/+/g, "/");
  return route || "/";
}

function resolveRoute(route) {
  if (!route.includes("[")) return route;
  return fixtures.routes?.[route] || null;
}

function profileFor(route) {
  if (fixtures.routeProfiles?.[route]) return fixtures.routeProfiles[route];
  const match = Object.entries(fixtures.prefixes || {})
    .sort(([a], [b]) => b.length - a.length)
    .find(([prefix]) => route === prefix || route.startsWith(`${prefix}/`));
  return match?.[1] || "public";
}

function expectedStatuses(route) {
  return fixtures.expectedStatuses?.[route] || [200];
}

const routes = [...new Set(Object.keys(manifest).map(normalizeRoute).filter(Boolean))]
  .filter((route) => !ignored.has(route))
  .sort();

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(index, 0)];
}

async function load(pathname, cookie) {
  const started = performance.now();
  const response = await fetch(new URL(pathname, baseURL), {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
  await response.arrayBuffer();
  return {
    durationMs: performance.now() - started,
    status: response.status,
    location: response.headers.get("location"),
  };
}

const results = [];
const unresolved = [];
for (const route of routes) {
  const pathname = resolveRoute(route);
  if (!pathname) {
    unresolved.push(route);
    console.log(`UNRESOLVED ${route}`);
    continue;
  }

  const profile = profileFor(route);
  const cookie = fixtures.profiles?.[profile]?.cookie || "";
  const allowedStatuses = expectedStatuses(route);

  for (let i = 0; i < warmups; i += 1) await load(pathname, cookie);

  const timings = [];
  let status = 0;
  let location = null;
  for (let i = 0; i < samples; i += 1) {
    const sample = await load(pathname, cookie);
    timings.push(sample.durationMs);
    status = sample.status;
    location = sample.location;
  }

  const p95Ms = percentile(timings, 95);
  const statusOk = allowedStatuses.includes(status);
  const noUnexpectedRedirect = !(status >= 300 && status < 400);
  const result = {
    route,
    pathname,
    profile,
    status,
    expectedStatuses: allowedStatuses,
    location,
    samples,
    p50Ms: Number(percentile(timings, 50).toFixed(2)),
    p95Ms: Number(p95Ms.toFixed(2)),
    maxMs: Number(Math.max(...timings).toFixed(2)),
    underThreshold: p95Ms < thresholdMs,
    statusOk,
    noUnexpectedRedirect,
    passed: p95Ms < thresholdMs && statusOk && noUnexpectedRedirect,
  };
  results.push(result);
  console.log(`${result.passed ? "PASS" : "FAIL"} [${profile}] ${pathname} status=${status} p50=${result.p50Ms}ms p95=${result.p95Ms}ms max=${result.maxMs}ms${location ? ` -> ${location}` : ""}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  baseURL,
  thresholdMs,
  samples,
  warmups,
  discoveredRouteCount: routes.length,
  measuredRouteCount: results.length,
  unresolved,
  failures: results.filter((result) => !result.passed),
  results,
};
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

if (report.failures.length || unresolved.length) process.exitCode = 1;
