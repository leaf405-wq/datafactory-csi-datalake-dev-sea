import assert from "node:assert/strict";
import test from "node:test";
import { assignBoards, buildDesk, diagnosePrd, forecastStore, previewRent } from "./prd.js";

test("两者取高演示：50万销售、固定8万、扣点18%、物业1.2万，应付102000且不含税", () => {
  const bill = previewRent({
    sales: 500000,
    fixedRent: 80000,
    rate: 18,
    propertyFee: 12000,
  });
  assert.equal(bill.model, "HIGHER_OF_TWO");
  assert.equal(bill.commissionRent, 90000);
  assert.equal(bill.baseRent, 90000);
  assert.equal(bill.vat, 0);
  assert.equal(bill.payable, 102000);
  assert.equal(bill.formula, "MAX(80,000, 500,000×18%) + 物业 12,000 = 102,000");
});

test("扣点写成 0.18 与 18 得到同一笔应付", () => {
  const ratio = previewRent({ sales: 500000, fixedRent: 80000, rate: 0.18, propertyFee: 12000 });
  assert.equal(ratio.payable, 102000);
});

test("保底超额、阶梯和封顶走同一租金引擎", () => {
  const overage = previewRent({
    model: "BASE_PLUS_OVERAGE",
    sales: 500000,
    fixedRent: 80000,
    rate: 18,
    propertyFee: 12000,
    minSales: 400000,
    overageRate: 25,
  });
  assert.equal(overage.payable, 117000);

  const tiered = previewRent({
    model: "TIERED",
    sales: 500000,
    fixedRent: 80000,
    propertyFee: 12000,
  });
  assert.equal(tiered.baseRent, 66000);
  assert.equal(tiered.payable, 78000);

  const capped = previewRent({
    model: "CAPPED",
    sales: 500000,
    fixedRent: 80000,
    rate: 18,
    propertyFee: 12000,
    capAmount: 70000,
  });
  assert.equal(capped.baseRent, 70000);
  assert.equal(capped.payable, 82000);
});

test("新店预测：日销2万、毛利62%时约17个月回收，下降两成仍盈利", () => {
  const view = forecastStore({});
  assert.equal(view.sales, 600000);
  assert.equal(view.rent, 120000);
  assert.ok(Math.abs(view.profit - 126888.89) < 0.02);
  assert.ok(view.paybackMonths > 17 && view.paybackMonths < 18);
  assert.ok(view.breakEvenDaily > 11000 && view.breakEvenDaily < 13000);
  assert.equal(view.sensitivity[0].profitable, true);
  assert.equal(view.sensitivity[1].text, "依然盈利");
  assert.ok(view.irrAnnual > 0.4 && view.irrAnnual < 1);
  let npv = -view.investment;
  for (let month = 1; month <= view.amortMonths; month += 1) {
    npv += view.profit / (1 + view.irrMonthly) ** month;
  }
  assert.ok(Math.abs(npv) < 1);
});

test("月利润不为正时，回收期和 IRR 写明无法回收", () => {
  const view = forecastStore({ dailySales: 1000 });
  assert.equal(view.paybackMonths, null);
  assert.equal(view.irrAnnual, null);
  assert.equal(view.paybackText, "无法回收");
  assert.equal(view.irrText, "无法回收");
});

