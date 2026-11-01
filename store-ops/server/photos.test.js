import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { CATALOG } from "./catalog.js";
import { PHOTOS, photoFile, photoIdsForCatalog } from "./photos.js";

test("每家店都有一张不同来源的门店照片，原图在仓库里", () => {
  assert.equal(PHOTOS.length, 8);
  for (const photo of PHOTOS) {
    assert.equal(fs.existsSync(photoFile(photo)), true);
    assert.ok(fs.statSync(photoFile(photo)).size > 1000);
  }
  const assigned = photoIdsForCatalog(CATALOG);
  assert.equal(assigned.length, CATALOG.length);
  assert.equal(new Set(assigned).size, PHOTOS.length);
  const byId = new Map(CATALOG.map((item, index) => [item.id, assigned[index]]));
  assert.equal(byId.get("st-sanlitun"), "ph-facade-night");
  assert.equal(byId.get("st-chengdu"), "ph-facade-day");
  assert.equal(byId.get("st-taikoo"), "ph-mall-bears");
  const neighbors = assigned.filter((id, index) => index > 0 && id === assigned[index - 1]);
  assert.equal(neighbors.length, 0);
});
