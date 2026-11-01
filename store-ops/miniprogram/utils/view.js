const ROLES = [
  { id: "expansion", label: "拓展部", actor: "拓展专员" },
  { id: "ops", label: "营运部", actor: "营运经理" },
  { id: "finance", label: "财务部", actor: "财务专员" },
  { id: "executive", label: "高管", actor: "区域负责人" },
];

const PAGES = [
  { id: "home", label: "经营首页" },
  { id: "contract", label: "新签合同" },
  { id: "stores", label: "店览宽表" },
  { id: "rent", label: "租金引擎" },
  { id: "forecast", label: "盈利预测" },
  { id: "monitor", label: "每日预警" },
  { id: "cockpit", label: "管理驾驶舱" },
];

const STEP_COLORS = [
  "#8c3f1c", "#1d6b45", "#1f4e79", "#8a5a00", "#6b3fa0",
  "#9d2c2c", "#0f6e6e", "#3d4c8a", "#a15c38", "#2f6f3e",
  "#7a3e5c", "#3e5f8a", "#5c4a1f",
];

const ACTOR = {
  expansion: "拓展部",
  ops: "营运部",
  finance: "财务部",
  mall: "商场方",
  system: "系统",
};

const DECISIONS = ["待评估", "Keep", "Keep & Renovate", "Keep & Relocate", "Close"];

const RENT_MODELS = [
  ["HIGHER_OF_TWO", "两者取高"],
  ["BASE_PLUS_OVERAGE", "保底+超额提成"],
  ["TIERED", "阶梯扣点"],
  ["CAPPED", "封顶扣点"],
  ["LOWER_OF_TWO", "两者取低"],
  ["FIXED_ONLY", "纯固定"],
  ["COMMISSION_ONLY", "纯扣点"],
];

const RENT_MATRIX = [
  ["两者取高（主流）", "MAX(固定租金, 销售额×扣点)", "80%以上的购物中心"],
  ["保底+超额提成", "保底租金 + MAX(0, (销售额−保底线)×超额扣点)", "高流量核心商圈"],
  ["阶梯扣点", "按销售额区间适用不同扣点率", "鼓励做高销售的商场"],
  ["封顶扣点", "MIN(销售额×扣点, 封顶金额)", "保护商户利益的优惠条款"],
];

const ALERT_MATRIX = [
  ["利润状态", "连续3月亏损", "单月亏损", "利润率环比下滑>20%"],
  ["租售比", "租售比 > 30%", "租售比 25%–30%", "租售比 20%–25%"],
  ["保底达成", "预测达成率 < 80%", "预测达成率 80%–90%", "时间进度超前销售进度10%"],
];

const MALL_FIELDS = [
  ["base_rent", "基础租金"],
  ["commission_rent", "扣点租金"],
  ["property_fee", "物业费"],
  ["promo_fee", "推广费"],
  ["utility_fee", "水电费"],
  ["card_fee", "刷卡手续费"],
  ["advance_fee", "商场代垫"],
  ["total", "商场合计"],
];

function field(object, key) {
  if (object == null) return undefined;
  return object[key];
}

function calendarMonth(now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "numeric",
    }).formatToParts(now);
    return {
      year: Number(parts.find((part) => part.type === "year").value),
      month: Number(parts.find((part) => part.type === "month").value),
    };
  } catch {
    const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
  }
}

function monthIndex(period) {
  return Number(period.year) * 12 + Number(period.month);
}

function sameMonth(left, right) {
  return Number(field(left, "year")) === Number(field(right, "year")) && Number(field(left, "month")) === Number(field(right, "month"));
}

