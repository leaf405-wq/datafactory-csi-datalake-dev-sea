import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lanHosts } from "./loopback.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "miniprogram");
const SETTINGS_KEY = "reduxPersist:settings";
const SETTINGS_HASH = createHash("md5").update(SETTINGS_KEY).digest("hex");
const DEFAULT_PORT = 21992;

export function withLanBases(source, lan) {
  const extras = [];
  for (const url of lan) {
    if (source.includes(JSON.stringify(url)) || extras.includes(url)) continue;
    extras.push(url);
  }
  if (!extras.length) return source;
  const marker = `  "http://localhost:3780",\n`;
  if (!source.includes(marker)) return source;
  const insertion = extras.map((url) => `  ${JSON.stringify(url)},`).join("\n");
  return source.replace(marker, `${marker}${insertion}\n`);
}

export function stampLanEndpoints(dir, lan = lanHosts().map((host) => `http://${host}:3780`)) {
  const file = path.join(dir, "utils", "endpoints.js");
  if (!existsSync(file)) return false;
  const current = readFileSync(file, "utf8");
  const next = withLanBases(current, lan);
  if (next !== current) writeFileSync(file, next);
  return next !== current;
}

export function installMiniProgram(dest = path.join(homedir(), "WeChatProjects", "maxmara-store-ops")) {
  mkdirSync(path.dirname(dest), { recursive: true });
  rmSync(dest, { recursive: true, force: true });
  cpSync(source, dest, { recursive: true });
  return dest;
}

function childDirs(dir) {
  if (!existsSync(dir)) return [];
  const found = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    try {
      if (statSync(full).isDirectory()) found.push(full);
    } catch {
      // skip unreadable entries
    }
  }
  return found;
}

export function pointWechatAtMiniProgram(home = homedir()) {
  const projects = path.join(home, "WeChatProjects");
  const parents = [projects, ...childDirs(projects).flatMap((dir) => [dir, ...childDirs(dir)])];
  const pointed = [];
  for (const dir of parents) {
    const nested = path.join(dir, "maxmara-store-ops");
    const configPath = path.join(dir, "project.config.json");
    if (!existsSync(path.join(nested, "app.json")) || !existsSync(configPath)) continue;
    if (path.resolve(dir) === path.resolve(nested)) continue;
    rmSync(nested, { recursive: true, force: true });
    cpSync(source, nested, { recursive: true });
    const current = readJson(configPath);
    const appid = typeof current.appid === "string" && current.appid.startsWith("wx")
      ? current.appid
      : (current.appid || "touristappid");
    writeJson(configPath, {
      ...current,
      miniprogramRoot: "maxmara-store-ops/",
      appid,
      compileType: "miniprogram",
      setting: {
        ...(current.setting || {}),
        urlCheck: false,
        useApiHostProcess: false,
        es6: true,
        enhance: true,
        postcss: true,
        minified: false,
      },
    });
    const privatePath = path.join(dir, "project.private.config.json");
    if (existsSync(privatePath)) {
      const priv = readJson(privatePath);
      writeJson(privatePath, {
        ...priv,
        setting: {
          ...(priv.setting || {}),
          urlCheck: false,
          useApiHostProcess: false,
        },
      });
    }
    pointed.push(dir);
  }
  return pointed;
}

