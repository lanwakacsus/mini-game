#!/usr/bin/env node
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../worker/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "0.0.0.0";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const env = {
  ASSETS: {
    async fetch(request) {
      const url = new URL(request.url);
      const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = path.normalize(path.join(publicDir, decodeURIComponent(pathname)));
      if (!filePath.startsWith(publicDir)) return new Response("Forbidden", { status: 403 });

      try {
        const body = await readFile(filePath);
        return new Response(body, {
          headers: {
            "content-type": contentTypes[path.extname(filePath)] || "application/octet-stream",
            "cache-control": "no-store, max-age=0",
          },
        });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    },
  },
};

const server = http.createServer(async (incoming, outgoing) => {
  const url = `http://${incoming.headers.host || `localhost:${port}`}${incoming.url}`;
  const chunks = [];
  for await (const chunk of incoming) chunks.push(chunk);

  const request = new Request(url, {
    method: incoming.method,
    headers: incoming.headers,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });

  const response = await worker.fetch(request, env);
  outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
});

server.listen(port, host, () => {
  console.log(`Signal Sprint is running at http://localhost:${port}`);
  console.log(`For phones on the same Wi-Fi, open http://YOUR-COMPUTER-IP:${port}`);
});
