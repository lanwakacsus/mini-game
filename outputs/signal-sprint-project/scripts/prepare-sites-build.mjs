#!/usr/bin/env node
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const publicDir = path.join(root, "public");
const worker = path.join(root, "worker", "index.js");
const hosting = path.join(root, ".openai", "hosting.json");
const dbDir = path.join(root, "db");

for (const file of [publicDir, worker, hosting]) {
  if (!existsSync(file)) throw new Error(`Missing build input: ${file}`);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(path.join(dist, "client"), { recursive: true });
mkdirSync(path.join(dist, "server"), { recursive: true });
mkdirSync(path.join(dist, ".openai"), { recursive: true });

cpSync(publicDir, path.join(dist, "client"), { recursive: true });
copyFileSync(worker, path.join(dist, "server", "index.js"));
copyFileSync(hosting, path.join(dist, ".openai", "hosting.json"));
if (existsSync(dbDir)) cpSync(dbDir, path.join(dist, "db"), { recursive: true });

console.log("Prepared Sites build in dist/");