function openMonthOf(record) {
  const raw = field(record, "lifecycle_start") || field(record, "lifecycleStart") || "";
  const match = String(raw).match(/(\d{4})-(\d{2})/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

function operatingIn(record, period) {
  const open = openMonthOf(record);
  if (!open || !period) return true;
  return monthIndex(period) >= monthIndex(open);
}

function historyMonths(rows, accounting, calendar) {
  const limit = calendar ? monthIndex(calendar) : monthIndex(accounting);
  const seen = new Map();
  for (const row of rows || []) {
    const year = Number(field(row, "year"));
    const month = Number(field(row, "month"));
    if (!year || month < 1 || month > 12) continue;
    if (monthIndex({ year, month }) > limit) continue;
    seen.set(`${year}-${month}`, { year, month });
  }
  if (accounting) seen.set(`${accounting.year}-${accounting.month}`, { year: accounting.year, month: accounting.month });
  if (calendar) seen.set(`${calendar.year}-${calendar.month}`, { year: calendar.year, month: calendar.month });
  return [...seen.values()].sort((left, right) => monthIndex(left) - monthIndex(right));
}

function historyWindow(months, selected, radius = 6) {
  const found = months.findIndex((item) => sameMonth(item, selected));
  const index = found === -1 ? months.length - 1 : found;
  const start = Math.max(0, index - radius);
  const end = Math.min(months.length, index + radius + 1);
  return {
    visible: months.slice(start, end),
    hasPrev: start > 0,
    hasNext: end < months.length,
    prevMonth: start > 0 ? months[start - 1] : null,
    nextMonth: end < months.length ? months[end] : null,
  };
}

function monthChipLabel(item, accounting, calendar) {
  if (calendar && sameMonth(item, calendar) && !sameMonth(item, accounting)) return "当月";
  if (sameMonth(item, accounting)) return "上月";
  return `${item.year}年${item.month}月`;
}

function money(value) {
  const number = Number(value || 0);
  const sign = number < 0 ? "-" : "";
  const [whole, fraction] = Math.abs(number).toFixed(2).split(".");
  return `${sign}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}

function percent(value) {
  if (value == null || value === "" || Number.isNaN(Number(value))) return "—";
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function inMonth(row, period) {
  return Number(row.year) === Number(period.year) && Number(row.month) === Number(period.month);
}

function matchesStore(store, query) {
  if (!query) return true;
  const blob = [store.region, store.city, store.name, store.mall_name, store.phone].filter(Boolean).join(" ");
  return blob.toLowerCase().includes(String(query).trim().toLowerCase());
}

function matchesDesk(row, query) {
  if (!query || !String(query).trim()) return true;
  const blob = [row.region, row.city, row.name, row.mall, row.phone].filter(Boolean).join(" ");
  return blob.toLowerCase().includes(String(query).trim().toLowerCase());
}

function laneStep(data, storeId, period) {
  const row = data.journey.find((item) => item.store_id === storeId && inMonth(item, period));
  return (row && row.step) || 0;
}

function laneUnfinished(data, storeId, period) {
  return data.alerts.some((alert) => (
    alert.store_id === storeId && inMonth(alert, period) && alert.level === "red" && alert.dimension === "泳道"
  ));
}

function laneView(step, unfinished) {
  const completed = Number(step) || 0;
  if (completed >= 13) return { done: true, alert: false, text: "已完成13步泳道", stepText: "已完成13步泳道", cells: [] };
  const current = completed + 1;
  return {
    done: false,
    alert: Boolean(unfinished),
    current,
    text: `第 ${current} / 13 步`,
    stepText: unfinished ? `第 ${current} / 13 步 · 红色预警` : `第 ${current} / 13 步`,
    cells: STEP_COLORS.map((color, index) => {
      const number = index + 1;
      const reached = number <= completed;
      return { n: number, reached, now: number === current, color, fg: reached ? "#ffffff" : color, bg: reached ? color : "transparent" };
    }),
  };
}

function periodHeadline(viewed, accounting, calendar) {
  if (!viewed) return "";
  let suffix = "";
  if (sameMonth(viewed, accounting)) suffix = " · 上月";
  else if (sameMonth(viewed, calendar)) suffix = " · 当月";
  return `账期 ${viewed.year}年${viewed.month}月${suffix}`;
}

function buildContext(snapshot, selected) {
  const calendar = calendarMonth();
  const accounting = snapshot.period;
  const viewed = selected && selected.year ? selected : accounting;
  const months = historyMonths([
    ...(snapshot.journey || []),
    ...(snapshot.sales || []),
    ...(snapshot.bills || []),
    ...(snapshot.reconciliations || []),
    ...(snapshot.payments || []),
  ], accounting, calendar);
  const windowed = historyWindow(months, viewed, 6);
  const chips = [];
  if (windowed.hasPrev) chips.push({ key: "prev", label: "...(前一页)", period: windowed.prevMonth, active: false });
  windowed.visible.forEach((item) => {
    chips.push({
      key: `${item.year}-${item.month}`,
      label: monthChipLabel(item, accounting, calendar),
      period: item,
      active: sameMonth(item, viewed),
    });
  });
  if (windowed.hasNext) chips.push({ key: "next", label: "....(后一页)", period: windowed.nextMonth, active: false });
  return { calendar, accounting, viewed, months, chips, headline: periodHeadline(viewed, accounting, calendar) };
}

function homeModel(data, period, query) {
  const roster = data.stores.filter((store) => operatingIn(store, period));
  const shown = roster.filter((store) => matchesStore(store, query));
  const payable = data.bills.filter((bill) => inMonth(bill, period)).reduce((sum, bill) => sum + Number(bill.payable || 0), 0);
  const reds = data.alerts.filter((alert) => alert.level === "red" && alert.dimension === "泳道" && inMonth(alert, period)).length;
  const diffs = data.reconciliations.filter((row) => row.status === "DIFFERENCE" && inMonth(row, period)).length;
  const ids = new Set(shown.map((store) => store.id));
  const queue = data.alerts
    .filter((alert) => alert.level === "red" && alert.dimension === "泳道" && inMonth(alert, period) && ids.has(alert.store_id))
    .map((alert) => ({
      id: alert.id,
      storeId: alert.store_id,
      name: (data.stores.find((store) => store.id === alert.store_id) || {}).name || alert.store_id,
      message: alert.message,
    }));
  const cards = shown.map((store) => {
    const lane = laneView(laneStep(data, store.id, period), laneUnfinished(data, store.id, period));
    return {
      id: store.id,
      name: store.name,
      region: store.region || "",
      city: store.city || "",
      tag: `${store.region || ""} · ${store.city || ""}`,
      meta: `${store.store_type || "精品店"} · ${store.mall_name || ""} · ${store.keep_decision || "待评估"}`,
      address: store.address || "",
      lane,
    };
  });
  return {
    payableText: money(payable),
    payableLabel: sameMonth(period, data.period) ? "上月系统应付租金" : `${period.month}月系统应付租金`,
    reds,
    diffs,
    registered: data.stores.length,
    countText: `显示 ${shown.length} / ${data.stores.length} 家`,
    queue,
    queueEmpty: queue.length === 0,
    cards,
  };
}

function storesModel(data, period, query, role) {
  const roster = data.stores.filter((store) => operatingIn(store, period));
  const shown = roster.filter((store) => matchesStore(store, query));
  const canDecide = role === "ops" || role === "executive";
  const rows = shown.map((store) => {
    const bill = data.bills.find((item) => item.store_id === store.id && inMonth(item, period));
    const sales = data.sales.find((item) => item.store_id === store.id && inMonth(item, period));
    const step = laneStep(data, store.id, period);
    const lane = laneView(step, laneUnfinished(data, store.id, period));
    const decision = store.keep_decision || "待评估";
    return {
      id: store.id,
      brand: store.brand || "",
      name: store.name,
      typeLine: `${store.store_type || "精品店"} · ${store.listed_from || "样本"} · ${store.hours || ""}`,
      address: store.address || "",
      phone: store.phone || "电话未提供",
      region: store.region || "",
      city: store.city || "",
      landlord: store.landlord || "",
      leaseEnd: store.lease_end || "",
      decision,
      decisionIndex: Math.max(0, DECISIONS.indexOf(decision)),
      salesText: sales ? money(sales.sales) : "—",
      payableText: bill ? money(bill.payable) : "—",
      ratioText: bill && bill.rent_to_sales ? `${(Number(bill.rent_to_sales) * 100).toFixed(1)}%` : "—",
      stepText: step >= 13 ? "已完成13步泳道" : (step ? lane.stepText : "—"),
      stepDone: step >= 13,
      stepAlert: Boolean(lane.alert),
    };
  });
  return {
    rows,
    canDecide,
    countText: `显示 ${shown.length} / ${data.stores.length} 家`,
    salesHead: `${period.month}月销售`,
  };
}

function journeyModel(data, storeId, period, calendar) {
  const store = (data.stores || []).find((item) => item.id === storeId);
  if (!store) return { missing: true };
  const step = laneStep(data, storeId, period);
  const next = step + 1;
  const editable = monthIndex(period) <= monthIndex(calendar);
  const lane = laneView(step, laneUnfinished(data, storeId, period));
  const bill = data.bills.find((item) => item.store_id === storeId && inMonth(item, period));
  const alerts = data.alerts.filter((item) => item.store_id === storeId && inMonth(item, period));
  const recon = data.reconciliations.find((item) => item.store_id === storeId && inMonth(item, period));
  const payment = data.payments.find((item) => item.store_id === storeId && inMonth(item, period));
  const trace = Array.isArray(bill && bill.trace) ? bill.trace : [];
  const lines = Array.isArray(recon && recon.lines) ? recon.lines : [];
  let hint = "还没到这个月。";
  if (step >= 13) hint = `${period.year}年${period.month}月这条泳道已经走完。`;
  else if (editable) hint = `当前是${period.year}年${period.month}月。下一步只能由泳道上的部门提交。`;
  return {
    missing: false,
    storeId: store.id,
    name: store.name,
    mallName: store.mall_name || "",
    meta: [store.store_type, store.province, store.city, store.phone, store.hours].filter(Boolean).join(" · "),
    address: store.address || "",
    note: store.data_note || "",
    photoId: store.photo_id || "",
    hint,
    lane,
    showRail: step < 13,
    steps: (data.steps || []).map((item) => {
      const color = STEP_COLORS[item.step - 1];
      const reached = item.step <= step;
      return {
        step: item.step,
        title: item.title,
        who: `${ACTOR[item.from] || item.from} → ${ACTOR[item.to] || item.to}`,
        state: item.step < next ? "done" : item.step === next ? "now" : "",
        reached,
        color,
        fg: reached ? "#ffffff" : color,
        bg: reached ? color : "transparent",
      };
    }),
    showActivity: editable && next === 5,
    showCalc: editable && (next === 6 || next === 7),
    showTrace: Boolean(bill) && step >= 7,
    payableText: bill ? money(bill.payable) : "",
    ratioText: bill && bill.rent_to_sales ? `${(Number(bill.rent_to_sales) * 100).toFixed(1)}%` : "—",
    trace: trace.map((item, index) => ({ id: `${index}-${item.node}`, node: item.node, decision: item.decision || "", detail: item.detail || "" })),
    billAlerts: alerts.map((alert) => ({ id: alert.id, level: alert.level, message: alert.message })),
    showMallIn: editable && next === 8,
    showReconcile: editable && next >= 9 && next <= 11,
    showRecon: Boolean(recon) && step >= 11,
    systemText: recon ? money(recon.system_total) : "",
    mallText: recon ? money(recon.mall_total) : "",
    diffText: recon ? money(recon.diff_amount) : "",
    lines: lines.map((line) => ({
      name: line.name,
      system: money(line.system),
      mall: money(line.mall),
      diff: money(line.diff),
      hot: Math.abs(Number(line.diff) || 0) >= 0.01,
    })),
    showResolve: editable && next === 12,
    showPay: editable && next === 13,
    showPayment: Boolean(payment) && step >= 13,
    paymentText: payment ? `付款申请 ${money(payment.amount)} 元，状态 ${payment.status}。` : "",
    showEarly: editable && next < 5,
  };
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function rollupDesk(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    if (row.missing) continue;
    const name = row[key] || "未填";
    const current = groups.get(name) || { name, sales: 0, netRent: 0, payable: 0 };
    current.sales += Number(row.sales) || 0;
    current.netRent += Number(row.netRent) || 0;
    current.payable += Number(row.payable) || 0;
    groups.set(name, current);
  }
  return [...groups.values()].map((group) => ({
    name: group.name,
    salesText: money(group.sales),
    payableText: money(group.payable),
    ratio: group.sales > 0 ? group.netRent / group.sales : null,
    ratioText: group.sales > 0 ? percent(group.netRent / group.sales) : "—",
    width: `${Math.min(100, (group.sales > 0 ? group.netRent / group.sales : 0) * 100)}%`,
  }));
}

function summarizeGeo(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (row.missing || row.sales == null) continue;
    const region = row.region || "未填区域";
    const city = row.city || "未填城市";
    const key = `${region} / ${city}`;
    const current = groups.get(key) || { label: key, region, city, stores: 0, sales: 0, profit: 0, weighted: 0 };
    const sales = Number(row.sales) || 0;
    const profit = Number(row.profit) || 0;
    current.stores += 1;
    current.sales += sales;
    current.profit += profit;
    current.weighted += profit * sales;
    groups.set(key, current);
  }
  const geo = [...groups.values()].map((group) => ({
    label: group.label,
    region: group.region,
    city: group.city,
    stores: group.stores,
    salesText: money(group.sales),
    weightedAverageProfit: group.sales > 0 ? round2(group.weighted / group.sales) : null,
    avgText: group.sales > 0 ? money(group.weighted / group.sales) : "—",
    netText: money(group.profit),
  })).sort((left, right) => left.label.localeCompare(right.label, "zh"));
  const sales = [...groups.values()].reduce((sum, group) => sum + group.sales, 0);
  const weighted = [...groups.values()].reduce((sum, group) => sum + group.weighted, 0);
  const profit = [...groups.values()].reduce((sum, group) => sum + group.profit, 0);
  return {
    geo,
    summary: {
      regions: new Set(geo.map((group) => group.region)).size,
      cities: new Set(geo.map((group) => group.city)).size,
      avgText: sales > 0 ? money(weighted / sales) : "—",
      netText: money(profit),
    },
  };
}

function monitorModel(desk, period, query) {
  const shown = (field(desk, "monitor") || []).filter((row) => operatingIn(row, period) && matchesDesk(row, query));
  return {
    countText: `显示 ${shown.length} / ${(field(desk, "monitor") || []).length} 家`,
    rows: shown.map((row) => ({
      storeId: row.storeId,
      name: row.name,
      mall: row.mall || "",
      salesText: row.sales == null ? "—" : money(row.sales),
      payableText: row.payable == null ? "—" : money(row.payable),
      ratioText: percent(row.rentToSales),
      profitText: row.profit == null ? "—" : money(row.profit),
      achievementText: percent(row.achievement),
      alerts: (row.alerts || []).map((alert, index) => ({
        id: `${row.storeId}-${index}`,
        dimension: alert.dimension,
        message: alert.message,
        green: alert.level === "red" || !alert.level,
        level: alert.level === "red" ? "green" : (alert.level || "green"),
      })),
      quiet: !(row.alerts || []).length,
      notes: row.notes || [],
    })),
    marginNote: field(desk, "marginNote") || "",
    brdNote: field(desk, "brdNote") || "",
    historyNote: field(desk, "historyNote") || "",
  };
}

function cockpitModel(desk, period, query) {
  const shown = (field(desk, "monitor") || []).filter((row) => operatingIn(row, period) && matchesDesk(row, query));
  const shownIds = new Set(shown.map((row) => row.storeId));
  const geoView = summarizeGeo(shown);
  const ranking = (field(desk, "ranking") || []).filter((row) => shownIds.has(row.storeId)).map((row) => ({
    storeId: row.storeId,
    board: row.board || "",
    boardClass: row.board === "红榜" ? "red" : row.board === "黑榜" ? "yellow" : "",
    name: row.name,
    score: row.score == null ? "—" : row.score,
    salesText: money(row.sales),
    profitText: money(row.profit),
    areaText: row.productivity == null ? "—" : money(row.productivity),
  }));
  const pl = shown.filter((row) => !row.missing).map((row) => ({
    storeId: row.storeId,
    name: row.name,
    salesText: money(row.sales),
    grossText: money(row.gross),
    rentText: money(row.payable),
    profitText: money(row.profit),
    marginText: percent(row.margin),
  }));
  const lease = (field(desk, "lease") || []).filter((row) => shownIds.has(row.storeId)).map((row) => ({
    storeId: row.storeId,
    name: row.name,
    leaseEnd: row.leaseEnd || "—",
    monthsLeft: row.monthsLeft == null ? "—" : row.monthsLeft,
    penaltyText: money(row.penalty),
    profitText: row.monthlyProfit == null ? "—" : money(row.monthlyProfit),
    advice: row.advice || "",
  }));
  return {
    countText: `显示 ${shown.length} / ${(field(desk, "monitor") || []).length} 家`,
    regions: geoView.summary.regions,
    cities: geoView.summary.cities,
    avgText: geoView.geo.length ? geoView.summary.avgText : "—",
    netText: geoView.geo.length ? geoView.summary.netText : "—",
    geoEmpty: geoView.geo.length === 0,
    geo: geoView.geo,
    pl,
    ranking,
    mallBars: rollupDesk(shown, "mall"),
    regionBars: rollupDesk(shown, "region"),
    lease,
    marginNote: field(desk, "marginNote") || "",
    historyNote: field(desk, "historyNote") || "",
  };
}

function roleOf(id) {
  return ROLES.find((item) => item.id === id) || ROLES[0];
}

module.exports = {
  ROLES,
  PAGES,
  DECISIONS,
  RENT_MODELS,
  RENT_MATRIX,
  ALERT_MATRIX,
  MALL_FIELDS,
  calendarMonth,
  monthIndex,
  sameMonth,
  operatingIn,
  historyMonths,
  historyWindow,
  monthChipLabel,
  money,
  percent,
  laneView,
  laneStep,
  laneUnfinished,
  buildContext,
  homeModel,
  storesModel,
  journeyModel,
  monitorModel,
  cockpitModel,
  periodHeadline,
  roleOf,
};
