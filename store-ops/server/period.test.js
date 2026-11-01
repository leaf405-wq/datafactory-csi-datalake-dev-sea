import assert from "node:assert/strict";
import test from "node:test";
import { accountingPeriod, historyMonths, historyWindow } from "../client/src/period.js";

test("11 月整月的结账月仍是 10 月，1 月回到上年 12 月", () => {
  assert.deepEqual(accountingPeriod(new Date("2026-11-01T00:30:00+08:00")), { year: 2026, month: 10 });
  assert.deepEqual(accountingPeriod(new Date("2026-11-30T23:00:00+08:00")), { year: 2026, month: 10 });
  assert.deepEqual(accountingPeriod(new Date("2026-12-01T00:30:00+08:00")), { year: 2026, month: 11 });
  assert.deepEqual(accountingPeriod(new Date("2027-01-15T12:00:00+08:00")), { year: 2026, month: 12 });
});

test("历史只保留有记录的月份和当月，窗口最多前后各六个月", () => {
  const accounting = { year: 2026, month: 10 };
  const months = historyMonths([
    { year: 2026, month: 3 },
    { year: 2026, month: 3 },
    { year: 2026, month: 11 },
    { year: 2025, month: 12 },
  ], accounting);
  assert.deepEqual(months, [
    { year: 2025, month: 12 },
    { year: 2026, month: 3 },
    { year: 2026, month: 10 },
  ]);
  const short = historyWindow(months, accounting, 6);
  assert.equal(short.visible.length, 3);
  assert.equal(short.hasPrev, false);
  assert.equal(short.hasNext, false);

  const many = [];
  for (let month = 1; month <= 12; month += 1) many.push({ year: 2025, month });
  for (let month = 1; month <= 10; month += 1) many.push({ year: 2026, month });
  const atEnd = historyWindow(many, { year: 2026, month: 10 }, 6);
  assert.equal(atEnd.visible.length, 7);
  assert.equal(atEnd.visible[0].month, 4);
  assert.equal(atEnd.visible.at(-1).month, 10);
  assert.equal(atEnd.hasPrev, true);
  assert.equal(atEnd.hasNext, false);
  assert.deepEqual(atEnd.prevMonth, { year: 2026, month: 3 });
});
