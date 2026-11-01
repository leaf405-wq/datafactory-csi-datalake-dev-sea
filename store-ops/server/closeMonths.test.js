import assert from "node:assert/strict";
import test from "node:test";
import { incompleteStoreIds, monthsToFill, openingLanePlan, planCloseMonths } from "./closeMonths.js";

const STORES = ["st-a", "st-b", "st-c", "st-d", "st-e"];
const CONTRACTS = STORES.map((id, index) => ({
  store_id: id,
  status: "EFFECTIVE",
  model: "HIGHER_OF_TWO",
  fixed_rent: 80000 + index * 5000,
  rate: 0.12,
  min_sales: 900000 + index * 40000,
  overage_rate: 0.12,
  cap_amount: 0,
  tiers_json: "[]",
  property_fee: 12000,
  promo_fee: 3000,
  utility_fee: 2000,
  vat_rate: 0.09,
  waive_property: 0,
  rent_free_start: "",
  rent_free_end: "",
}));

test("结账月只铺到上月，11 月还没开始", () => {
  assert.deepEqual(monthsToFill({ year: 2026, month: 10 }).map((item) => item.month), [4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(monthsToFill({ year: 2026, month: 3 }), []);
  assert.equal(monthsToFill({ year: 2026, month: 10 }).some((item) => item.month === 11), false);
});

test("4 月到 10 月围绕正常结果，只有 3 家店的上月泳道未完成", () => {
  const unfinished = incompleteStoreIds(STORES);
  assert.equal(unfinished.length, 3);
  assert.deepEqual(incompleteStoreIds(STORES), unfinished);

  const plan = planCloseMonths({
    storeIds: STORES,
    contracts: CONTRACTS,
    marchSales: STORES.map((id, index) => ({ store_id: id, sales: index === 0 ? 400000 : 1000000 })),
    accounting: { year: 2026, month: 10 },
  });
  assert.equal(plan.rows.length, STORES.length * 7);
  assert.equal(plan.rows.some((row) => row.month === 3 || row.month === 11), false);
  for (const row of plan.rows) {
    assert.equal(row.sales >= 900000 * 0.95, true);
    assert.equal(row.rentToSales <= 0.145, true);
  }
  const october = plan.rows.filter((row) => row.month === 10);
  const open = october.filter((row) => row.incomplete);
  assert.equal(open.length, 3);
  assert.deepEqual(open.map((row) => row.storeId).sort(), [...unfinished].sort());
  assert.equal(open.every((row) => row.step === 7 && row.alert.level === "red"), true);
  assert.match(open[0].alert.message, /红色预警/);
  assert.equal(october.filter((row) => !row.incomplete).every((row) => row.step === 13 && row.alert == null), true);
  const april = plan.rows.find((row) => row.storeId === "st-b" && row.month === 4);
  const may = plan.rows.find((row) => row.storeId === "st-b" && row.month === 5);
  assert.notEqual(april.sales, may.sales);
  assert.equal(plan.rows.find((row) => row.storeId === unfinished[0] && row.month === 9).step, 13);
});

test("当月每家店从泳道第 1 步开始，不写销售", () => {
  const rows = openingLanePlan(STORES, { year: 2026, month: 11 });
  assert.equal(rows.length, STORES.length);
  assert.equal(rows.every((row) => row.step === 0 && row.month === 11 && row.sales == null), true);
});