function readJson(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function wechatBaseDirs(home = homedir()) {
  return [
    path.join(home, "Library", "Application Support", "微信开发者工具"),
    path.join(home, "AppData", "Local", "微信开发者工具", "User Data"),
  ];
}

function localDataDirs(home = homedir()) {
  const found = [];
  for (const base of wechatBaseDirs(home)) {
    if (!existsSync(base)) continue;
    const candidates = [base];
    for (const name of readdirSync(base)) {
      const full = path.join(base, name);
      try {
        if (statSync(full).isDirectory()) candidates.push(full);
      } catch {
        // skip unreadable entries
      }
    }
    for (const dir of candidates) {
      const local = path.join(dir, "WeappLocalData");
      if (existsSync(local) && statSync(local).isDirectory()) found.push(local);
    }
  }
  return [...new Set(found)];
}

export function enableWechatServicePort(home = homedir(), port = DEFAULT_PORT) {
  const dirs = localDataDirs(home);
  let updated = 0;
  for (const dir of dirs) {
    const names = [`localstorage_${SETTINGS_HASH}.json`, `ls_${SETTINGS_HASH}.json`];
    const existing = names.map((name) => path.join(dir, name)).find((file) => existsSync(file));
    const current = existing ? readJson(existing) : {};
    const security = current.security && typeof current.security === "object" ? current.security : {};
    current.security = {
      ...security,
      enableServicePort: true,
      port: Number.isInteger(security.port) && security.port > 0 ? security.port : port,
    };
    for (const name of names) writeJson(path.join(dir, name), current);
    const mapFile = path.join(dir, "hash_key_map_2.json");
    const map = readJson(mapFile);
    map[SETTINGS_HASH] = SETTINGS_KEY;
    writeJson(mapFile, map);
    updated += 1;
  }
  return updated;
}

export function trustWechatProject(projectPath, home = homedir()) {
  const project = path.resolve(projectPath);
  const key = `project2_${project}`;
  const hash = createHash("md5").update(key).digest("hex");
  let trusted = 0;
  for (const dir of localDataDirs(home)) {
    const mapFile = path.join(dir, "hash_key_map_2.json");
    const map = readJson(mapFile);
    map[hash] = key;
    writeJson(mapFile, map);
    for (const name of [`localstorage_${hash}.json`, `ls_${hash}.json`]) {
      const file = path.join(dir, name);
      const current = readJson(file);
      writeJson(file, { ...current, projectid: project, projectpath: project, isTrusted: true });
    }
    trusted += 1;
  }
  return trusted;
}

export function servicePort(home = homedir()) {
  for (const dir of localDataDirs(home)) {
    for (const name of [`localstorage_${SETTINGS_HASH}.json`, `ls_${SETTINGS_HASH}.json`]) {
      const security = readJson(path.join(dir, name)).security;
      if (security && security.enableServicePort === true && Number.isInteger(security.port)) return security.port;
    }
  }
  return DEFAULT_PORT;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function wechatRunning() {
  const result = spawnSync("pgrep", ["-f", "wechatwebdevtools"], { encoding: "utf8" });
  return result.status === 0 && result.stdout.trim().length > 0;
}

function quitWechat() {
  if (process.platform !== "darwin" || !wechatRunning()) return;
  console.log("服务端口还关着。先退出微信开发者工具，写上开关后再打开。");
  spawnSync("osascript", ["-e", 'tell application "wechatwebdevtools" to quit'], { stdio: "ignore" });
  spawnSync("osascript", ["-e", 'tell application "微信开发者工具" to quit'], { stdio: "ignore" });
  for (let i = 0; i < 40 && wechatRunning(); i += 1) sleep(300);
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(400);
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false));
    socket.on("error", () => done(false));
  });
}

async function waitForPort(port) {
  const started = Date.now();
  while (Date.now() - started < 20000) {
    if (await portOpen(port)) return true;
    sleep(400);
  }
  return false;
}

function launchWechat() {
  if (process.platform !== "darwin") return;
  for (const app of ["wechatwebdevtools", "微信开发者工具"]) {
    const opened = spawnSync("open", ["-a", app], { stdio: "ignore" });
    if (opened.status === 0) return;
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

async function main() {
  const dest = installMiniProgram();
  const parents = pointWechatAtMiniProgram();
  stampLanEndpoints(dest);
  for (const parent of parents) stampLanEndpoints(path.join(parent, "maxmara-store-ops"));
  const openPath = parents[0] || dest;
  const lan = lanHosts();
  if (lan.length) {
    console.log(`开发者工具若连不上 127.0.0.1，会改试 ${lan.map((host) => `http://${host}:3780`).join("、")}。请先重新运行 npm run dev。`);
  }
  console.log(`已放入微信开发者工具默认目录 ${dest}`);
  if (parents.length) {
    console.log(`外层项目 ${openPath} 原先编译的是自带的 Weixin 示例。已把小程序根目录改到里面的 maxmara-store-ops。`);
    console.log("重新编译后，标题应是 MaxMara经营系统。");
  }
  quitWechat();
  const updated = enableWechatServicePort();
  trustWechatProject(openPath);
  if (updated) console.log("已打开微信开发者工具的服务端口。");
  launchWechat();
  const cli = cliPath();
  if (!cli) {
    console.log("在微信开发者工具里选「导入项目」，目录用上面这一行。AppID 选测试号，详情里勾选不校验合法域名。");
    return;
  }
  const port = servicePort();
  if (updated) await waitForPort(port);
  const opened = spawnSync(cli, ["open", "--project", openPath, "--lang", "zh", "--port", String(port)], { input: "y\n", stdio: ["pipe", "inherit", "inherit"] });
  if (opened.status) {
    console.log(`命令行仍未能打开项目。请在微信开发者工具里导入 ${openPath}。`);
    console.log("不要导入外层那个只显示 Weixin 的示例。AppID 选测试号，详情里勾选不校验合法域名。");
  }
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
