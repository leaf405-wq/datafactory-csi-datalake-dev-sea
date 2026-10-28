import crypto from "node:crypto";
import { all, find, insert, remove, update } from "./access.js";
import { parseContract } from "./parser.js";
import {
  buildLetter,
  calculateMonthlyRent,
  diagnoseHealth,
  inRentFreePeriod,
} from "./rentEngine.js";

export const PERIOD = { year: 2026, month: 3 };
export const ROLE_LABEL = {
  expansion: "拓展部",
  ops: "营运部",
  finance: "财务部",
  executive: "高管",
  admin: "系统管理员",
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const STEPS = [
  { step: 1, from: "expansion", to: "system", title: "上传商场租赁合同扫描件" },
  { step: 2, from: "system", to: "system", title: "AI-OCR识别并结构化提取条款" },
  { step: 3, from: "expansion", to: "system", title: "人工复核并确认合同信息" },
  { step: 4, from: "system", to: "system", title: "生成店铺档案, 初始化租金规则" },
  { step: 5, from: "ops", to: "system", title: "录入当月特殊活动及临时提点" },
  { step: 6, from: "system", to: "system", title: "接收DW销售数据, 计算预估租金" },
  { step: 7, from: "system", to: "ops", title: "触发预警(如距保底差额过大)" },
  { step: 8, from: "mall", to: "finance", title: "月底发送商场对账单" },
  { step: 9, from: "finance", to: "system", title: "上传对账单文件" },
  { step: 10, from: "system", to: "system", title: "自动比对系统计算与对账单金额" },
  { step: 11, from: "system", to: "finance", title: "输出差异明细报告" },
  { step: 12, from: "finance", to: "mall", title: "确认无误或发起差异申诉" },
  { step: 13, from: "finance", to: "system", title: "确认账单并生成付款申请" },
];

function assertRole(role, allowed) {
  if (role === "admin") return;
  if (!allowed.includes(role)) {
    throw new ApiError(403, `这一步由${allowed.map((item) => ROLE_LABEL[item]).join("、")}操作`);
  }
}

function now() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function id() {
  return crypto.randomUUID();
}

async function audit(actor, role, action, detail) {
  await insert("audit_log", {
    id: id(),
    actor: actor || ROLE_LABEL[role] || role,
    role: role || "",
    action,
    detail: typeof detail === "string" ? detail : JSON.stringify(detail),
    created_at: now(),
  });
}

function journeyId(storeId) {
  return `${storeId}-${PERIOD.year}-${PERIOD.month}`;
}

async function getJourney(storeId) {
  const rows = await find("journey", { id: journeyId(storeId) });
  return rows[0] || null;
}

async function setStep(storeId, step) {
  const current = await getJourney(storeId);
  if (!current) {
    await insert("journey", {
      id: journeyId(storeId),
      store_id: storeId,
      year: PERIOD.year,
      month: PERIOD.month,
      step,
      updated_at: now(),
    });
    return;
  }
  await update("journey", current.id, { step, updated_at: now() });
}

function requireStep(journey, atLeast, hint) {
  const step = journey?.step || 0;
  if (step < atLeast) throw new ApiError(409, hint);
}

export async function snapshot() {
  const [stores, contracts, fields, inputs, sales, bills, alerts, mallBills, reconciliations, payments, journey, auditLog] = await Promise.all([
    all("stores"),
    all("contracts"),
    all("contract_fields"),
    all("monthly_inputs"),
    all("sales_monthly"),
    all("rent_bills"),
    all("alerts"),
    all("mall_bills"),
    all("reconciliations"),
    all("payment_requests"),
    all("journey"),
    all("audit_log"),
  ]);
  const revive = (bill) => ({
    ...bill,
    trace: safeJson(bill.trace_json, []),
  });
  return {
    period: PERIOD,
    steps: STEPS,
    stores,
    contracts,
    fields,
    inputs,
    sales,
    bills: bills.map(revive),
    alerts,
    mallBills,
    reconciliations: reconciliations.map((row) => ({ ...row, lines: safeJson(row.lines_json, []) })),
    payments,
    journey,
    audit: auditLog.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 40),
  };
}

