import assert from "node:assert/strict";
import test from "node:test";
import { SAMPLE_CONTRACT, parseContract } from "./parser.js";

test("示例合同能抽出两者取高和免租期", () => {
  const parsed = parseContract(SAMPLE_CONTRACT);
  assert.equal(parsed.model, "HIGHER_OF_TWO");
  assert.equal(parsed.values.fixed_rent, 90000);
  assert.equal(parsed.values.rate, 0.11);
  assert.equal(parsed.values.reference_sales, 980000);
  assert.equal(parsed.values.rent_free_start, "2026-03-01");
  assert.ok(parsed.confidence >= 0.8);
});
