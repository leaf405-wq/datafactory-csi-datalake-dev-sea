import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  cliRejectedMissingAppId,
  decideWechatOpen,
  enableWechatServicePort,
  pointWechatAtMiniProgram,
  servicePort,
  stampLanEndpoints,
  touristOpenMessage,
  trustWechatProject,
  withLanBases,
} from "./load-wechat.js";

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
    appid: "wx1234567890abcdef",
    setting: { urlCheck: true },
  })}\n`);
  writeFileSync(path.join(parent, "project.private.config.json"), `${JSON.stringify({
    setting: { urlCheck: true, useApiHostProcess: true },
  })}\n`);

  const pointed = pointWechatAtMiniProgram(home);
  assert.deepEqual(pointed, [parent]);
  const config = JSON.parse(readFileSync(path.join(parent, "project.config.json"), "utf8"));
  assert.equal(config.miniprogramRoot, "maxmara-store-ops/");
  assert.equal(config.appid, "wx1234567890abcdef");
  assert.equal(config.setting.urlCheck, false);
  assert.equal(config.setting.useApiHostProcess, false);
  const priv = JSON.parse(readFileSync(path.join(parent, "project.private.config.json"), "utf8"));
  assert.equal(priv.setting.urlCheck, false);
  assert.equal(priv.setting.useApiHostProcess, false);
  assert.equal(priv.appid, undefined);
  const app = JSON.parse(readFileSync(path.join(parent, "maxmara-store-ops", "app.json"), "utf8"));
  assert.equal(app.window.navigationBarTitleText, "MaxMara经营系统");
  const nested = JSON.parse(readFileSync(path.join(parent, "maxmara-store-ops", "project.config.json"), "utf8"));
  assert.equal(nested.appid, "wx1234567890abcdef");
  assert.equal(nested.setting.urlCheck, false);
  assert.equal(nested.setting.useApiHostProcess, false);
  assert.equal(nested.miniprogramRoot, undefined);
});

test("示例里不存在的 AppID 改成测试号，私人配置里的无效号不能留下", () => {
  const home = mkdtempSync(path.join(tmpdir(), "wechat-appid-"));
  const parent = path.join(home, "WeChatProjects");
  mkdirSync(path.join(parent, "maxmara-store-ops"), { recursive: true });
  writeFileSync(path.join(parent, "maxmara-store-ops", "app.json"), "{}\n");
  writeFileSync(path.join(parent, "project.config.json"), `${JSON.stringify({
    appid: "wx1234567890abcd",
    setting: { urlCheck: true },
  })}\n`);
  writeFileSync(path.join(parent, "project.private.config.json"), `${JSON.stringify({
    appid: "",
    setting: { urlCheck: true, useApiHostProcess: true },
  })}\n`);

  const pointed = pointWechatAtMiniProgram(home);
  assert.deepEqual(pointed, [parent]);
  const config = JSON.parse(readFileSync(path.join(parent, "project.config.json"), "utf8"));
  assert.equal(config.appid, "touristappid");
  assert.equal(config.miniprogramRoot, "maxmara-store-ops/");
  assert.equal(config.setting.urlCheck, false);
  const priv = JSON.parse(readFileSync(path.join(parent, "project.private.config.json"), "utf8"));
  assert.equal(priv.appid, "touristappid");
  assert.equal(priv.setting.useApiHostProcess, false);
  const nested = JSON.parse(readFileSync(path.join(parent, "maxmara-store-ops", "project.config.json"), "utf8"));
  assert.equal(nested.appid, "touristappid");
  assert.equal(nested.setting.urlCheck, false);
  assert.equal(nested.setting.useApiHostProcess, false);
});

test("私人配置里的正式 AppID 盖过项目配置，环境变量再盖过私人配置", () => {
  const home = mkdtempSync(path.join(tmpdir(), "wechat-private-"));
  const parent = path.join(home, "WeChatProjects", "MAXMARA");
  mkdirSync(path.join(parent, "maxmara-store-ops"), { recursive: true });
  writeFileSync(path.join(parent, "maxmara-store-ops", "app.json"), "{}\n");
  writeFileSync(path.join(parent, "project.config.json"), `${JSON.stringify({
    appid: "touristappid",
  })}\n`);
  writeFileSync(path.join(parent, "project.private.config.json"), `${JSON.stringify({
    appid: "wxabcdef1234567890",
  })}\n`);

  pointWechatAtMiniProgram(home);
  const kept = JSON.parse(readFileSync(path.join(parent, "project.config.json"), "utf8"));
  const priv = JSON.parse(readFileSync(path.join(parent, "project.private.config.json"), "utf8"));
  assert.equal(kept.appid, "wxabcdef1234567890");
  assert.equal(priv.appid, "wxabcdef1234567890");

  writeFileSync(path.join(parent, "maxmara-store-ops", "app.json"), "{}\n");
  pointWechatAtMiniProgram(home, "wx1234567890abcdef");
  const overridden = JSON.parse(readFileSync(path.join(parent, "project.config.json"), "utf8"));
  const privOver = JSON.parse(readFileSync(path.join(parent, "project.private.config.json"), "utf8"));
  const nested = JSON.parse(readFileSync(path.join(parent, "maxmara-store-ops", "project.config.json"), "utf8"));
  assert.equal(overridden.appid, "wx1234567890abcdef");
  assert.equal(privOver.appid, "wx1234567890abcdef");
  assert.equal(nested.appid, "wx1234567890abcdef");
});

test("打开内层小程序目录；测试号不允许命令行打开", () => {
  const dest = "/Users/a1234/WeChatProjects/maxmara-store-ops";
  const outer = "/Users/a1234/WeChatProjects";
  const sample = decideWechatOpen({
    dest,
    parents: [outer],
    projectAppId: "wx1234567890abcd",
    privateAppId: "touristappid",
  });
  assert.equal(sample.openPath, dest);
  assert.notEqual(sample.openPath, outer);
  assert.equal(sample.appid, "touristappid");
  assert.equal(sample.cliOpen, false);

  const nestedParent = "/Users/a1234/WeChatProjects/MAXMARA";
  const nested = decideWechatOpen({
    dest,
    parents: [nestedParent],
    projectAppId: "",
    privateAppId: "",
  });
  assert.equal(nested.openPath, "/Users/a1234/WeChatProjects/MAXMARA/maxmara-store-ops");
  assert.equal(nested.cliOpen, false);

  const alone = decideWechatOpen({ dest, parents: [], projectAppId: "touristappid" });
  assert.equal(alone.openPath, dest);
  assert.equal(alone.cliOpen, false);

  const real = decideWechatOpen({
    dest,
    parents: [outer],
    envAppId: "wx1234567890abcdef",
    privateAppId: "wxabcdef1234567890",
    projectAppId: "touristappid",
  });
  assert.equal(real.openPath, dest);
  assert.equal(real.appid, "wx1234567890abcdef");
  assert.equal(real.cliOpen, true);

  const fromPrivate = decideWechatOpen({
    dest,
    parents: [outer],
    privateAppId: "wxabcdef1234567890",
    projectAppId: "wx1234567890abcdef",
  });
  assert.equal(fromPrivate.appid, "wxabcdef1234567890");
  assert.equal(fromPrivate.cliOpen, true);

  const deadPrivate = decideWechatOpen({
    dest,
    parents: [outer],
    privateAppId: "wx1234567890abcd",
    projectAppId: "wx1234567890abcdef",
  });
  assert.equal(deadPrivate.appid, "wx1234567890abcdef");
  assert.equal(deadPrivate.cliOpen, true);
});

test("命令行返回不存在的 AppID 时只认这段说明，不把堆栈当结果", () => {
  assert.equal(
    touristOpenMessage(),
    "开发者工具打不开测试号以外的空 AppID；请在工具里打开该目录，AppID 选「测试号」；正式发布再设 WECHAT_APPID=wx... 然后 npm run wechat。",
  );
  assert.equal(cliRejectedMissingAppId(10, ""), true);
  assert.equal(cliRejectedMissingAppId(1, "Error: 不存在此 AppID 请检查后重新输入 (code 10)"), true);
  assert.equal(cliRejectedMissingAppId(0, "IDE 已启动"), false);
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
