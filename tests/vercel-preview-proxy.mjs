import { createServer } from "node:http";
import { Readable } from "node:stream";

const targetOrigin = process.env.E2E_PREVIEW_ORIGIN;
const shareUrl = process.env.E2E_SHARE_URL;
const port = Number(process.env.E2E_PROXY_PORT || 4175);

if (!targetOrigin || !shareUrl) {
  throw new Error("E2E_PREVIEW_ORIGIN and E2E_SHARE_URL are required");
}

const target = new URL(targetOrigin);
const shareToken = new URL(shareUrl).searchParams.get("_vercel_share");
if (!shareToken) throw new Error("The Vercel share URL has no share token");

const ignoredRequestHeaders = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
]);
const ignoredResponseHeaders = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
]);

async function readBody(request) {
  if (["GET", "HEAD"].includes(request.method || "GET")) return undefined;
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

const server = createServer(async (request, response) => {
  if (request.url === "/__health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  try {
    const destination = new URL(request.url || "/", target);
    destination.searchParams.set("_vercel_share", shareToken);

    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (ignoredRequestHeaders.has(name.toLowerCase()) || value == null) continue;
      if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
      else headers.set(name, value);
    }
    headers.set("x-forwarded-host", request.headers.host || `127.0.0.1:${port}`);
    headers.set("x-forwarded-proto", "http");

    const upstream = await fetch(destination, {
      method: request.method,
      headers,
      body: await readBody(request),
      redirect: "manual",
    });

    const responseHeaders = {};
    for (const [name, value] of upstream.headers.entries()) {
      if (ignoredResponseHeaders.has(name.toLowerCase())) continue;
      if (name.toLowerCase() === "location") {
        const location = new URL(value, target);
        if (location.origin === target.origin) {
          responseHeaders[name] = `http://127.0.0.1:${port}${location.pathname}${location.search}${location.hash}`;
        } else {
          responseHeaders[name] = value;
        }
      } else if (name.toLowerCase() !== "set-cookie") {
        responseHeaders[name] = value;
      }
    }

    const getSetCookie = upstream.headers.getSetCookie?.bind(upstream.headers);
    const cookies = getSetCookie ? getSetCookie() : [];
    if (cookies.length) responseHeaders["set-cookie"] = cookies;

    response.writeHead(upstream.status, responseHeaders);
    if (upstream.body) Readable.fromWeb(upstream.body).pipe(response);
    else response.end();
  } catch (error) {
    console.error(error);
    response.writeHead(502, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Preview proxy listening on http://127.0.0.1:${port}`);
});
