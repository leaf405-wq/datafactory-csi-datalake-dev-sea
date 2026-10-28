import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const server = path.dirname(fileURLToPath(import.meta.url));
const jars = [
  "jackcess-4.0.7.jar",
  "commons-lang3-3.10.jar",
  "commons-logging-1.2.jar",
  "json-20240303.jar",
].map((name) => path.join(server, "lib", name));

const classFile = path.join(server, "classes", "com", "storeops", "AccessServer.class");
const result = spawnSync("javac", [
  "-encoding", "UTF-8",
  "-cp", jars.join(path.delimiter),
  "-d", path.join(server, "classes"),
  path.join(server, "java", "com", "storeops", "AccessServer.java"),
], { stdio: "inherit" });

if ((result.status ?? 1) !== 0) {
  if (result.error?.code === "ENOENT" && fs.existsSync(classFile)) {
    console.warn("本机没有 javac，继续使用仓库里已经编译好的 AccessServer.class。");
    process.exit(0);
  }
  process.exit(result.status ?? 1);
}
