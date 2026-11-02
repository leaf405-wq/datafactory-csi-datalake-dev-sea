import assert from "node:assert/strict";
import test from "node:test";
import { incompleteStoreIds, monthsToFill, openingLanePlan, partialAssignments, planCloseMonths, scheduledStep } from "./closeMonths.js";

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

test("3 月到 8 月全部完成，9 月和 10 月只留 3 家停在第 10 到 12 步", () => {
  const partial = partialAssignments(STORES);
  assert.deepEqual(partial.map((row) => row.display), [10, 11, 12]);
  assert.deepEqual(partial.map((row) => row.step), [9, 10, 11]);
  const partialIds = new Set(partial.map((row) => row.storeId));

  const plan = planCloseMonths({
    storeIds: STORES,
    contracts: CONTRACTS,
    marchSales: STORES.map((id, index) => ({ store_id: id, sales: index === 0 ? 400000 : 1000000 })),
    accounting: { year: 2026, month: 10 },
  });
  assert.equal(plan.rows.length, STORES.length * 7);
  for (const row of plan.rows) {
    assert.equal(row.sales >= 900000 * 0.95, true);
    assert.equal(row.rentToSales <= 0.145, true);
  }
  for (const month of [4, 5, 6, 7, 8]) {
    assert.equal(plan.rows.filter((row) => row.month === month).every((row) => row.step === 13), true);
  }
  for (const month of [9, 10]) {
    const open = plan.rows.filter((row) => row.month === month && row.step < 13);
    assert.equal(open.length, 3);
    assert.deepEqual(open.map((row) => row.step).sort((a, b) => a - b), [9, 10, 11]);
    assert.equal(open.every((row) => partialIds.has(row.storeId)), true);
  }
  assert.equal(scheduledStep("st-a", { year: 2026, month: 3 }), 13);
  assert.equal(scheduledStep("st-houtan", { year: 2026, month: 10 }), null);
  assert.equal(scheduledStep("st-houtan", { year: 2026, month: 11 }), 4);
  assert.equal(scheduledStep("st-a", { year: 2026, month: 11 }), 4);
});

test("当月老店完成第 4 步，停在第 5 步，不写销售", () => {
  const rows = openingLanePlan(STORES, { year: 2026, month: 11 });
  assert.equal(rows.length, STORES.length);
  assert.equal(rows.every((row) => row.step === 4 && row.month === 11 && row.sales == null), true);
  assert.equal(incompleteStoreIds(STORES).length, 3);
});
