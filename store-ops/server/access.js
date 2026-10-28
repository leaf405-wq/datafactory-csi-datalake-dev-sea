import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const classes = path.join(__dirname, "classes");
const jars = [
  "jackcess-4.0.7.jar",
  "commons-lang3-3.10.jar",
  "commons-logging-1.2.jar",
  "json-20240303.jar",
].map((name) => path.join(__dirname, "lib", name));

let port = Number(process.env.ACCESS_PORT || 9091);
let child;

export function accessFile() {
  return path.join(root, "data", "storeops.accdb");
}

export async function startAccess() {
  const classpath = [...jars, classes].join(path.delimiter);
  child = spawn(
    "java",
    ["-cp", classpath, "com.storeops.AccessServer", accessFile(), String(port)],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdout.on("data", (chunk) => process.stdout.write(`[access] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[access] ${chunk}`));
  await waitForReady();
  return accessFile();
}

export async function stopAccess() {
  if (child && !child.killed) child.kill();
}

async function waitForReady() {
  const started = Date.now();
  while (Date.now() - started < 8000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {
      // process still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Microsoft Access 数据库进程没有在 8 秒内启动");
}

export async function db(op) {
  const response = await fetch(`http://127.0.0.1:${port}/db`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(op),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Access 写入失败");
  return payload;
}

export const all = (table) => db({ op: "all", table }).then((result) => result.rows);
export const find = (table, where) => db({ op: "find", table, where }).then((result) => result.rows);
export const insert = (table, row) => db({ op: "insert", table, row });
export const update = (table, id, patch) => db({ op: "update", table, id, patch });
export const remove = (table, id) => db({ op: "delete", table, id });
