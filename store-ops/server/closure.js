export const CLOSED_STATUS = "失效-闭店";
export const CLOSURE_MONTHS = 6;

export function isClosed(store) {
  return store?.status === CLOSED_STATUS;
}

export function monthSignal(alerts) {
  const rows = (alerts || []).filter((item) => item && item.dimension !== "数据异常");
  if (rows.some((item) => item.level === "red")) return "red";
  if (rows.some((item) => item.level === "yellow")) return "yellow";
  return "";
}

function shiftMonth(period, delta) {
  let year = Number(period.year);
  let month = Number(period.month) + delta;
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  return { year, month };
}

function monthKey(period) {
  return `${Number(period.year)}-${Number(period.month)}`;
}

/** The latest six months through the close month must each be red or yellow. Orange does not count. */
export function evaluateClosure(signals, through, needed = CLOSURE_MONTHS) {
  const byKey = new Map((signals || []).map((item) => [monthKey(item), item.signal || ""]));
  const colors = [];
  for (let offset = needed - 1; offset >= 0; offset -= 1) {
    const period = shiftMonth(through, -offset);
    colors.push({ year: period.year, month: period.month, signal: byKey.get(monthKey(period)) || "" });
  }
  const hit = colors.filter((item) => item.signal === "red" || item.signal === "yellow").length;
  const allowed = colors.every((item) => item.signal === "red" || item.signal === "yellow");
  const reason = allowed
    ? `已连续 ${needed} 个月为红色或黄色，可以闭店。`
    : `最近 ${needed} 个月里有 ${hit} 个月是红色或黄色，还不能闭店。`;
  return { allowed, hit, colors, reason };
}

export function signalsFromBills(bills, contract, through, diagnose, margin = 0.55) {
  const ordered = [...(bills || [])].sort((left, right) => (
    Number(left.year) * 12 + Number(left.month) - (Number(right.year) * 12 + Number(right.month))
  ));
  let loss = 0;
  let previousMargin = null;
  const signals = [];
  const limit = Number(through.year) * 12 + Number(through.month);
  for (const bill of ordered) {
    const index = Number(bill.year) * 12 + Number(bill.month);
    if (!bill.year || !bill.month || index > limit) continue;
    const sales = Number(bill.sales) || 0;
    const payable = Number(bill.payable) || 0;
    const profit = sales * margin - payable;
    const marginRate = sales > 0 ? profit / sales : null;
    if (profit < 0) loss += 1;
    else loss = 0;
    const rentToSales = bill.rent_to_sales == null || bill.rent_to_sales === "" ? null : Number(bill.rent_to_sales);
    const found = diagnose({
      sales,
      rentToSales,
      minSales: Number(contract?.min_sales) || 0,
      profit,
      margin: marginRate,
      previousMargin,
      lossStreak: loss,
      timeProgress: 20 / 31,
    });
    signals.push({
      year: Number(bill.year),
      month: Number(bill.month),
      signal: monthSignal(found.alerts),
    });
    previousMargin = marginRate;
  }
  return signals;
}
