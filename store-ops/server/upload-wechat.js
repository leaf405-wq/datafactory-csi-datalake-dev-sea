import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { installMiniProgram, pointWechatAtMiniProgram } from "./load-wechat.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceConfig = path.join(root, "miniprogram", "project.config.json");

export function canUpload(appid) {
  return typeof appid === "string" && /^wx[0-9a-zA-Z]{16}$/.test(appid);
}

export function versionStamp(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value("year")}.${value("month")}.${value("day")}`;
}

export function writeAppId(appid, file = sourceConfig) {
  if (!canUpload(appid)) return false;
  const current = JSON.parse(readFileSync(file, "utf8"));
  current.appid = appid;
  writeFileSync(file, `${JSON.stringify(current, null, 2)}\n`);
  return true;
}

function readAppId(projectDir) {
  try {
    return JSON.parse(readFileSync(path.join(projectDir, "project.config.json"), "utf8")).appid || "";
  } catch {
    return "";
  }
}

function cliPath() {
  return [
    "/Applications/wechatwebdevtools.app/Contents/MacOS/cli",
    "/Applications/wechatwebdevtools.app/Contents/MacOS/cli.js",
    path.join(process.env.LOCALAPPDATA || "", "微信开发者工具", "cli.bat"),
    "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat",
  ].find((file) => file && existsSync(file));
}

function explain(project) {
  console.log("测试号不能上传到微信。要在微信里发布和更新，按这个顺序：");
  console.log("1. 用管理员微信打开 https://mp.weixin.qq.com 注册小程序，复制 AppID（wx 开头）。");
  console.log(`2. 在 store-ops 执行 WECHAT_APPID=wx你的AppID npm run wechat:upload`);
  console.log(`3. 开发者工具要用这个小程序的管理员或开发者微信扫码登录。项目目录是 ${project}`);
  console.log("4. 上传成功后，打开 mp.weixin.qq.com → 管理 → 版本管理。");
  console.log("5. 把刚上传的开发版本提交审核，通过后点发布。");
  console.log("以后更新：再执行一次 npm run wechat:upload，然后在版本管理里提交并发布。用户在微信里打开时会提示重启更新。");
  console.log("手机上的请求不能用 127.0.0.1。请把接口部署成已备案的 https 域名，填进公众平台的 request 合法域名，并在小程序里长按标题改成这个地址。");
}

function main() {
  const given = process.env.WECHAT_APPID || "";
  if (given) writeAppId(given);
  const dest = installMiniProgram();
  const parents = pointWechatAtMiniProgram();
  const project = parents[0] || dest;
  const appid = readAppId(project);
  if (!canUpload(appid)) {
    explain(project);
    process.exit(1);
  }
  const cli = cliPath();
  if (!cli) {
    console.log(`本机没有微信开发者工具命令行。请在工具里打开 ${project}，点右上角「上传」。`);
    process.exit(1);
  }
  const version = process.env.WECHAT_VERSION || versionStamp();
  const desc = process.env.WECHAT_DESC || "经营管理更新";
  console.log(`上传 ${project} ，AppID ${appid} ，版本 ${version}`);
  const uploaded = spawnSync(cli, ["upload", "--project", project, "-v", version, "-d", desc, "--lang", "zh"], { stdio: "inherit" });
  if (uploaded.status) {
    console.log("上传没有完成。开发者工具需要已登录，并且设置 → 安全设置里的服务端口是打开的。");
    process.exit(uploaded.status);
  }
  console.log("已上传为开发版本。打开 https://mp.weixin.qq.com → 管理 → 版本管理，提交审核并发布。");
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) main();
