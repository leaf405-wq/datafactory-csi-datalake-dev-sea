import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mirrorIpv6 } from "./loopback.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [];

function start(command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("error", (err) => {
    console.error(err.message);
    shutdown(1);
  });
  children.push(child);
  return child;
}

const pageMirror = mirrorIpv6(5173);
const api = start(process.execPath, ["server/index.js"]);
start(npm, ["run", "dev", "--prefix", "client"]);
console.log("打开 http://127.0.0.1:5173/");

function shutdown(code = 0) {
  pageMirror.close();
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(code), 400);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
api.on("exit", (code, signal) => {
  if (signal) return;
  if (code) shutdown(code);
});
