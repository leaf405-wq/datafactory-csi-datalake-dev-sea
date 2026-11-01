import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "miniprogram");
const dest = path.join(homedir(), "WeChatProjects", "maxmara-store-ops");

mkdirSync(path.dirname(dest), { recursive: true });
rmSync(dest, { recursive: true, force: true });
cpSync(source, dest, { recursive: true });
console.log(`已放入微信开发者工具默认目录 ${dest}`);

const cli = [
  "/Applications/wechatwebdevtools.app/Contents/MacOS/cli",
  "/Applications/wechatwebdevtools.app/Contents/MacOS/cli.js",
  path.join(process.env.LOCALAPPDATA || "", "微信开发者工具", "cli.bat"),
  "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat",
].find((file) => file && existsSync(file));

if (!cli) {
  console.log("这台机器上没有微信开发者工具。在 Mac 上打开工具，导入上面这个目录；AppID 选测试号。");
  process.exit(0);
}

const opened = spawnSync(cli, ["open", "--project", dest], { stdio: "inherit" });
process.exit(opened.status || 0);
