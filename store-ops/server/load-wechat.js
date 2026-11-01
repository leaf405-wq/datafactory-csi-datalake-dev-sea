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
console.log("微信开发者工具里选「导入项目」，目录就用上面这一行。AppID 选测试号，详情里勾选不校验合法域名。");

if (process.platform === "darwin") {
  for (const app of ["wechatwebdevtools", "微信开发者工具"]) {
    const opened = spawnSync("open", ["-a", app], { stdio: "ignore" });
    if (opened.status === 0) break;
  }
}

const cli = [
  "/Applications/wechatwebdevtools.app/Contents/MacOS/cli",
  "/Applications/wechatwebdevtools.app/Contents/MacOS/cli.js",
  path.join(process.env.LOCALAPPDATA || "", "微信开发者工具", "cli.bat"),
  "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat",
].find((file) => file && existsSync(file));

if (!cli) process.exit(0);

const opened = spawnSync(cli, ["open", "--project", dest], { input: "y\n", stdio: ["pipe", "inherit", "inherit"] });
if (opened.status) {
  console.log("命令行没能自动打开项目。文件已经在目录里，按上面的路径手动导入即可。");
  console.log("若要下次自动打开：微信开发者工具 → 设置 → 安全设置 → 打开服务端口，然后再执行一次 npm run wechat。");
}
process.exit(0);