export async function uploadContract({ role, actor, text }) {
  assertRole(role, ["expansion"]);
  if (!String(text || "").trim()) throw new ApiError(400, "请粘贴合同文本或扫描件识别结果");
  const parsed = parseContract(text);
  const contractId = id();
  await insert("contracts", {
    id: contractId,
    store_id: "",
    contract_no: parsed.values.contract_no,
    status: "EXTRACTED",
    raw_text: text,
    model: parsed.model,
    fixed_rent: parsed.values.fixed_rent,
    rate: parsed.values.rate,
    min_sales: parsed.values.min_sales,
    min_rent: 0,
    overage_rate: parsed.values.rate,
    cap_amount: 0,
    tiers_json: "[]",
    rent_free_start: parsed.values.rent_free_start,
    rent_free_end: parsed.values.rent_free_end,
    waive_property: parsed.values.waive_property,
    property_fee: parsed.values.property_fee,
    promo_fee: parsed.values.promo_fee,
    utility_fee: parsed.values.utility_fee,
    vat_rate: parsed.values.vat_rate,
    start_date: parsed.values.start_date,
    end_date: parsed.values.end_date,
    version: 1,
    confidence: parsed.confidence,
    confirmed_by: "",
    created_at: now(),
  });
  for (const field of parsed.fields) {
    await insert("contract_fields", {
      id: id(),
      contract_id: contractId,
      field_name: field.field_name,
      field_value: field.field_value,
      confidence: field.confidence,
      needs_review: field.needs_review,
    });
  }
  await audit(actor, role, "上传合同并完成条款抽取", contractId);
  return { contractId, ...parsed, step: 2 };
}

export async function confirmContract({ role, actor, contractId, edits = {} }) {
  assertRole(role, ["expansion"]);
  const contracts = await find("contracts", { id: contractId });
  const contract = contracts[0];
  if (!contract) throw new ApiError(404, "找不到这份合同");
  if (contract.status === "EFFECTIVE") throw new ApiError(409, "合同已经确认");

  const fields = await find("contract_fields", { contract_id: contractId });
  const valueOf = (name, fallback = "") => {
    if (edits[name] != null && edits[name] !== "") return edits[name];
    const field = fields.find((item) => item.field_name === name);
    return field?.field_value ?? fallback;
  };
  const model = MODEL_FROM_EDIT(valueOf("model", contract.model));
  if (!model) throw new ApiError(400, "租金模式无法识别，请改成两者取高、两者取低、纯固定、纯扣点、保底+超额、阶梯扣点或封顶扣点");

  const storeId = id();
  const storeName = String(valueOf("store_name", "未命名店铺"));
  await insert("stores", {
    id: storeId,
    brand: String(valueOf("brand", "主品牌")),
    code: String(valueOf("contract_no", storeId.slice(0, 8))),
    name: storeName,
    region: String(valueOf("region", "")),
    city: String(valueOf("city", "")),
    mall_name: String(valueOf("mall_name", "")),
    grade: "B",
    area_sqm: Number(valueOf("area_sqm", 0)) || 0,
    selling_area: Number(valueOf("selling_area", 0)) || 0,
    gfa: Number(valueOf("area_sqm", 0)) || 0,
    gla: Number(valueOf("selling_area", 0)) || 0,
    floor: "1F",
    status: "NORMAL_OPERATION",
    keep_decision: "待评估",
    lease_end: String(valueOf("end_date", "")),
    lifecycle_start: String(valueOf("start_date", "")),
    landlord: String(valueOf("landlord", "")),
    rank: "",
    action_plan: "",
  });
  await update("contracts", contractId, {
    store_id: storeId,
    status: "EFFECTIVE",
    model,
    contract_no: String(valueOf("contract_no", "")),
    fixed_rent: Number(valueOf("fixed_rent", 0)) || 0,
    rate: Number(valueOf("rate", 0)) || 0,
    min_sales: Number(valueOf("min_sales", 0)) || 0,
    property_fee: Number(valueOf("property_fee", 0)) || 0,
    promo_fee: Number(valueOf("promo_fee", 0)) || 0,
    utility_fee: Number(valueOf("utility_fee", 0)) || 0,
    vat_rate: Number(valueOf("vat_rate", 0.09)) || 0.09,
    rent_free_start: String(valueOf("rent_free_start", "")),
    rent_free_end: String(valueOf("rent_free_end", "")),
    waive_property: valueOf("waive_property") === "是" || Number(valueOf("waive_property")) === 1 ? 1 : 0,
    start_date: String(valueOf("start_date", "")),
    end_date: String(valueOf("end_date", "")),
    confirmed_by: actor || ROLE_LABEL[role],
  });
  for (const field of fields) {
    if (edits[field.field_name] == null) continue;
    await update("contract_fields", field.id, {
      field_value: String(edits[field.field_name]),
      needs_review: 0,
      confidence: 1,
    });
  }
  const sales = Number(valueOf("reference_sales", 0)) || 0;
  if (sales > 0) {
    await insert("sales_monthly", {
      id: id(),
      store_id: storeId,
      year: PERIOD.year,
      month: PERIOD.month,
      sales,
      source: "DW",
    });
  }
  await setStep(storeId, 4);
  await audit(actor, role, "复核合同并生成店铺档案", storeName);
  return { storeId, step: 4 };
}