test("PRD 5.6 预警线，不把单月亏损说成连续三月", () => {
  const redRent = diagnosePrd({ sales: 100, rentToSales: 0.32, minSales: 0, profit: 1, margin: 0.1 });
  assert.equal(redRent.alerts.find((item) => item.dimension === "租售比").level, "red");

  const edge = diagnosePrd({ sales: 100, rentToSales: 0.3, minSales: 0, profit: 1, margin: 0.1 });
  assert.equal(edge.alerts.find((item) => item.dimension === "租售比").level, "orange");

  const yellow = diagnosePrd({ sales: 100, rentToSales: 0.2, minSales: 0, profit: 1, margin: 0.1 });
  assert.equal(yellow.alerts.find((item) => item.dimension === "租售比").level, "yellow");
  const onTheLine = diagnosePrd({ sales: 100, rentToSales: 0.25, minSales: 0, profit: 1, margin: 0.1 });
  assert.equal(onTheLine.alerts.find((item) => item.dimension === "租售比"), undefined);

  const quiet = diagnosePrd({ sales: 100, rentToSales: 0.19, minSales: 0, profit: 1, margin: 0.1 });
  assert.equal(quiet.alerts.find((item) => item.dimension === "租售比"), undefined);

  const missed = diagnosePrd({ sales: 79, minSales: 100, profit: 1, rentToSales: 0.1 });
  assert.equal(missed.alerts.find((item) => item.dimension === "保底达成").level, "red");

  const tight = diagnosePrd({ sales: 80, minSales: 100, profit: 1, rentToSales: 0.1 });
  assert.equal(tight.alerts.find((item) => item.dimension === "保底达成").level, "orange");

  const pace = diagnosePrd({
    sales: 95,
    minSales: 100,
    profit: 1,
    rentToSales: 0.1,
    salesProgress: 0.5,
    timeProgress: 0.7,
  });
  assert.equal(pace.alerts.find((item) => item.dimension === "保底达成").level, "yellow");

  const loss = diagnosePrd({ sales: 100, minSales: 0, profit: -1, rentToSales: 0.1, lossStreak: null });
  assert.equal(loss.alerts.find((item) => item.dimension === "利润状态").message, "单月亏损");
  assert.match(loss.notes.join(""), /连续 3 月/);

  const streak = diagnosePrd({ sales: 100, minSales: 0, profit: -1, rentToSales: 0.1, lossStreak: 3 });
  assert.equal(streak.alerts.find((item) => item.dimension === "利润状态").level, "red");

  const slide = diagnosePrd({
    sales: 100,
    minSales: 0,
    profit: 10,
    margin: 0.3,
    previousMargin: 0.4,
    rentToSales: 0.1,
  });
  assert.equal(slide.alerts.find((item) => item.dimension === "利润状态").level, "yellow");
});

test("驾驶舱只用一个月的数据，租约未进 6 个月窗口", () => {
  const desk = buildDesk({
    period: { year: 2026, month: 3 },
    stores: [
      {
        id: "st-taikoo",
        name: "上海兴业太古汇店",
        mall_name: "兴业太古汇",
        region: "华东",
        city: "上海",
        selling_area: 108,
        lease_end: "2028-04-30",
      },
      {
        id: "st-mixc",
        name: "深圳湾万象城店",
        mall_name: "深圳湾万象城",
        region: "华南",
        city: "深圳",
        selling_area: 96,
        lease_end: "2027-12-31",
      },
    ],
    contracts: [
      { store_id: "st-taikoo", status: "EFFECTIVE", model: "HIGHER_OF_TWO", fixed_rent: 120000, rate: 0.12, min_sales: 2000000, property_fee: 20000, promo_fee: 8000, utility_fee: 5000, vat_rate: 0.09 },
      { store_id: "st-mixc", status: "EFFECTIVE", model: "HIGHER_OF_TWO", fixed_rent: 100000, rate: 0.08, min_sales: 900000, property_fee: 15000, promo_fee: 3000, utility_fee: 2000, vat_rate: 0.09 },
    ],
    sales: [],
    bills: [
      { store_id: "st-taikoo", year: 2026, month: 3, sales: 1500000, payable: 232170, rent_to_sales: 0.142, net_before_vat: 213000 },
      { store_id: "st-mixc", year: 2026, month: 3, sales: 900000, payable: 130800, rent_to_sales: 0.1333, net_before_vat: 120000 },
    ],
  });
  const taikoo = desk.monitor.find((row) => row.storeId === "st-taikoo");
  assert.equal(taikoo.alerts.some((item) => item.level === "red" && item.dimension === "保底达成"), true);
  assert.equal(taikoo.alerts.some((item) => item.message.includes("连续3月")), false);
  assert.equal(desk.lease.every((row) => row.inWindow === false), true);
  assert.match(desk.lease[0].advice, /不自动生成闭店建议/);
  assert.equal(desk.lease.find((row) => row.storeId === "st-taikoo").penalty, 360000);
  assert.equal(desk.ranking[0].board, "红榜");
  assert.equal(desk.ranking.at(-1).board, "黑榜");
  assert.equal(desk.ranking.every((row) => row.staffEfficiency == null), true);
  assert.match(desk.historyNote, /只有 2026-03/);
  assert.equal(desk.malls[0].mallTotalUnknown, true);
  const shanghai = desk.geo.find((row) => row.label === "华东 / 上海");
  assert.equal(shanghai.stores, 1);
  assert.equal(shanghai.weightedNetProfit, taikoo.profit);
  assert.equal(shanghai.weightedAverageProfit, taikoo.profit);
  assert.equal(desk.geoSummary.regions, 2);
  assert.equal(desk.geoSummary.cities, 2);
  assert.equal(desk.geoSummary.weightedNetProfit, roundSum(desk.geo, "weightedNetProfit"));
});

