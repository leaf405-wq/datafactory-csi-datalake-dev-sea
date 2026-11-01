import express from "express";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

export function pageMissingHtml(vitePort) {
  const page = `http://127.0.0.1:${vitePort}/`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>MaxMara经营系统</title>
</head>
<body style="font-family: sans-serif; padding: 32px; line-height: 1.6;">
  <h1>MaxMara经营系统</h1>
  <p>接口已经在这个端口上。经营页面还没有连上。</p>
  <p>在 store-ops 目录执行 <code>npm run dev</code>，看到 ready lanes 之后刷新本页。</p>
  <p>也可以打开 <a href="${page}">${page}</a>。</p>
</body>
</html>`;
}

export function attachFrontDoor(app, { distDir, vitePort = 5173 }) {
  const distIndex = path.join(distDir, "index.html");
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    if (fs.existsSync(distIndex)) {
      res.sendFile(distIndex, (error) => {
        if (error && !res.headersSent) res.status(503).type("html").send(pageMissingHtml(vitePort));
      });
      return;
    }
    proxyVite(req, res, vitePort);
  });
}

function proxyVite(req, res, vitePort) {
  const headers = { ...req.headers, host: `127.0.0.1:${vitePort}` };
  const upstream = http.request({
    host: "127.0.0.1",
    port: vitePort,
    method: req.method,
    path: req.originalUrl || req.url,
    headers,
  }, (incoming) => {
    res.writeHead(incoming.statusCode || 502, incoming.headers);
    incoming.pipe(res);
  });
  upstream.on("error", () => {
    if (res.headersSent) {
      res.end();
      return;
    }
    res.status(503).type("html").send(pageMissingHtml(vitePort));
  });
  req.pipe(upstream);
}