export async function saveActivity({ role, actor, storeId, activityNote, tempRate, subsidy }) {
  assertRole(role, ["ops"]);
  const journey = await getJourney(storeId);
  requireStep(journey, 4, "请先完成合同复核，生成店铺档案");
  const existing = (await find("monthly_inputs", { store_id: storeId, year: PERIOD.year, month: PERIOD.month }))[0];
  const row = {
    activity_note: activityNote || "本月无特殊活动",
    temp_rate: tempRate === "" || tempRate == null ? null : Number(tempRate),
    subsidy: Number(subsidy || 0),
    created_by: actor || ROLE_LABEL[role],
    created_at: now(),
  };
  if (existing) await update("monthly_inputs", existing.id, row);
  else {
    await insert("monthly_inputs", {
      id: id(),
      store_id: storeId,
      year: PERIOD.year,
      month: PERIOD.month,
      ...row,
    });
  }
  await setStep(storeId, Math.max(journey.step || 0, 5));
  await audit(actor, role, "录入当月活动与临时提点", storeId);
  return { step: 5 };
}

export async function calculateRent({ role, actor, storeId }) {
  assertRole(role, ["ops", "finance"]);
  const journey = await getJourney(storeId);
  requireStep(journey, 5, "请营运先录入当月活动；如果没有活动，也要提交“无特殊活动”");
  const contract = (await find("contracts", { store_id: storeId, status: "EFFECTIVE" }))[0];
  if (!contract) throw new ApiError(409, "这家店还没有生效合同");
  const salesRow = (await find("sales_monthly", { store_id: storeId, year: PERIOD.year, month: PERIOD.month }))[0];
  const activity = (await find("monthly_inputs", { store_id: storeId, year: PERIOD.year, month: PERIOD.month }))[0];
  const rate = activity?.temp_rate ? Number(activity.temp_rate) : Number(contract.rate);
  const bill = calculateMonthlyRent({
    inRentFreePeriod: inRentFreePeriod(contract, PERIOD.year, PERIOD.month),
    waivePropertyInRentFree: Number(contract.waive_property) === 1,
    model: contract.model,
    sales: salesRow ? Number(salesRow.sales) : 0,
    rate,
    rateSource: activity?.temp_rate ? "营运临时提点" : "合同扣点",
    fixedRent: Number(contract.fixed_rent),
    minSales: Number(contract.min_sales),
    overageRate: Number(contract.overage_rate || contract.rate),
    capAmount: Number(contract.cap_amount),
    tiers: safeJson(contract.tiers_json, []),
    propertyFee: Number(contract.property_fee),
    promoFee: Number(contract.promo_fee),
    utilityFee: Number(contract.utility_fee),
    subsidy: Number(activity?.subsidy || 0),
    vatRate: Number(contract.vat_rate || 0.09),
  });
  const alerts = diagnoseHealth({
    sales: bill.sales,
    minSales: Number(contract.min_sales),
    rentToSales: bill.rentToSales,
    salesMissing: !salesRow,
  });
  await replaceMonth("rent_bills", storeId);
  await replaceMonth("alerts", storeId);
  await insert("rent_bills", {
    id: id(),
    store_id: storeId,
    year: PERIOD.year,
    month: PERIOD.month,
    model: contract.model,
    in_rent_free: bill.inRentFree ? 1 : 0,
    sales: bill.sales,
    rate: bill.rate,
    fixed_rent: bill.fixedRent,
    commission_rent: bill.commissionRent,
    base_rent: bill.baseRent,
    surcharge: bill.surcharge,
    property_fee: bill.property,
    promo_fee: bill.promoFee,
    utility_fee: bill.utilityFee,
    subsidy: bill.subsidy,
    net_before_vat: bill.netBeforeVat,
    vat: bill.vat,
    payable: bill.payable,
    rent_to_sales: bill.rentToSales ?? 0,
    trace_json: JSON.stringify(bill.trace),
    created_at: now(),
  });
  for (const alert of alerts) {
    await insert("alerts", {
      id: id(),
      store_id: storeId,
      year: PERIOD.year,
      month: PERIOD.month,
      level: alert.level,
      dimension: alert.dimension,
      message: alert.message,
      status: "OPEN",
    });
  }
  await setStep(storeId, 7);
  await audit(actor, role, "接收DW销售并计算租金", `${storeId} 应付 ${bill.payable}`);
  return { bill: { ...bill, trace: bill.trace }, alerts, step: 7 };
}