test("新店第一个月不进排行，前 6 个月不做闭店考核", () => {
  const stores = [
    { id: "st-old", name: "上海兴业太古汇店", region: "华东", city: "上海", lifecycle_start: "2019-03-01", lease_end: "2028-04-30", selling_area: 100 },
    { id: "st-houtan", name: "上海后滩太古里店", region: "华东", city: "上海", lifecycle_start: "2026-11-01", listed_from: "新签", lease_end: "2029-11-30", selling_area: 80 },
  ];
  const contracts = [
    { store_id: "st-old", status: "EFFECTIVE", fixed_rent: 100000, min_sales: 1000000 },
    { store_id: "st-houtan", status: "EFFECTIVE", fixed_rent: 88000, min_sales: 860000 },
  ];
  function deskAt(year, month) {
    return buildDesk({
      period: { year, month },
      stores,
      contracts,
      sales: [],
      bills: [
        { store_id: "st-old", year, month, sales: 1200000, payable: 150000, rent_to_sales: 0.12, net_before_vat: 140000 },
        { store_id: "st-houtan", year, month, sales: 900000, payable: 100000, rent_to_sales: 0.11, net_before_vat: 90000 },
      ],
    });
  }
  const opening = deskAt(2026, 11);
  assert.equal(opening.ranking.some((row) => row.storeId === "st-houtan"), false);
  assert.equal(opening.ranking.some((row) => row.storeId === "st-old"), true);
  assert.equal(opening.lease.some((row) => row.storeId === "st-houtan"), false);
  assert.equal(opening.lease.some((row) => row.storeId === "st-old"), true);
  const second = deskAt(2026, 12);
  assert.equal(second.ranking.some((row) => row.storeId === "st-houtan"), true);
  assert.equal(second.lease.some((row) => row.storeId === "st-houtan"), false);
  const sixth = deskAt(2027, 4);
  assert.equal(sixth.lease.some((row) => row.storeId === "st-houtan"), false);
  const seventh = deskAt(2027, 5);
  assert.equal(seventh.lease.some((row) => row.storeId === "st-houtan"), true);
});

test("红榜取前 20% 且综合分至少 50，黑榜取后 20%", () => {
  const high = [100, 99, 98, 97, 96, 95, 94, 93, 92, 40].map((score, index) => ({ name: `s${index}`, score }));
  assignBoards(high);
  assert.deepEqual(high.filter((row) => row.board === "红榜").map((row) => row.score), [100, 99]);
  assert.deepEqual(high.filter((row) => row.board === "黑榜").map((row) => row.score), [92, 40]);

  const gated = [100, 49, 48, 47, 46, 45, 44, 43, 42, 10].map((score, index) => ({ name: `g${index}`, score }));
  assignBoards(gated);
  assert.deepEqual(gated.filter((row) => row.board === "红榜").map((row) => row.score), [100]);
  assert.deepEqual(gated.filter((row) => row.board === "黑榜").map((row) => row.score), [42, 10]);
  assert.equal(gated.find((row) => row.score === 49).board, "");
});

test("当月没有账单时，区域加权利润留空", () => {
  const desk = buildDesk({
    period: { year: 2026, month: 10 },
    stores: [{ id: "st-taikoo", name: "上海兴业太古汇店", region: "华东", city: "上海" }],
    contracts: [],
    sales: [],
    bills: [{ store_id: "st-taikoo", year: 2026, month: 3, sales: 100, payable: 10, rent_to_sales: 0.1, net_before_vat: 10 }],
  });
  assert.equal(desk.geo.length, 0);
  assert.equal(desk.geoSummary.regions, 0);
  assert.equal(desk.geoSummary.cities, 0);
  assert.equal(desk.geoSummary.weightedAverageProfit, null);
  assert.equal(desk.geoSummary.weightedNetProfit, 0);
  assert.match(desk.historyNote, /只有 2026-03/);
});

function roundSum(rows, key) {
  return Math.round(rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) * 100) / 100;
}
