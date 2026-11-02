import assert from "node:assert/strict";
import test from "node:test";
import { calculateMonthlyRent, diagnoseHealth, inRentFreePeriod } from "./rentEngine.js";

test("免租期基础租金为 0，仍叠加未免除的物业费并计税", () => {
  const bill = calculateMonthlyRent({
    inRentFreePeriod: true,
    waivePropertyInRentFree: false,
    sales: 100000,
    rate: 0.1,
    fixedRent: 50000,
    propertyFee: 3000,
    promoFee: 0,
    utilityFee: 0,
    subsidy: 0,
    vatRate: 0.09,
    model: "HIGHER_OF_TWO",
  });
  assert.equal(bill.baseRent, 0);
  assert.equal(bill.path, "rent_free");
  assert.equal(bill.surcharge, 3000);
  assert.equal(bill.vat, 270);
  assert.equal(bill.payable, 3270);
  assert.equal(bill.trace[1].decision, "是");
});

test("两者取高走 MAX", () => {
  const bill = calculateMonthlyRent({
    inRentFreePeriod: false,
    sales: 1500000,
    rate: 0.12,
    fixedRent: 120000,
    propertyFee: 20000,
    promoFee: 8000,
    utilityFee: 5000,
    subsidy: 0,
    vatRate: 0.09,
    model: "HIGHER_OF_TWO",
  });
  assert.equal(bill.commissionRent, 180000);
  assert.equal(bill.baseRent, 180000);
  assert.equal(bill.path, "max");
  assert.equal(bill.netBeforeVat, 213000);
  assert.equal(bill.payable, 232170);
  assert.equal(bill.trace.find((item) => item.node === "模型判断: 两者取高?").decision, "是");
});

test("流程图否分支走 MIN", () => {
  const bill = calculateMonthlyRent({
    inRentFreePeriod: false,
    sales: 1500000,
    rate: 0.12,
    fixedRent: 120000,
    propertyFee: 0,
    promoFee: 0,
    utilityFee: 0,
    subsidy: 1000,
    vatRate: 0,
    model: "LOWER_OF_TWO",
  });
  assert.equal(bill.baseRent, 120000);
  assert.equal(bill.path, "min");
  assert.equal(bill.netBeforeVat, 119000);
  assert.equal(bill.trace.find((item) => item.node === "模型判断: 两者取高?").decision, "否");
});

test("保底加超额在模型节点计算", () => {
  const bill = calculateMonthlyRent({
    inRentFreePeriod: false,
    model: "BASE_PLUS_OVERAGE",
    sales: 800000,
    rate: 0.1,
    overageRate: 0.15,
    minSales: 500000,
    fixedRent: 40000,
    propertyFee: 0,
    promoFee: 0,
    utilityFee: 0,
    subsidy: 0,
    vatRate: 0,
  });
  assert.equal(bill.baseRent, 85000);
  assert.equal(bill.path, "overage");
});

test("距保底差额过大触发红色预警，缺销售不装成经营预警", () => {
  const business = diagnoseHealth({ sales: 1500000, minSales: 2000000, rentToSales: 0.142 });
  assert.equal(business[0].level, "red");
  assert.equal(business[0].dimension, "保底达成");
  const missing = diagnoseHealth({ sales: 0, minSales: 100, salesMissing: true });
  assert.equal(missing[0].dimension, "数据异常");
});

test("免租期按月份判断", () => {
  const contract = { rent_free_start: "2026-03-01", rent_free_end: "2026-03-31" };
  assert.equal(inRentFreePeriod(contract, 2026, 3), true);
  assert.equal(inRentFreePeriod(contract, 2026, 4), false);
});
