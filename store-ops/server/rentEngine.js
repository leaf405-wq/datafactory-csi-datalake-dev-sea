const MODEL_LABELS = {
  HIGHER_OF_TWO: "两者取高",
  LOWER_OF_TWO: "两者取低",
  FIXED_ONLY: "纯固定",
  COMMISSION_ONLY: "纯扣点",
  BASE_PLUS_OVERAGE: "保底+超额",
  TIERED: "阶梯扣点",
  CAPPED: "封顶扣点",
};

export function modelLabel(model) {
  return MODEL_LABELS[model] || model;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function step(node, decision, detail) {
  return { node, decision, detail };
}

/**
 * Monthly rent, in the same order as the PRD flowchart:
 * rent-free check → model → fixed / sales / rate → commission
 * → higher-of-two (MAX) or not (MIN) → surcharges → subsidy → VAT → payable.
 * Other contract models are resolved at “判断当月适用模型”.
 */
export function calculateMonthlyRent(input) {
  const sales = num(input.sales);
  const rate = num(input.rate);
  const fixedRent = num(input.fixedRent);
  const propertyFee = num(input.propertyFee);
  const promoFee = num(input.promoFee);
  const utilityFee = num(input.utilityFee);
  const subsidy = num(input.subsidy);
  const vatRate = input.vatRate == null ? 0.09 : num(input.vatRate);
  const inRentFree = Boolean(input.inRentFreePeriod);
  const waiveProperty = Boolean(input.waivePropertyInRentFree);
  const model = input.model || "HIGHER_OF_TWO";
  const trace = [step("开始计算月度租金", "开始", "按合同规则计算当月应付")];

  let baseRent = 0;
  let commissionRent = 0;
  let path = "max";

  if (inRentFree) {
    trace.push(step("是否在免租期内?", "是", "基础租金 = 0"));
    baseRent = 0;
    path = "rent_free";
  } else {
    trace.push(step("是否在免租期内?", "否", "继续判断当月适用模型"));
    trace.push(step("判断当月适用模型", modelLabel(model), "模型来自已确认合同，临时提点只替换扣点"));
    trace.push(step("获取合同固定租金 R_fix", money(fixedRent), "元/月"));
    trace.push(step("获取当月实际销售额 Sales", money(sales), "来自 DW 月销售"));
    trace.push(step("获取适用扣点比例 Rate", percent(rate), input.rateSource || "合同扣点"));
    commissionRent = round2(sales * rate);
    trace.push(step("计算扣点租金", money(commissionRent), "R_rate = Sales × Rate"));

    if (model === "HIGHER_OF_TWO") {
      baseRent = round2(Math.max(fixedRent, commissionRent));
      trace.push(step("模型判断: 两者取高?", "是", `基础租金 = MAX(R_fix, R_rate) = ${money(baseRent)}`));
      path = "max";
    } else if (model === "LOWER_OF_TWO") {
      baseRent = round2(Math.min(fixedRent, commissionRent));
      trace.push(step("模型判断: 两者取高?", "否", `基础租金 = MIN(R_fix, R_rate) = ${money(baseRent)}`));
      path = "min";
    } else if (model === "FIXED_ONLY") {
      baseRent = round2(fixedRent);
      trace.push(step("判断当月适用模型", "纯固定", `基础租金 = R_fix = ${money(baseRent)}`));
      path = "fixed";
    } else if (model === "COMMISSION_ONLY") {
      baseRent = commissionRent;
      trace.push(step("判断当月适用模型", "纯扣点", `基础租金 = R_rate = ${money(baseRent)}`));
      path = "commission";
    } else if (model === "BASE_PLUS_OVERAGE") {
      const minSales = num(input.minSales);
      const overageRate = input.overageRate == null ? rate : num(input.overageRate);
      const overage = round2(Math.max(0, sales - minSales) * overageRate);
      baseRent = round2(fixedRent + overage);
      trace.push(step(
        "判断当月适用模型",
        "保底+超额",
        `基础租金 = 保底租金 + MAX(0, (销售额-保底线)×超额扣点) = ${money(fixedRent)} + ${money(overage)}`,
      ));
      path = "overage";
    } else if (model === "TIERED") {
      const tiers = Array.isArray(input.tiers) ? input.tiers : [];
      let cursor = 0;
      let total = 0;
      const parts = [];
      for (const tier of tiers) {
        const up = tier.upTo == null ? Infinity : num(tier.upTo);
        const span = Math.max(0, Math.min(sales, up) - cursor);
        const piece = round2(span * num(tier.rate));
        total = round2(total + piece);
        parts.push(`${money(cursor)}–${up === Infinity ? "以上" : money(up)} × ${percent(tier.rate)} = ${money(piece)}`);
        cursor = up;
        if (sales <= up) break;
      }
      baseRent = total;
      commissionRent = total;
      trace.push(step("判断当月适用模型", "阶梯扣点", parts.join("；") || "未配置阶梯"));
      path = "tiered";
    } else if (model === "CAPPED") {
      const cap = num(input.capAmount);
      baseRent = round2(Math.min(commissionRent, cap));
      trace.push(step("判断当月适用模型", "封顶扣点", `基础租金 = MIN(R_rate, 封顶 ${money(cap)}) = ${money(baseRent)}`));
      path = "capped";
    } else {
      throw new Error(`未知租金模型: ${model}`);
    }
  }

  const property = inRentFree && waiveProperty ? 0 : propertyFee;
  const surcharge = round2(property + promoFee + utilityFee);
  trace.push(step(
    "叠加附加费用: 物业/推广/水电等",
    money(surcharge),
    `物业 ${money(property)} + 推广 ${money(promoFee)} + 水电 ${money(utilityFee)}`,
  ));
  const afterSurcharge = round2(baseRent + surcharge);
  const rawAfterSubsidy = round2(afterSurcharge - subsidy);
  const netBeforeVat = round2(Math.max(0, rawAfterSubsidy));
  trace.push(step(
    "扣减优惠与补贴",
    money(netBeforeVat),
    rawAfterSubsidy < 0 ? `扣减 ${money(subsidy)} 后为负，按 0 进入计税` : `扣减补贴 ${money(subsidy)}`,
  ));
  const vat = round2(netBeforeVat * vatRate);
  trace.push(step("计算增值税", money(vat), `增值税 = 扣减后金额 × ${percent(vatRate)}`));
  const payable = round2(netBeforeVat + vat);
  trace.push(step("输出最终应付账款", money(payable), "应付 = 扣减后金额 + 增值税"));

  return {
    inRentFree,
    path,
    model,
    sales,
    rate,
    fixedRent,
    commissionRent: round2(commissionRent),
    baseRent: round2(baseRent),
    property,
    promoFee: round2(promoFee),
    utilityFee: round2(utilityFee),
    surcharge,
    subsidy: round2(subsidy),
    netBeforeVat,
    vat,
    vatRate,
    payable,
    rentToSales: sales > 0 ? Math.round((netBeforeVat / sales) * 10000) / 10000 : null,
    trace,
  };
}

/** BRD thresholds. Green is healthy and is not opened as a ticket. */
export function diagnoseHealth({ sales, minSales, rentToSales, salesMissing }) {
  const alerts = [];
  if (salesMissing) {
    alerts.push({
      level: "red",
      dimension: "数据异常",
      message: "POS/DW 月销售缺失，不能把这条当成经营预警。",
    });
    return alerts;
  }
  if (minSales > 0) {
    const ratio = sales / minSales;
    const gap = Math.round(minSales - sales);
    if (ratio < 0.8) {
      alerts.push({
        level: "red",
        dimension: "保底达成",
        message: `距保底还差 ${money(gap)} 元，达成率 ${(ratio * 100).toFixed(1)}%，低于 80%。`,
      });
    } else if (ratio < 0.9) {
      alerts.push({
        level: "orange",
        dimension: "保底达成",
        message: `距保底还差 ${money(gap)} 元，达成率 ${(ratio * 100).toFixed(1)}%。`,
      });
    }
  }
  if (rentToSales != null) {
    if (rentToSales > 0.25) {
      alerts.push({
        level: "red",
        dimension: "租售比",
        message: `租售比 ${(rentToSales * 100).toFixed(1)}%，超过 25% 红线。`,
      });
    } else if (rentToSales > 0.2) {
      alerts.push({
        level: "orange",
        dimension: "租售比",
        message: `租售比 ${(rentToSales * 100).toFixed(1)}%，落在 20%–25%。`,
      });
    } else if (rentToSales > 0.15) {
      alerts.push({
        level: "yellow",
        dimension: "租售比",
        message: `租售比 ${(rentToSales * 100).toFixed(1)}%，落在 15%–20%。`,
      });
    }
  }
  return alerts;
}

export function inRentFreePeriod(contract, year, month) {
  if (!contract?.rent_free_start || !contract?.rent_free_end) return false;
  const cursor = year * 100 + month;
  const start = ym(contract.rent_free_start);
  const end = ym(contract.rent_free_end);
  if (!start || !end) return false;
  return cursor >= start && cursor <= end;
}

function ym(iso) {
  const match = String(iso).match(/(\d{4})-(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 100 + Number(match[2]);
}

export function money(value) {
  return Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function percent(rate) {
  return `${(num(rate) * 100).toFixed(2)}%`;
}

export function buildLetter({ store, period, lines, diff }) {
  const rows = lines
    .filter((line) => Math.abs(line.diff) >= 0.01)
    .map((line) => `· ${line.name}：系统 ${money(line.system)} 元，商场 ${money(line.mall)} 元，差额 ${money(line.diff)} 元`)
    .join("\n");
  return [
    `${store.mall_name || "商场"}财务部：`,
    "",
    `我司「${store.name}」${period} 对账单与系统租金引擎结果存在差异，合计差额 ${money(diff)} 元。请协助复核下列项目：`,
    rows || "· 合计金额不一致，请提供计算底稿。",
    "",
    "差异未关闭前，我司按系统金额挂账，不视同认可商场账单。",
    "",
    "零售经营系统 · 对账差异沟通函",
  ].join("\n");
}
