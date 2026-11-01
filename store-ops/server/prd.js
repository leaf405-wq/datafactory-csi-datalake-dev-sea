import { calculateMonthlyRent, inRentFreePeriod } from "./rentEngine.js";

export const ASSUMED_MARGIN = 0.55;
export const AS_OF = { year: 2026, month: 3, day: 20, daysInMonth: 31 };

const MODELS = new Set([
  "HIGHER_OF_TWO",
  "LOWER_OF_TWO",
  "FIXED_ONLY",
  "COMMISSION_ONLY",
  "BASE_PLUS_OVERAGE",
  "TIERED",
  "CAPPED",
]);

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function plain(value) {
  const n = Math.round(num(value));
  const sign = n < 0 ? "-" : "";
  return sign + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function pct(rate) {
  const value = num(rate) * 100;
  return `${Number(value.toFixed(2))}%`;
}

/** 18 or "18%" means 18%. 0.18 stays 18%. Numbers of 1 or below stay as a ratio. */
export function percentInput(value) {
  if (typeof value === "string") value = value.trim().replace(/%$/, "");
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? n / 100 : n;
}

function safeJson(text, fallback) {
  if (Array.isArray(text)) return text;
  try {
    const parsed = JSON.parse(text || "");
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function defaultTiers() {
  return [
    { upTo: 300000, rate: 0.12 },
    { upTo: 600000, rate: 0.15 },
    { upTo: null, rate: 0.18 },
  ];
}

function normalizeTiers(tiers) {
  const source = Array.isArray(tiers) && tiers.length ? tiers : defaultTiers();
  return source.map((tier) => ({
    upTo: tier.upTo === "" || tier.upTo == null ? null : num(tier.upTo),
    rate: percentInput(tier.rate),
  }));
}

function rentInput(input, sales) {
  const model = MODELS.has(input.model) ? input.model : "HIGHER_OF_TWO";
  const rate = percentInput(input.rate);
  return {
    model,
    sales: num(sales),
    rate,
    fixedRent: num(input.fixedRent),
    propertyFee: num(input.propertyFee),
    promoFee: 0,
    utilityFee: 0,
    subsidy: 0,
    vatRate: 0,
    minSales: num(input.minSales),
    overageRate: input.overageRate == null || input.overageRate === "" ? rate : percentInput(input.overageRate),
    capAmount: input.capAmount == null || input.capAmount === "" ? 100000 : num(input.capAmount),
    tiers: normalizeTiers(input.tiers),
    inRentFreePeriod: false,
  };
}

export function formulaOf(bill) {
  const property = plain(bill.property);
  const payable = plain(bill.payable);
  const sales = plain(bill.sales);
  const fixed = plain(bill.fixedRent);
  const rate = pct(bill.rate);
  if (bill.model === "HIGHER_OF_TWO") {
    return `MAX(${fixed}, ${sales}×${rate}) + 物业 ${property} = ${payable}`;
  }
  if (bill.model === "LOWER_OF_TWO") {
    return `MIN(${fixed}, ${sales}×${rate}) + 物业 ${property} = ${payable}`;
  }
  if (bill.model === "FIXED_ONLY") {
    return `固定租金 ${fixed} + 物业 ${property} = ${payable}`;
  }
  if (bill.model === "COMMISSION_ONLY") {
    return `${sales}×${rate} + 物业 ${property} = ${payable}`;
  }
  if (bill.model === "BASE_PLUS_OVERAGE") {
    return `保底租金 ${fixed} + MAX(0, (销售额−保底线)×超额扣点) + 物业 ${property} = ${payable}`;
  }
  if (bill.model === "CAPPED") {
    return `MIN(${sales}×${rate}, 封顶金额) + 物业 ${property} = ${payable}`;
  }
  return `阶梯扣点 ${plain(bill.baseRent)} + 物业 ${property} = ${payable}`;
}

/** Screenshot calculator: payable = model rent + property, no VAT, promo, or utilities. */
export function previewRent(input = {}) {
  const bill = calculateMonthlyRent(rentInput(input, input.sales));
  return { ...bill, formula: formulaOf(bill) };
}

function annuity(investment, payment, months, rate) {
  if (Math.abs(rate) < 1e-10) return -investment + payment * months;
  const factor = (1 - Math.pow(1 + rate, -months)) / rate;
  return -investment + payment * factor;
}

function monthlyRate(investment, payment, months) {
  if (!(payment > 0) || !(investment > 0)) return null;
  let rate = 0.01;
  for (let i = 0; i < 80; i += 1) {
    const npv = annuity(investment, payment, months, rate);
    const step = 1e-6;
    const slope = (annuity(investment, payment, months, rate + step) - npv) / step;
    if (!Number.isFinite(slope) || Math.abs(slope) < 1e-12) break;
    const next = rate - npv / slope;
    if (!Number.isFinite(next) || next <= -0.99) return null;
    if (Math.abs(next - rate) < 1e-12) return next;
    rate = next;
  }
  return rate;
}

function breakEvenDaily(monthAt) {
  if (monthAt(0).profit >= 0) return 0;
  let lo = 0;
  let hi = 1000;
  let guard = 0;
  while (monthAt(hi).profit < 0 && guard < 24) {
    hi *= 2;
    guard += 1;
    if (hi > 1e8) return null;
  }
  if (monthAt(hi).profit < 0) return null;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    if (monthAt(mid).profit >= 0) hi = mid;
    else lo = mid;
  }
  return round2(hi);
}

function monthView(input, dailySales) {
  const days = num(input.days) || 30;
  const margin = percentInput(input.margin);
  const ticket = num(input.ticket);
  const headcount = num(input.headcount);
  const salary = num(input.salary);
  const amortMonths = num(input.amortMonths) || 36;
  const investment = num(input.reno) + num(input.equip);
  const sales = round2(num(dailySales) * days);
  const gross = round2(sales * margin);
  const rent = calculateMonthlyRent(rentInput(input, sales));
  const staff = round2(headcount * salary);
  const amort = amortMonths > 0 ? round2(investment / amortMonths) : 0;
  const profit = round2(gross - rent.payable - staff - amort);
  return {
    dailySales: num(dailySales),
    sales,
    tickets: ticket > 0 ? round2(sales / ticket) : null,
    gross,
    grossMargin: margin,
    rent: rent.payable,
    staff,
    amort,
    profit,
    netMargin: sales > 0 ? profit / sales : null,
  };
}

export function forecastStore(input = {}) {
  const defaults = {
    dailySales: 20000,
    ticket: 2800,
    margin: 62,
    model: "HIGHER_OF_TWO",
    fixedRent: 80000,
    rate: 18,
    propertyFee: 12000,
    headcount: 8,
    salary: 8000,
    reno: 1800000,
    equip: 400000,
    amortMonths: 36,
    days: 30,
    minSales: 400000,
    overageRate: 25,
    capAmount: 100000,
    ...input,
  };
  const base = monthView(defaults, defaults.dailySales);
  const investment = num(defaults.reno) + num(defaults.equip);
  const amortMonths = num(defaults.amortMonths) || 36;
  const recovered = base.profit > 0;
  const paybackMonths = recovered ? round2(investment / base.profit) : null;
  const irrMonthly = recovered ? monthlyRate(investment, base.profit, amortMonths) : null;
  const irrAnnual = irrMonthly == null ? null : Math.pow(1 + irrMonthly, 12) - 1;
  const daily = breakEvenDaily((value) => monthView(defaults, value));
  const shocks = [0.9, 0.8].map((factor) => {
    const view = monthView(defaults, num(defaults.dailySales) * factor);
    return {
      label: factor === 0.9 ? "销售额下降 10%" : "销售额下降 20%",
      factor,
      dailySales: view.dailySales,
      sales: view.sales,
      profit: view.profit,
      profitable: view.profit > 0,
      text: view.profit > 0 ? "依然盈利" : "不再盈利",
    };
  });
  return {
    ...base,
    investment,
    amortMonths,
    paybackMonths,
    paybackText: recovered ? `${paybackMonths} 个月` : "无法回收",
    irrMonthly,
    irrAnnual,
    irrText: irrAnnual == null ? "无法回收" : `${(irrAnnual * 100).toFixed(1)}%`,
    breakEvenDaily: daily,
    breakEvenText: daily == null ? "在当前租金和费用下，提高日销仍无法盈利" : `${plain(daily)} 元`,
    sensitivity: shocks,
  };
}

export function diagnosePrd({
  sales = 0,
  rentToSales = null,
  minSales = 0,
  profit = 0,
  margin = null,
  previousMargin = null,
  lossStreak = null,
  timeProgress = AS_OF.day / AS_OF.daysInMonth,
  salesProgress = null,
} = {}) {
  const alerts = [];
  const notes = [];
  if (lossStreak != null && lossStreak >= 3) {
    alerts.push({ level: "red", dimension: "利润状态", message: "连续3月亏损" });
  } else if (profit < 0) {
    alerts.push({ level: "orange", dimension: "利润状态", message: "单月亏损" });
    if (lossStreak == null) notes.push("只有一个月的账单，不能判断是不是连续 3 月亏损。");
  } else if (previousMargin != null && previousMargin > 0 && margin != null) {
    const drop = (previousMargin - margin) / previousMargin;
    if (drop > 0.2) {
      alerts.push({
        level: "yellow",
        dimension: "利润状态",
        message: `利润率环比下滑 ${(drop * 100).toFixed(1)}%，超过 20%。`,
      });
    }
  } else if (previousMargin == null) {
    notes.push("没有上月利润率，不算环比下滑。");
  }

  if (rentToSales != null) {
    const shown = `${(rentToSales * 100).toFixed(1)}%`;
    if (rentToSales > 0.3) {
      alerts.push({ level: "red", dimension: "租售比", message: `租售比 ${shown}，超过 30%。` });
    } else if (rentToSales > 0.25) {
      alerts.push({ level: "orange", dimension: "租售比", message: `租售比 ${shown}，落在 25%–30%。` });
    } else if (rentToSales >= 0.2 && rentToSales < 0.25) {
      alerts.push({ level: "yellow", dimension: "租售比", message: `租售比 ${shown}，落在 20%–25%。` });
    }
  }

  let achievement = null;
  let progress = null;
  let paceGap = null;
  if (minSales > 0) {
    achievement = sales / minSales;
    progress = salesProgress == null ? achievement : salesProgress;
    paceGap = timeProgress - progress;
    const shown = `${(achievement * 100).toFixed(1)}%`;
    let blocked = false;
    if (achievement < 0.8) {
      blocked = true;
      alerts.push({ level: "red", dimension: "保底达成", message: `预测达成率 ${shown}，低于 80%。` });
    } else if (achievement < 0.9) {
      blocked = true;
      alerts.push({ level: "orange", dimension: "保底达成", message: `预测达成率 ${shown}，落在 80%–90%。` });
    }
    if (!blocked && paceGap >= 0.1) {
      alerts.push({
        level: "yellow",
        dimension: "保底达成",
        message: `时间进度超前销售进度 ${(paceGap * 100).toFixed(1)} 个百分点。`,
      });
    }
  }

  return { alerts, notes, achievement, salesProgress: progress, timeProgress, paceGap };
}

function contractOf(snapshot, storeId) {
  const rows = (snapshot.contracts || []).filter((item) => item.store_id === storeId);
  return rows.find((item) => item.status === "EFFECTIVE") || rows[0] || null;
}

function economicsOf(snapshot, store) {
  const period = snapshot.period || { year: AS_OF.year, month: AS_OF.month };
  const contract = contractOf(snapshot, store.id);
  const bill = (snapshot.bills || []).find((item) => (
    item.store_id === store.id && Number(item.year) === Number(period.year) && Number(item.month) === Number(period.month)
  ));
  const salesRow = (snapshot.sales || []).find((item) => (
    item.store_id === store.id && Number(item.year) === Number(period.year) && Number(item.month) === Number(period.month)
  ));
  if (bill) {
    const sales = num(bill.sales);
    const rentToSales = bill.rent_to_sales == null || bill.rent_to_sales === "" ? null : num(bill.rent_to_sales);
    return {
      contract,
      sales,
      payable: num(bill.payable),
      rentToSales,
      net: rentToSales == null ? num(bill.net_before_vat) : round2(sales * rentToSales),
      source: "月结账单",
    };
  }
  if (!contract || !salesRow) {
    return { contract, sales: salesRow ? num(salesRow.sales) : null, missing: true };
  }
  const sales = num(salesRow.sales);
  const calc = calculateMonthlyRent({
    inRentFreePeriod: inRentFreePeriod(contract, Number(period.year), Number(period.month)),
    waivePropertyInRentFree: Number(contract.waive_property) === 1,
    model: contract.model || "HIGHER_OF_TWO",
    sales,
    rate: num(contract.rate),
    fixedRent: num(contract.fixed_rent),
    minSales: num(contract.min_sales),
    overageRate: num(contract.overage_rate || contract.rate),
    capAmount: num(contract.cap_amount),
    tiers: safeJson(contract.tiers_json, []),
    propertyFee: num(contract.property_fee),
    promoFee: num(contract.promo_fee),
    utilityFee: num(contract.utility_fee),
    subsidy: 0,
    vatRate: contract.vat_rate == null || contract.vat_rate === "" ? 0.09 : num(contract.vat_rate),
  });
  return {
    contract,
    sales,
    payable: calc.payable,
    rentToSales: calc.rentToSales,
    net: calc.netBeforeVat,
    source: "按生效合同重算",
  };
}

function historyNoteOf(snapshot) {
  const keys = [...new Set((snapshot.bills || []).map((item) => {
    const year = Number(item.year);
    const month = Number(item.month);
    if (!year || month < 1 || month > 12) return "";
    return `${year}-${String(month).padStart(2, "0")}`;
  }).filter(Boolean))].sort();
  if (keys.length === 1) return `库里只有 ${keys[0]} 一个月，不能判断连续 3 月亏损，也没有租金占比的历史曲线。`;
  if (!keys.length) return "库里还没有月结账单，不能判断连续 3 月亏损，也没有租金占比的历史曲线。";
  return `库里已有 ${keys.join("、")}，未结月份不拿来判断连续 3 月亏损。`;
}

function openAgeMonths(lifecycleStart, period) {
  const match = String(lifecycleStart || "").match(/(\d{4})-(\d{2})/);
  if (!match || !period) return null;
  return (Number(period.year) - Number(match[1])) * 12 + (Number(period.month) - Number(match[2]));
}

/** First `limit` operating months of a new contract are ignored. Age 0 is the opening month. */
function inOpeningGrace(row, period, limit) {
  if (row.listedFrom !== "新签") return false;
  const age = openAgeMonths(row.lifecycleStart, period);
  return age != null && age >= 0 && age < limit;
}

function monthsUntil(leaseEnd, year, month) {
  const match = String(leaseEnd || "").match(/(\d{4})-(\d{2})/);
  if (!match) return null;
  return (Number(match[1]) - year) * 12 + (Number(match[2]) - month);
}

function minMaxScore(rows, key) {
  const values = rows.map((row) => row[key]).filter((value) => value != null && Number.isFinite(value));
  if (!values.length) return rows.map(() => null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return rows.map((row) => {
    const value = row[key];
    if (value == null || !Number.isFinite(value)) return null;
    if (max === min) return 100;
    return ((value - min) / (max - min)) * 100;
  });
}

/** 红榜：综合分前 20% 且分数不低于 50。黑榜：综合分后 20%，不看分数。 */
export function assignBoards(ranking) {
  const count = ranking.length;
  const top = Math.ceil(count * 0.2);
  const bottom = Math.ceil(count * 0.2);
  ranking.forEach((row, index) => {
    const best = index < top && Number(row.score) >= 50;
    const worst = index >= count - bottom;
    if (best) row.board = "红榜";
    else if (worst) row.board = "黑榜";
    else row.board = "";
  });
  return ranking;
}

export function buildDesk(snapshot) {
  const period = snapshot.period || { year: AS_OF.year, month: AS_OF.month };
  const timeProgress = AS_OF.day / AS_OF.daysInMonth;
  const monitor = (snapshot.stores || []).map((store) => {
    const money = economicsOf(snapshot, store);
    const base = {
      storeId: store.id,
      name: store.name,
      mall: store.mall_name,
      region: store.region,
      city: store.city,
      phone: store.phone || "",
      sellingArea: num(store.selling_area),
      leaseEnd: store.lease_end,
      lifecycleStart: store.lifecycle_start || "",
      listedFrom: store.listed_from || "",
      source: money.source || "",
    };
    if (money.missing || money.sales == null) {
      return {
        ...base,
        missing: true,
        sales: money.sales,
        alerts: [{ level: "red", dimension: "数据异常", message: "当月没有销售，不能当成经营预警。" }],
        notes: ["没有当月销售或生效合同。"],
      };
    }
    const profit = round2(money.sales * ASSUMED_MARGIN - money.payable);
    const margin = money.sales > 0 ? profit / money.sales : null;
    const diagnosis = diagnosePrd({
      sales: money.sales,
      rentToSales: money.rentToSales,
      minSales: num(money.contract?.min_sales),
      profit,
      margin,
      previousMargin: null,
      lossStreak: null,
      timeProgress,
    });
    const productivity = base.sellingArea > 0 ? round2(money.sales / base.sellingArea) : null;
    return {
      ...base,
      missing: false,
      sales: money.sales,
      payable: money.payable,
      netRent: money.net,
      rentToSales: money.rentToSales,
      gross: round2(money.sales * ASSUMED_MARGIN),
      profit,
      margin,
      productivity,
      fixedRent: num(money.contract?.fixed_rent),
      minSales: num(money.contract?.min_sales),
      ...diagnosis,
    };
  });

  const rankedSource = monitor.filter((row) => !row.missing && !inOpeningGrace(row, period, 1));
  const salesScore = minMaxScore(rankedSource, "sales");
  const profitScore = minMaxScore(rankedSource, "profit");
  const areaScore = minMaxScore(rankedSource, "productivity");
  const ranking = rankedSource.map((row, index) => {
    const parts = [salesScore[index], profitScore[index], areaScore[index]].filter((value) => value != null);
    const score = parts.length ? round2(parts.reduce((sum, value) => sum + value, 0) / parts.length) : null;
    return { ...row, score, staffEfficiency: null };
  }).sort((a, b) => (b.score || 0) - (a.score || 0) || String(a.name).localeCompare(String(b.name), "zh"));
  assignBoards(ranking);

  function rollup(key) {
    const groups = new Map();
    for (const row of rankedSource) {
      const name = row[key] || "未填";
      const current = groups.get(name) || { name, sales: 0, netRent: 0, payable: 0 };
      current.sales += num(row.sales);
      current.netRent += num(row.netRent);
      current.payable += num(row.payable);
      groups.set(name, current);
    }
    return [...groups.values()].map((group) => ({
      ...group,
      sales: round2(group.sales),
      netRent: round2(group.netRent),
      payable: round2(group.payable),
      ratio: group.sales > 0 ? group.netRent / group.sales : null,
    }));
  }

  const geoRows = new Map();
  for (const row of rankedSource) {
    const region = row.region || "未填区域";
    const city = row.city || "未填城市";
    const key = `${region} / ${city}`;
    const current = geoRows.get(key) || {
      label: key,
      region,
      city,
      stores: 0,
      sales: 0,
      weighted: 0,
      profit: 0,
    };
    const sales = num(row.sales);
    const profit = num(row.profit);
    current.stores += 1;
    current.sales += sales;
    current.profit += profit;
    current.weighted += profit * sales;
    geoRows.set(key, current);
  }
  const geo = [...geoRows.values()]
    .map((group) => ({
      label: group.label,
      region: group.region,
      city: group.city,
      stores: group.stores,
      sales: round2(group.sales),
      weightedAverageProfit: group.sales > 0 ? round2(group.weighted / group.sales) : null,
      weightedNetProfit: round2(group.profit),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "zh"));
  const rawGroups = [...geoRows.values()];
  const geoSales = rawGroups.reduce((sum, group) => sum + group.sales, 0);
  const geoSummary = {
    regions: new Set(geo.map((group) => group.region)).size,
    cities: new Set(geo.map((group) => group.city)).size,
    weightedAverageProfit: geoSales > 0 ? round2(rawGroups.reduce((sum, group) => sum + group.weighted, 0) / geoSales) : null,
    weightedNetProfit: round2(rawGroups.reduce((sum, group) => sum + group.profit, 0)),
  };

  const lease = monitor.filter((row) => !inOpeningGrace(row, period, 6)).map((row) => {
    const left = monthsUntil(row.leaseEnd, Number(period.year), Number(period.month));
    const penalty = round2(num(row.fixedRent) * 3);
    const inWindow = left != null && left <= 6;
    let advice = "没有租约结束日。";
    if (left != null && left < 0) advice = "租约已过结束月。";
    else if (left != null && inWindow) advice = "已进入到期前 6 个月，可对照估算违约金和继续经营的月利润。";
    else if (left != null) advice = `距到期 ${left} 个月，未进入到期前 6 个月，不自动生成闭店建议。`;
    return {
      storeId: row.storeId,
      name: row.name,
      mall: row.mall,
      leaseEnd: row.leaseEnd,
      monthsLeft: left,
      inWindow,
      penalty,
      monthlyProfit: row.profit ?? null,
      advice,
    };
  });

  return {
    asOf: `${AS_OF.year}-${String(AS_OF.month).padStart(2, "0")}-${String(AS_OF.day).padStart(2, "0")}`,
    period,
    day: AS_OF.day,
    daysInMonth: AS_OF.daysInMonth,
    timeProgress,
    margin: ASSUMED_MARGIN,
    marginNote: "毛利按销售额的 55% 估算。人事和 ERP 没有接入，人工和折旧没有从这里扣掉。",
    brdNote: "月结泳道写在账单上的预警仍用 BRD：租售比超过 25% 为红。这一页按 PRD 5.6 另算，不改那条规则。",
    historyNote: historyNoteOf(snapshot),
    monitor,
    ranking,
    rentBars: {
      malls: rollup("mall"),
      regions: rollup("region"),
    },
    geo,
    geoSummary,
    lease,
    malls: rollup("mall").map((group) => ({
      ...group,
      mallTotalUnknown: true,
    })),
  };
}
