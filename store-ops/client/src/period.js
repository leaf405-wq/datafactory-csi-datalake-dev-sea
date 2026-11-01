export function calendarMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  return {
    year: Number(parts.find((part) => part.type === "year").value),
    month: Number(parts.find((part) => part.type === "month").value),
  };
}

/** The close stays on the previous calendar month. 1–30 Nov still works October. */
export function accountingPeriod(now = new Date()) {
  const current = calendarMonth(now);
  if (current.month === 1) return { year: current.year - 1, month: 12 };
  return { year: current.year, month: current.month - 1 };
}

export function monthIndex(period) {
  return Number(period.year) * 12 + Number(period.month);
}

export function openMonthOf(record) {
  const raw = record?.lifecycle_start || record?.lifecycleStart || "";
  const match = String(raw).match(/(\d{4})-(\d{2})/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function operatingIn(record, period) {
  const open = openMonthOf(record);
  if (!open || !period) return true;
  return monthIndex(period) >= monthIndex(open);
}

export function sameMonth(left, right) {
  return Number(left?.year) === Number(right?.year) && Number(left?.month) === Number(right?.month);
}

export function historyMonths(rows, accounting, calendar) {
  const limit = calendar ? monthIndex(calendar) : monthIndex(accounting);
  const seen = new Map();
  for (const row of rows) {
    const year = Number(row?.year);
    const month = Number(row?.month);
    if (!year || month < 1 || month > 12) continue;
    if (monthIndex({ year, month }) > limit) continue;
    seen.set(`${year}-${month}`, { year, month });
  }
  seen.set(`${accounting.year}-${accounting.month}`, { year: accounting.year, month: accounting.month });
  if (calendar) seen.set(`${calendar.year}-${calendar.month}`, { year: calendar.year, month: calendar.month });
  return [...seen.values()].sort((left, right) => monthIndex(left) - monthIndex(right));
}

/** At most six months before and six after the selected month. Missing months stay absent. */
export function historyWindow(months, selected, radius = 6) {
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
