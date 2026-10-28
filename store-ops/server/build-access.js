import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const server = path.dirname(fileURLToPath(import.meta.url));
const jars = [
  "jackcess-4.0.7.jar",
  "commons-lang3-3.10.jar",
  "commons-logging-1.2.jar",
  "json-20240303.jar",
].map((name) => path.join(server, "lib", name));

const result = spawnSync("javac", [
  "-encoding", "UTF-8",
  "-cp", jars.join(path.delimiter),
  "-d", path.join(server, "classes"),
  path.join(server, "java", "com", "storeops", "AccessServer.java"),
], { stdio: "inherit" });

process.exit(result.status ?? 1);
