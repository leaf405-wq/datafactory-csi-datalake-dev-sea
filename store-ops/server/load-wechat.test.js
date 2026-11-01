import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { enableWechatServicePort, servicePort, trustWechatProject } from "./load-wechat.js";

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