export async function receiveMallBill({ role, actor, storeId }) {
  assertRole(role, ["finance"]);
  const journey = await getJourney(storeId);
  requireStep(journey, 7, "请先完成当月租金计算和预警");
  await setStep(storeId, Math.max(journey.step, 8));
  await audit(actor, role, "登记已收到商场对账单", storeId);
  return { step: 8 };
}

export async function reconcile({ role, actor, storeId, mall }) {
  assertRole(role, ["finance"]);
  const journey = await getJourney(storeId);
  requireStep(journey, 8, "请先登记商场对账单已收到");
  const bill = (await find("rent_bills", { store_id: storeId, year: PERIOD.year, month: PERIOD.month }))[0];
  if (!bill) throw new ApiError(409, "系统里还没有这月的租金账单");
  const store = (await find("stores", { id: storeId }))[0];
  const lines = comparisonLines(bill, mall);
  const mallTotal = Number(mall.total ?? lines.reduce((sum, line) => sum + line.mall, 0));
  const systemTotal = Number(bill.payable);
  const diff = round2(mallTotal - systemTotal);
  await replaceMonth("mall_bills", storeId);
  await replaceMonth("reconciliations", storeId);
  await insert("mall_bills", {
    id: id(),
    store_id: storeId,
    year: PERIOD.year,
    month: PERIOD.month,
    base_rent: Number(mall.base_rent || 0),
    commission_rent: Number(mall.commission_rent || 0),
    property_fee: Number(mall.property_fee || 0),
    promo_fee: Number(mall.promo_fee || 0),
    utility_fee: Number(mall.utility_fee || 0),
    card_fee: Number(mall.card_fee || 0),
    advance_fee: Number(mall.advance_fee || 0),
    total: mallTotal,
    note: mall.note || "",
  });
  const letter = buildLetter({
    store,
    period: `${PERIOD.year}年${PERIOD.month}月`,
    lines,
    diff,
  });
  await insert("reconciliations", {
    id: id(),
    store_id: storeId,
    year: PERIOD.year,
    month: PERIOD.month,
    system_total: systemTotal,
    mall_total: mallTotal,
    diff_amount: diff,
    status: Math.abs(diff) < 0.01 ? "MATCHED" : "DIFFERENCE",
    reason: "",
    letter,
    resolution: "",
    lines_json: JSON.stringify(lines),
  });
  await setStep(storeId, 11);
  await audit(actor, role, "上传对账单并完成自动比对", `${storeId} 差额 ${diff}`);
  return { lines, systemTotal, mallTotal, diff, letter, step: 11 };
}

