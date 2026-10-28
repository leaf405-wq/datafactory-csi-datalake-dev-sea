import { insert } from "./access.js";
import { calculateRent, receiveMallBill, reconcile, saveActivity } from "./workflow.js";

const NOW = "2026-03-01 08:00:00";

export async function seedIfEmpty() {
  await store({
    id: "st-taikoo",
    brand: "主品牌",
    code: "SH-IXT-001",
    name: "上海兴业太古汇店",
    region: "华东",
    city: "上海",
    mall_name: "兴业太古汇",
    grade: "A",
    area_sqm: 126,
    selling_area: 108,
    gfa: 140,
    gla: 126,
    landlord: "太古地产",
    lease_end: "2028-04-30",
    lifecycle_start: "2023-05-01",
    keep_decision: "待评估",
    rank: "LFL",
  });
  await contract("st-taikoo", {
    contract_no: "SH-IXT-2023-006",
    model: "HIGHER_OF_TWO",
    fixed_rent: 120000,
    rate: 0.12,
    min_sales: 2000000,
    property_fee: 20000,
    promo_fee: 8000,
    utility_fee: 5000,
    start_date: "2023-05-01",
    end_date: "2028-04-30",
  });
  await sales("st-taikoo", 1500000);
  await atStep("st-taikoo", 4);
  await saveActivity({
    role: "admin",
    actor: "营运经理",
    storeId: "st-taikoo",
    activityNote: "三月会员周，不调整扣点",
    tempRate: null,
    subsidy: 0,
  });
  await calculateRent({ role: "admin", actor: "系统", storeId: "st-taikoo" });

  await store({
    id: "st-chengdu",
    brand: "主品牌",
    code: "CD-TKL-014",
    name: "成都远洋太古里店",
    region: "西南",
    city: "成都",
    mall_name: "远洋太古里",
    grade: "A",
    area_sqm: 88,
    selling_area: 76,
    gfa: 96,
    gla: 88,
    landlord: "远洋太古",
    lease_end: "2029-02-28",
    lifecycle_start: "2026-03-01",
    keep_decision: "Keep",
    rank: "New",
  });
  await contract("st-chengdu", {
    contract_no: "CD-TKL-2026-014",
    model: "HIGHER_OF_TWO",
    fixed_rent: 90000,
    rate: 0.1,
    min_sales: 1000000,
    property_fee: 9000,
    promo_fee: 3000,
    utility_fee: 1800,
    rent_free_start: "2026-03-01",
    rent_free_end: "2026-03-31",
    waive_property: 0,
    start_date: "2026-03-01",
    end_date: "2029-02-28",
  });
  await sales("st-chengdu", 620000);
  await atStep("st-chengdu", 4);

  await store({
    id: "st-mixc",
    brand: "主品牌",
    code: "SZ-MIXC-008",
    name: "深圳湾万象城店",
    region: "华南",
    city: "深圳",
    mall_name: "深圳湾万象城",
    grade: "A",
    area_sqm: 110,
    selling_area: 96,
    gfa: 120,
    gla: 110,
    landlord: "华润万象",
    lease_end: "2027-12-31",
    lifecycle_start: "2022-01-01",
    keep_decision: "Keep & Renovate",
    rank: "LFL",
    action_plan: "2026-09 局部翻新",
  });
  await contract("st-mixc", {
    contract_no: "SZ-MIXC-2022-008",
    model: "HIGHER_OF_TWO",
    fixed_rent: 100000,
    rate: 0.08,
    min_sales: 900000,
    property_fee: 15000,
    promo_fee: 3000,
    utility_fee: 2000,
    start_date: "2022-01-01",
    end_date: "2027-12-31",
  });
  await sales("st-mixc", 900000);
  await atStep("st-mixc", 4);
  await saveActivity({
    role: "admin",
    actor: "营运经理",
    storeId: "st-mixc",
    activityNote: "无特殊活动",
    subsidy: 0,
  });
  await calculateRent({ role: "admin", actor: "系统", storeId: "st-mixc" });
  await receiveMallBill({ role: "admin", actor: "财务专员", storeId: "st-mixc" });
  await reconcile({
    role: "admin",
    actor: "财务专员",
    storeId: "st-mixc",
    mall: {
      base_rent: 108000,
      commission_rent: 0,
      property_fee: 18000,
      promo_fee: 3000,
      utility_fee: 2000,
      card_fee: 600,
      advance_fee: 0,
      total: 131600,
      note: "商场三月结算单",
    },
  });
}

async function store(row) {
  await insert("stores", {
    floor: "1F",
    status: "NORMAL_OPERATION",
    action_plan: "",
    ...row,
  });
}

async function contract(storeId, row) {
  await insert("contracts", {
    id: `ct-${storeId}`,
    store_id: storeId,
    status: "EFFECTIVE",
    raw_text: "",
    min_rent: 0,
    overage_rate: row.rate,
    cap_amount: 0,
    tiers_json: "[]",
    rent_free_start: "",
    rent_free_end: "",
    waive_property: 0,
    vat_rate: 0.09,
    version: 1,
    confidence: 1,
    confirmed_by: "拓展专员",
    created_at: NOW,
    ...row,
  });
}

async function sales(storeId, amount) {
  await insert("sales_monthly", {
    id: `sa-${storeId}`,
    store_id: storeId,
    year: 2026,
    month: 3,
    sales: amount,
    source: "DW",
  });
}

async function atStep(storeId, step) {
  await insert("journey", {
    id: `${storeId}-2026-3`,
    store_id: storeId,
    year: 2026,
    month: 3,
    step,
    updated_at: NOW,
  });
}
