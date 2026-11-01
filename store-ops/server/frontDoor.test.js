import assert from "node:assert/strict";
import express from "express";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { attachFrontDoor } from "./frontDoor.js";

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

test("3780 首页在开发时打开 Vite 页面，不再返回未构建的 JSON", async () => {
  const vite = http.createServer((req, res) => {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end("<!doctype html><title>MaxMara经营系统</title><h1>经营首页</h1>");
  });
  const vitePort = await listen(vite);
  const app = express();
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  attachFrontDoor(app, { distDir: path.join(os.tmpdir(), `store-ops-missing-${Date.now()}`), vitePort });
  const server = http.createServer(app);
  const port = await listen(server);
  try {
    const home = await fetch(`http://127.0.0.1:${port}/`);
    const text = await home.text();
    assert.equal(home.status, 200);
    assert.match(text, /经营首页/);
    assert.equal(text.includes("前端还没有构建"), false);
    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.deepEqual(await health.json(), { ok: true });
  } finally {
    await close(server);
    await close(vite);
  }
});

test("页面进程没起来时，3780 返回说明页", async () => {
  const app = express();
  attachFrontDoor(app, { distDir: path.join(os.tmpdir(), `store-ops-missing-${Date.now()}`), vitePort: 1 });
  const server = http.createServer(app);
  const port = await listen(server);
  try {
    const home = await fetch(`http://127.0.0.1:${port}/`);
    const text = await home.text();
    assert.equal(home.status, 503);
    assert.match(text, /MaxMara经营系统/);
    assert.match(text, /npm run dev/);
    assert.equal(text.includes("前端还没有构建"), false);
  } finally {
    await close(server);
  }
});

test("已经构建的页面仍由 3780 直接打开", async () => {
  const distDir = fs.mkdtempSync(path.join(os.tmpdir(), "store-ops-dist-"));
  fs.writeFileSync(path.join(distDir, "index.html"), "<!doctype html><title>MaxMara经营系统</title><h1>已构建</h1>");
  const app = express();
  attachFrontDoor(app, { distDir, vitePort: 1 });
  const server = http.createServer(app);
  const port = await listen(server);
  try {
    const home = await fetch(`http://127.0.0.1:${port}/`);
    const text = await home.text();
    assert.equal(home.status, 200);
    assert.match(text, /已构建/);
  } finally {
    await close(server);
    fs.rmSync(distDir, { recursive: true, force: true });
  }
});
