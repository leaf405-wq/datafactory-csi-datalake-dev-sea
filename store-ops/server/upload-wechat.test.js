import assert from "node:assert/strict";
import test from "node:test";
import { canUpload, versionStamp } from "./upload-wechat.js";

test("只有 wx 开头的正式 AppID 可以上传，测试号不行", () => {
  assert.equal(canUpload("touristappid"), false);
  assert.equal(canUpload(""), false);
  assert.equal(canUpload("wx1234567890abcd"), false);
  assert.equal(canUpload("wx1234567890abcdef"), true);
});

test("上传版本号用上海日期", () => {
  assert.equal(versionStamp(new Date("2026-11-01T16:30:00Z")), "2026.11.2");
});
