import { all, insert, remove, update } from "./access.js";
import { accountingPeriod, calendarMonth, monthIndex } from "../client/src/period.js";
import { calculateMonthlyRent, inRentFreePeriod } from "./rentEngine.js";

const FROM = { year: 2026, month: 4 };
const NOW = "2026-11-01 09:00:00";

/** April through the close month. The calendar month itself is not opened. */
export function monthsToFill(accounting, from = FROM) {
  if (!accounting || monthIndex(accounting) < monthIndex(from)) return [];
  const months = [];
  let year = from.year;
  let month = from.month;
  while (monthIndex({ year, month }) <= monthIndex(accounting)) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

function hashText(value) {
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** Stable pick, so the same three stores stay unfinished after a restart. */
export function incompleteStoreIds(storeIds) {
  return [...storeIds].sort((left, right) => hashText(left) - hashText(right) || left.localeCompare(right)).slice(0, 3);
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function round100(value) {
  return Math.max(100, Math.round(value / 100) * 100);
}

function tiersOf(contract) {
  try {
    const parsed = JSON.parse(contract?.tiers_json || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function contractOf(contracts, storeId) {
  const rows = (contracts || []).filter((item) => item.store_id === storeId);
  return rows.find((item) => item.status === "EFFECTIVE") || rows[0] || null;
}

function quoteBill(contract, year, month, sales) {
  return calculateMonthlyRent({
    inRentFreePeriod: inRentFreePeriod(contract, year, month),
    waivePropertyInRentFree: Number(contract.waive_property) === 1,
    model: contract.model || "HIGHER_OF_TWO",
    sales,
    rate: Number(contract.rate),
    fixedRent: Number(contract.fixed_rent),
    minSales: Number(contract.min_sales),
    overageRate: Number(contract.overage_rate || contract.rate),
    capAmount: Number(contract.cap_amount),
    tiers: tiersOf(contract),
    propertyFee: Number(contract.property_fee),
    promoFee: Number(contract.promo_fee),
    utilityFee: Number(contract.utility_fee),
    subsidy: 0,
    vatRate: contract.vat_rate == null || contract.vat_rate === "" ? 0.09 : Number(contract.vat_rate),
  });
}

function healthy(contract, bill) {
  const minSales = Number(contract.min_sales) || 0;
  const achievement = minSales > 0 ? bill.sales / minSales : 1;
  const ratio = bill.rentToSales == null ? 0 : bill.rentToSales;
  return achievement >= 0.95 && ratio <= 0.145;
}

/** Scatter around a normal month. A weak March is not copied forward. */
function normalBill(contract, year, month, marchSales, rng) {
  const minSales = Number(contract.min_sales) || 0;
  const observed = Number(marchSales) || 0;
  const center = minSales > 0 && observed < minSales * 0.9 ? minSales : (observed || minSales || 800000);
  const spread = 0.96 + ((month % 5) * 0.02) + rng() * 0.1;
  let sales = round100(center * spread);
  if (minSales > 0 && sales < minSales * 0.98) sales = round100(minSales * (1.02 + rng() * 0.08));
  let bill = quoteBill(contract, year, month, sales);
  for (let attempt = 0; attempt < 8 && !healthy(contract, bill); attempt += 1) {
    sales = round100(sales * 1.08);
    bill = quoteBill(contract, year, month, sales);
  }
  return bill;
}

export function planCloseMonths({ storeIds, contracts, marchSales, accounting }) {
  const months = monthsToFill(accounting);
  const march = new Map((marchSales || []).map((row) => [row.store_id, Number(row.sales) || 0]));
  const rows = [];
  for (const storeId of storeIds) {
    const contract = contractOf(contracts, storeId);
    if (!contract) continue;
    for (const period of months) {
      const rng = mulberry32(hashText(`${storeId}-${period.year}-${period.month}`));
      const bill = normalBill(contract, period.year, period.month, march.get(storeId), rng);
      rows.push({
        storeId,
        year: period.year,
        month: period.month,
        step: 4,
        sales: bill.sales,
        payable: bill.payable,
        rentToSales: bill.rentToSales,
        bill,
        incomplete: false,
        alert: null,
      });
    }
  }
  return { months, incomplete: [], rows };
}

export async function ensureCloseMonths(accounting = accountingPeriod()) {
  const [stores, contracts, sales, journeys] = await Promise.all([
    all("stores"),
    all("contracts"),
    all("sales_monthly"),
    all("journey"),
  ]);
  const plan = planCloseMonths({
    storeIds: stores.map((store) => store.id),
    contracts,
    marchSales: sales.filter((row) => Number(row.year) === 2026 && Number(row.month) === 3),
    accounting,
  });
  const seen = new Set(journeys.map((row) => row.id));
  let added = 0;
  for (const row of plan.rows) {
    const journeyId = `${row.storeId}-${row.year}-${row.month}`;
    if (seen.has(journeyId)) continue;
    const key = `${row.storeId}-${row.year}-${row.month}`;
    await insert("monthly_inputs", {
      id: `in-${key}`,
      store_id: row.storeId,
      year: row.year,
      month: row.month,
      activity_note: "样本月，无特殊活动",
      temp_rate: 0,
      subsidy: 0,
      created_by: "系统",
      created_at: NOW,
    });
    await insert("sales_monthly", {
      id: `sa-${key}`,
      store_id: row.storeId,
      year: row.year,
      month: row.month,
      sales: row.sales,
      source: "按3月正常水平估算",
    });
    await insert("rent_bills", {
      id: `rb-${key}`,
      store_id: row.storeId,
      year: row.year,
      month: row.month,
      model: row.bill.model || "HIGHER_OF_TWO",
      in_rent_free: row.bill.inRentFree ? 1 : 0,
      sales: row.bill.sales,
      rate: row.bill.rate,
      fixed_rent: row.bill.fixedRent,
      commission_rent: row.bill.commissionRent,
      base_rent: row.bill.baseRent,
      surcharge: row.bill.surcharge,
      property_fee: row.bill.property,
      promo_fee: row.bill.promoFee,
      utility_fee: row.bill.utilityFee,
      subsidy: row.bill.subsidy,
      net_before_vat: row.bill.netBeforeVat,
      vat: row.bill.vat,
      payable: row.bill.payable,
      rent_to_sales: row.bill.rentToSales ?? 0,
      trace_json: JSON.stringify(row.bill.trace || []),
      created_at: NOW,
    });
    if (!row.incomplete) {
      await insert("mall_bills", {
        id: `mb-${key}`,
        store_id: row.storeId,
        year: row.year,
        month: row.month,
        base_rent: row.bill.baseRent,
        commission_rent: 0,
        property_fee: row.bill.property,
        promo_fee: row.bill.promoFee,
        utility_fee: row.bill.utilityFee,
        card_fee: 0,
        advance_fee: 0,
        total: row.payable,
        note: "样本月，与系统金额一致",
      });
      await insert("reconciliations", {
        id: `rc-${key}`,
        store_id: row.storeId,
        year: row.year,
        month: row.month,
        system_total: row.payable,
        mall_total: row.payable,
        diff_amount: 0,
        status: "MATCHED",
        reason: "样本月，金额一致",
        letter: "",
        resolution: "accept",
        lines_json: "[]",
      });
      await insert("payment_requests", {
        id: `pay-${key}`,
        store_id: row.storeId,
        year: row.year,
        month: row.month,
        amount: row.payable,
        status: "PENDING_APPROVAL",
        created_at: NOW,
      });
    }
    if (row.alert) {
      await insert("alerts", {
        id: `al-${key}`,
        store_id: row.storeId,
        year: row.year,
        month: row.month,
        level: row.alert.level,
        dimension: row.alert.dimension,
        message: row.alert.message,
        status: row.alert.status,
      });
    }
    await insert("journey", {
      id: journeyId,
      store_id: row.storeId,
      year: row.year,
      month: row.month,
      step: row.step,
      updated_at: NOW,
    });
    seen.add(journeyId);
    added += 1;
  }
  return { months: plan.months, added, incomplete: plan.incomplete };
}

/** Existing stores already have an archive, so the open month waits on step 5. */
export function openingLanePlan(storeIds, calendar) {
  return storeIds.map((storeId) => ({
    id: `${storeId}-${calendar.year}-${calendar.month}`,
    storeId,
    year: calendar.year,
    month: calendar.month,
    step: 4,
  }));
}

export function monthsThrough(calendar, from = { year: 2026, month: 3 }) {
  if (!calendar || monthIndex(calendar) < monthIndex(from)) return [];
  const months = [];
  let year = from.year;
  let month = from.month;
  while (monthIndex({ year, month }) <= monthIndex(calendar)) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

const READY_MIGRATION = "老店泳道停在第5步";

/** Old stores sit on step 5 for every month through the calendar month. */
export async function ensureReadyLanes(calendar = calendarMonth()) {
  const [stores, contracts, journeys, alerts, audits] = await Promise.all([
    all("stores"),
    all("contracts"),
    all("journey"),
    all("alerts"),
    all("audit_log"),
  ]);
  const migrated = audits.some((row) => row.action === READY_MIGRATION);
  const contracted = new Set(
    contracts.filter((row) => row.status === "EFFECTIVE" && row.store_id).map((row) => row.store_id),
  );
  const byId = new Map(journeys.map((row) => [row.id, row]));
  let parked = 0;
  for (const storeId of stores.map((store) => store.id)) {
    if (!contracted.has(storeId)) continue;
    for (const period of monthsThrough(calendar)) {
      const id = `${storeId}-${period.year}-${period.month}`;
      const existing = byId.get(id);
      const step = Number(existing?.step) || 0;
      const next = migrated ? Math.max(step, 4) : 4;
      if (!existing) {
        await insert("journey", {
          id,
          store_id: storeId,
          year: period.year,
          month: period.month,
          step: 4,
          updated_at: NOW,
        });
        parked += 1;
        continue;
      }
      if (next !== step) {
        await update("journey", id, { step: next, updated_at: NOW });
        parked += 1;
      }
    }
  }
  if (!migrated) {
    for (const alert of alerts) {
      if (alert.dimension === "泳道") await remove("alerts", alert.id);
    }
    await insert("audit_log", {
      id: "audit-ready-lane",
      actor: "系统",
      role: "admin",
      action: READY_MIGRATION,
      detail: "已有合同的店，当月、上月和历史月都完成第 4 步，停在第 5 步，可以继续录入。",
      created_at: NOW,
    });
  }
  return { parked, migrated };
}

export async function ensureOpeningLane(calendar = calendarMonth()) {
  const [stores, journeys, sales] = await Promise.all([all("stores"), all("journey"), all("sales_monthly")]);
  const seen = new Map(journeys.map((row) => [row.id, row]));
  const withSales = new Set(sales
    .filter((row) => Number(row.year) === Number(calendar.year) && Number(row.month) === Number(calendar.month))
    .map((row) => row.store_id));
  const plan = openingLanePlan(stores.map((store) => store.id), calendar);
  let added = 0;
  for (const row of plan) {
    const existing = seen.get(row.id);
    if (existing) {
      if (Number(existing.step) < 4 && !withSales.has(row.storeId)) {
        await update("journey", row.id, { step: 4, updated_at: NOW });
        added += 1;
      }
      continue;
    }
    await insert("journey", {
      id: row.id,
      store_id: row.storeId,
      year: row.year,
      month: row.month,
      step: row.step,
      updated_at: NOW,
    });
    added += 1;
  }
  return { year: calendar.year, month: calendar.month, added };
}
