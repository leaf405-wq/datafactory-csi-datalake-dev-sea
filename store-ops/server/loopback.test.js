import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import test from "node:test";
import { accessBootFailure } from "./access.js";
import { busyPortMessage, busyPorts, listenHttp, portBusy } from "./loopback.js";

function freePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function listenOn(port, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(port, host, () => resolve(server));
  });
}

test("端口有进程时算占用，关掉以后恢复空闲", async () => {
  const port = await freePort();
  const idle = await freePort();
  assert.equal(await portBusy(port), false);
  const server = await listenOn(port, "127.0.0.1");
  try {
    assert.equal(await portBusy(port), true);
    assert.deepEqual(await busyPorts([port, idle]), [port]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  assert.equal(await portBusy(port), false);
});

test("0.0.0.0 上的服务也会挡住 127.0.0.1", async () => {
  const port = await freePort();
  const server = await listenOn(port, "0.0.0.0");
  try {
    assert.equal(await portBusy(port), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("占用说明只列出仍被占用的端口，并给出停掉命令", () => {
  const message = busyPortMessage([3780, 5173]);
  assert.match(message, /端口 3780、5173 仍被上一次的开发服务占用/);
  assert.match(message, /Ctrl\+C/);
  assert.match(message, /lsof -tiTCP:3780 -tiTCP:5173 \| xargs kill/);
  assert.match(message, /然后再执行 npm run dev/);
  assert.doesNotMatch(message, /9091/);
  assert.match(
    busyPortMessage([3780, 5173, 9091]),
    /lsof -tiTCP:3780 -tiTCP:5173 -tiTCP:9091 \| xargs kill/,
  );
});

test("Access 绑不上端口时，不把已经在跑的服务当成启动成功", () => {
  const error = accessBootFailure("java.net.BindException: Address already in use\n\tat AccessServer.main", 1);
  assert.equal(error.code, "EADDRINUSE");
  assert.match(error.message, /9091/);
  assert.match(error.message, /lsof -tiTCP:9091 \| xargs kill/);
  assert.equal(accessBootFailure("", 0), null);
  const exited = accessBootFailure("other failure", 1);
  assert.match(exited.message, /Access 数据库进程退出，代码 1/);
  assert.equal(exited.code, undefined);
});

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