export async function resolveRecon({ role, actor, storeId, resolution, reason }) {
  assertRole(role, ["finance"]);
  const journey = await getJourney(storeId);
  requireStep(journey, 11, "请先上传对账单，生成差异报告");
  const recon = (await find("reconciliations", { store_id: storeId, year: PERIOD.year, month: PERIOD.month }))[0];
  if (!recon) throw new ApiError(404, "没有对账记录");
  if (!["accept", "dispute"].includes(resolution)) throw new ApiError(400, "请选择确认无误或发起申诉");
  await update("reconciliations", recon.id, {
    resolution,
    reason: reason || (resolution === "accept" ? "金额一致或差异可接受" : "商场口径与合同不符"),
    status: resolution === "accept" ? "ACCEPTED" : "DISPUTED",
  });
  await setStep(storeId, 12);
  await audit(actor, role, resolution === "accept" ? "确认账单无误" : "发起差异申诉", storeId);
  return { step: 12 };
}

export async function createPayment({ role, actor, storeId }) {
  assertRole(role, ["finance"]);
  const journey = await getJourney(storeId);
  requireStep(journey, 12, "请先确认账单或发起申诉");
  const bill = (await find("rent_bills", { store_id: storeId, year: PERIOD.year, month: PERIOD.month }))[0];
  const existing = (await find("payment_requests", { store_id: storeId, year: PERIOD.year, month: PERIOD.month }))[0];
  if (!existing) {
    await insert("payment_requests", {
      id: id(),
      store_id: storeId,
      year: PERIOD.year,
      month: PERIOD.month,
      amount: Number(bill?.payable || 0),
      status: "PENDING_APPROVAL",
      created_at: now(),
    });
  }
  await setStep(storeId, 13);
  await audit(actor, role, "生成付款申请", storeId);
  return { step: 13, amount: Number(bill?.payable || 0) };
}

export async function setDecision({ role, actor, storeId, keepDecision, actionPlan }) {
  assertRole(role, ["executive", "ops"]);
  const allowed = ["Keep", "Keep & Renovate", "Keep & Relocate", "Close", "待评估"];
  if (!allowed.includes(keepDecision)) throw new ApiError(400, "动作必须是 Keep、Keep & Renovate、Keep & Relocate 或 Close");
  await update("stores", storeId, { keep_decision: keepDecision, action_plan: actionPlan || "" });
  await audit(actor, role, "更新续租或关店动作", `${storeId} ${keepDecision}`);
  return { keepDecision };
}

function comparisonLines(bill, mall) {
  const pairs = [
    ["租金", Number(bill.base_rent), Number(mall.base_rent || 0) + Number(mall.commission_rent || 0)],
    ["物业费", Number(bill.property_fee || 0), Number(mall.property_fee || 0)],
    ["推广费", Number(bill.promo_fee || 0), Number(mall.promo_fee || 0)],
    ["水电费", Number(bill.utility_fee || 0), Number(mall.utility_fee || 0)],
    ["刷卡手续费", 0, Number(mall.card_fee || 0)],
    ["商场代垫", 0, Number(mall.advance_fee || 0)],
  ];
  return pairs.map(([name, system, mallAmount]) => ({
    name,
    system: round2(system),
    mall: round2(mallAmount),
    diff: round2(mallAmount - system),
  }));
}

async function replaceMonth(table, storeId) {
  const rows = await find(table, { store_id: storeId, year: PERIOD.year, month: PERIOD.month });
  for (const row of rows) await remove(table, row.id);
}

function MODEL_FROM_EDIT(value) {
  const text = String(value || "");
  const known = {
    HIGHER_OF_TWO: "HIGHER_OF_TWO",
    LOWER_OF_TWO: "LOWER_OF_TWO",
    FIXED_ONLY: "FIXED_ONLY",
    COMMISSION_ONLY: "COMMISSION_ONLY",
    BASE_PLUS_OVERAGE: "BASE_PLUS_OVERAGE",
    TIERED: "TIERED",
    CAPPED: "CAPPED",
    两者取高: "HIGHER_OF_TWO",
    两者取低: "LOWER_OF_TWO",
    纯固定: "FIXED_ONLY",
    纯扣点: "COMMISSION_ONLY",
    "保底+超额": "BASE_PLUS_OVERAGE",
    阶梯扣点: "TIERED",
    封顶扣点: "CAPPED",
  };
  return known[text] || known[text.trim()] || "";
}

function safeJson(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
