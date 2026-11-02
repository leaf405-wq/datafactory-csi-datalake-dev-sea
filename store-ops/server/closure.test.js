import assert from "node:assert/strict";
import test from "node:test";
import { diagnosePrd } from "./prd.js";
import { evaluateClosure, isClosed, monthSignal, signalsFromBills } from "./closure.js";

const through = { year: 2026, month: 10 };

function months(signal, count, end = through) {
  const rows = [];
  let year = end.year;
  let month = end.month;
  for (let index = 0; index < count; index += 1) {
    rows.push({ year, month, signal });
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return rows;
}

test("连续 6 个月红色或黄色才能闭店，橙色和中间空月不算", () => {
  assert.equal(evaluateClosure(months("red", 6), through).allowed, true);
  assert.equal(evaluateClosure(months("yellow", 6), through).allowed, true);
  const mixed = months("red", 6);
  mixed[2].signal = "yellow";
  mixed[4].signal = "red";
  assert.equal(evaluateClosure(mixed, through).allowed, true);
  assert.equal(evaluateClosure(months("red", 5), through).allowed, false);
  assert.equal(evaluateClosure(months("orange", 6), through).allowed, false);
  const gap = months("red", 6);
  gap[3].signal = "";
  const blocked = evaluateClosure(gap, through);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.hit, 5);
  assert.match(blocked.reason, /还不能闭店/);
});

test("严重算红，关注算黄，警告和数据异常不算", () => {
  assert.equal(monthSignal([{ level: "red", dimension: "租售比" }]), "red");
  assert.equal(monthSignal([{ level: "yellow", dimension: "利润状态" }, { level: "orange", dimension: "保底达成" }]), "yellow");
  assert.equal(monthSignal([{ level: "orange", dimension: "租售比" }]), "");
  assert.equal(monthSignal([{ level: "red", dimension: "数据异常" }]), "");
  assert.equal(isClosed({ status: "失效-闭店" }), true);
  assert.equal(isClosed({ status: "NORMAL_OPERATION" }), false);
});

test("账单按每日预警的红和黄判断最近 6 个月", () => {
  const bills = [];
  for (let month = 5; month <= 10; month += 1) {
    bills.push({
      year: 2026,
      month,
      sales: 100000,
      payable: 40000,
      rent_to_sales: month % 2 === 0 ? 0.31 : 0.22,
    });
  }
  const signals = signalsFromBills(bills, { min_sales: 50000 }, through, diagnosePrd);
  const verdict = evaluateClosure(signals, through);
  assert.equal(verdict.allowed, true);
  assert.deepEqual(verdict.colors.map((item) => item.signal), ["yellow", "red", "yellow", "red", "yellow", "red"]);
});
