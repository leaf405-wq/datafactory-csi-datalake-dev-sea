import http from "node:http";
import net from "node:net";
import os from "node:os";

export function lanHosts() {
  const found = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const item of nets[name] || []) {
      if (item.internal) continue;
      if (item.family !== "IPv4" && item.family !== 4) continue;
      if (item.address && !found.includes(item.address)) found.push(item.address);
    }
  }
  return found;
}

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.removeAllListeners("error");
      resolve();
    });
  });
}

export async function listenHttp(handler, port) {
  const primary = http.createServer(handler);
  // 0.0.0.0 仍接受 127.0.0.1。微信开发者工具拦本机地址时，可以改连局域网网卡。
  await listen(primary, port, "0.0.0.0");
  const servers = [primary];
  const extra = http.createServer(handler);
  try {
    await listen(extra, port, "::1");
    servers.push(extra);
  } catch (error) {
    extra.close();
    if (!["EADDRINUSE", "EAFNOSUPPORT", "EINVAL", "EADDRNOTAVAIL"].includes(error.code)) {
      console.warn(`::1:${port} 没有监听：${error.message}`);
    }
  }
  return servers;
}

export function portBusy(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    let settled = false;
    const finish = (busy) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(busy);
    };
    socket.setTimeout(400);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export async function busyPorts(ports) {
  const found = await Promise.all(ports.map(async (port) => ((await portBusy(port)) ? port : null)));
  return found.filter((port) => port != null);
}

export function busyPortMessage(ports) {
  const list = ports.join("、");
  const flags = ports.map((port) => `-tiTCP:${port}`).join(" ");
  return [
    `端口 ${list} 仍被上一次的开发服务占用。`,
    "先到原来的终端按 Ctrl+C 停掉 npm run dev。",
    "如果那个终端已经关了，在 store-ops 目录执行：",
    `lsof ${flags} | xargs kill`,
    "然后再执行 npm run dev。",
    "旧服务还在时，页面仍然是 http://127.0.0.1:3780/ 。",
  ].join("\n");
}

export function mirrorIpv6(port) {
  const server = net.createServer((client) => {
    const upstream = net.connect({ port, host: "127.0.0.1" });
    const stop = () => {
      client.destroy();
      upstream.destroy();
    };
    client.on("error", stop);
    upstream.on("error", stop);
    client.pipe(upstream);
    upstream.pipe(client);
  });
  server.on("error", (error) => {
    if (["EAFNOSUPPORT", "EADDRNOTAVAIL", "EADDRINUSE"].includes(error.code)) return;
    console.error(`::1:${port} 转发失败：${error.message}`);
  });
  server.listen(port, "::1");
  return server;
}
