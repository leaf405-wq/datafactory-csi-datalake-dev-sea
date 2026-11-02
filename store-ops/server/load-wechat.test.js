import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { enableWechatServicePort, pointWechatAtMiniProgram, servicePort, stampLanEndpoints, trustWechatProject, withLanBases } from "./load-wechat.js";

test("把关掉的微信服务端口写成打开，并保留原来的端口", () => {
  const home = mkdtempSync(path.join(tmpdir(), "wechat-home-"));
  const dir = path.join(home, "Library", "Application Support", "微信开发者工具", "instance", "WeappLocalData");
  const file = path.join(dir, "localstorage_b72da75d79277d2f5f9c30c9177be57e.json");
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, `${JSON.stringify({ security: { enableServicePort: false, port: 34567, allowGetTicket: false } })}\n`);

  assert.equal(enableWechatServicePort(home), 1);
  const saved = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(saved.security.enableServicePort, true);
  assert.equal(saved.security.port, 34567);
  assert.equal(saved.security.allowGetTicket, false);
  assert.equal(servicePort(home), 34567);

  const project = "/Users/a1234/WeChatProjects/maxmara-store-ops";
  assert.equal(trustWechatProject(project, home), 1);
  const map = JSON.parse(readFileSync(path.join(dir, "hash_key_map_2.json"), "utf8"));
  assert.equal(map.b72da75d79277d2f5f9c30c9177be57e, "reduxPersist:settings");
});

test("外层示例项目改用里面的 maxmara-store-ops，不再编译 Weixin 首页", () => {
  const home = mkdtempSync(path.join(tmpdir(), "wechat-project-"));
  const parent = path.join(home, "WeChatProjects", "MAXMARA");
  mkdirSync(path.join(parent, "maxmara-store-ops"), { recursive: true });
  writeFileSync(path.join(parent, "maxmara-store-ops", "app.json"), "{}\n");
  writeFileSync(path.join(parent, "project.config.json"), `${JSON.stringify({
    projectname: "MAXMARA",
    appid: "wx1234567890abcd",
    setting: { urlCheck: true },
  })}\n`);
  writeFileSync(path.join(parent, "project.private.config.json"), `${JSON.stringify({
    setting: { urlCheck: true, useApiHostProcess: true },
  })}\n`);

  const pointed = pointWechatAtMiniProgram(home);
  assert.deepEqual(pointed, [parent]);
  const config = JSON.parse(readFileSync(path.join(parent, "project.config.json"), "utf8"));
  assert.equal(config.miniprogramRoot, "maxmara-store-ops/");
  assert.equal(config.appid, "wx1234567890abcd");
  assert.equal(config.setting.urlCheck, false);
  assert.equal(config.setting.useApiHostProcess, false);
  const priv = JSON.parse(readFileSync(path.join(parent, "project.private.config.json"), "utf8"));
  assert.equal(priv.setting.urlCheck, false);
  assert.equal(priv.setting.useApiHostProcess, false);
  const app = JSON.parse(readFileSync(path.join(parent, "maxmara-store-ops", "app.json"), "utf8"));
  assert.equal(app.window.navigationBarTitleText, "MaxMara经营系统");
});

test("拷进微信目录的接口列表带上局域网地址，仓库里的文件保持只有本机", () => {
  const source = [
    "const BASES = [",
    "  \"http://127.0.0.1:3780\",",
    "  \"http://localhost:3780\",",
    "];",
    "",
  ].join("\n");
  const once = withLanBases(source, ["http://10.0.0.8:3780"]);
  assert.match(once, /"http:\/\/127\.0\.0\.1:3780"/);
  assert.match(once, /"http:\/\/localhost:3780",\n {2}"http:\/\/10\.0\.0\.8:3780",/);
  assert.equal(withLanBases(once, ["http://10.0.0.8:3780"]), once);

  const home = mkdtempSync(path.join(tmpdir(), "wechat-lan-"));
  const dest = path.join(home, "maxmara-store-ops");
  mkdirSync(path.join(dest, "utils"), { recursive: true });
  writeFileSync(path.join(dest, "utils", "endpoints.js"), source);
  assert.equal(stampLanEndpoints(dest, ["http://192.168.1.9:3780"]), true);
  const written = readFileSync(path.join(dest, "utils", "endpoints.js"), "utf8");
  assert.match(written, /192\.168\.1\.9:3780/);
  assert.equal(stampLanEndpoints(dest, ["http://192.168.1.9:3780"]), false);
});
