import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { listenHttp } from "./loopback.js";

function freePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

test("监听 0.0.0.0 后，127.0.0.1 仍能打开同一端口", async () => {
  const port = await freePort();
  const servers = await listenHttp((req, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
  }, port);
  try {
    const local = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(local.status, 200);
    assert.equal(await local.text(), "ok");
  } finally {
    await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
  }
});
