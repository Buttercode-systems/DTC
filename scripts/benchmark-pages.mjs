import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { performance } from "node:perf_hooks";

const baseURL = process.env.PERF_BASE_URL || "http://127.0.0.1:3000";
const thresholdMs = Number(process.env.PERF_THRESHOLD_MS || 50);
const samples = Number(process.env.PERF_SAMPLES || 25);
const warmups = Number(process.env.PERF_WARMUPS || 5);
const manifestPath = process.env.PERF_MANIFEST || ".next/server/app-paths-manifest.json";
const fixturesPath = process.env.PERF_FIXTURES || "tests/performance/route-fixtures.json";
const outputPath = process.env.PERF_OUTPUT || "performance-results.json";
const cookie = process.env.PERF_COOKIE || "";

if (!existsSync(manifestPath)) {
  throw new Error(`Missing ${manifestPath}. Run npm run build first.`);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const fixtures = existsSync(fixturesPath)
  ? JSON.parse(readFileSync(fixturesPath, "utf8"))
  : { routes: {}, ignore: [] };
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

const routes = [...new Set(Object.keys(manifest).map(normalizeRoute).filter(Boolean))]
  .filter((route) => !ignored.has(route))
  .sort();

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(index, 0)];
}

async function load(pathname) {
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
    console.log(`UNRESOLVED ${route} — add a concrete route fixture to ${fixturesPath}`);
    continue;
  }

  for (let i = 0; i < warmups; i += 1) {
    await load(pathname);
  }

  const timings = [];
  let status = 0;
  let location = null;
  for (let i = 0; i < samples; i += 1) {
    const sample = await load(pathname);
    timings.push(sample.durationMs);
    status = sample.status;
    location = sample.location;
  }

  const p95Ms = percentile(timings, 95);
  const result = {
    route,
    pathname,
    status,
    location,
    samples,
    p50Ms: Number(percentile(timings, 50).toFixed(2)),
    p95Ms: Number(p95Ms.toFixed(2)),
    maxMs: Number(Math.max(...timings).toFixed(2)),
    underThreshold: p95Ms < thresholdMs,
  };
  results.push(result);
  console.log(`${result.underThreshold ? "PASS" : "FAIL"} ${pathname} status=${status} p50=${result.p50Ms}ms p95=${result.p95Ms}ms max=${result.maxMs}ms${location ? ` -> ${location}` : ""}`);
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
  failures: results.filter((result) => !result.underThreshold),
  redirects: results.filter((result) => result.status >= 300 && result.status < 400),
  results,
};
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

if (report.redirects.length && !cookie) {
  console.warn(`Measured ${report.redirects.length} redirecting pages without PERF_COOKIE. Authenticated content requires a separate authenticated pass.`);
}
if (report.failures.length || report.unresolved.length) {
  process.exitCode = 1;
}
