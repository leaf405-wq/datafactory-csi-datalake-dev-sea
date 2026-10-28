const MODEL_BY_LABEL = [
  ["两者取高", "HIGHER_OF_TWO"],
  ["两者取低", "LOWER_OF_TWO"],
  ["纯固定", "FIXED_ONLY"],
  ["纯扣点", "COMMISSION_ONLY"],
  ["保底+超额", "BASE_PLUS_OVERAGE"],
  ["保底＋超额", "BASE_PLUS_OVERAGE"],
  ["阶梯扣点", "TIERED"],
  ["封顶扣点", "CAPPED"],
];

export function parseContract(text) {
  const source = String(text || "");
  const fields = [];

  function capture(name, label, regex, normalize = (match) => match[1].trim()) {
    const match = source.match(regex);
    if (!match) {
      fields.push({ field_name: name, label, field_value: "", confidence: 0.32, needs_review: 1 });
      return "";
    }
    const value = normalize(match);
    fields.push({ field_name: name, label, field_value: value, confidence: 0.97, needs_review: 0 });
    return value;
  }

  const contractNo = capture("contract_no", "合同编号", /合同编号\s*[:：]\s*([^\n]+)/);
  const brand = capture("brand", "品牌", /品牌\s*[:：]\s*([^\n]+)/);
  const storeName = capture("store_name", "店铺名称", /店铺名称\s*[:：]\s*([^\n]+)/);
  const mallName = capture("mall_name", "商场", /商场\s*[:：]\s*([^\n]+)/);
  const region = capture("region", "区域", /区域\s*[:：]\s*([^\n]+)/);
  const city = capture("city", "城市", /城市\s*[:：]\s*([^\n]+)/);
  const landlord = capture("landlord", "业主", /业主\s*[:：]\s*([^\n]+)/);
  const startDate = capture("start_date", "租赁起始", /租赁期限\s*[:：]\s*(\d{4}-\d{2}-\d{2})\s*[至到~\-—]+\s*\d{4}-\d{2}-\d{2}/);
  const endDate = capture("end_date", "租赁截止", /租赁期限\s*[:：]\s*\d{4}-\d{2}-\d{2}\s*[至到~\-—]+\s*(\d{4}-\d{2}-\d{2})/);
  const rentFreeStart = capture("rent_free_start", "免租起始", /免租期\s*[:：]\s*(\d{4}-\d{2}-\d{2})\s*[至到~\-—]+\s*\d{4}-\d{2}-\d{2}/);
  const rentFreeEnd = capture("rent_free_end", "免租截止", /免租期\s*[:：]\s*\d{4}-\d{2}-\d{2}\s*[至到~\-—]+\s*(\d{4}-\d{2}-\d{2})/);
  const modelLabel = capture("model", "租金模式", /租金模式\s*[:：]\s*([^\n]+)/);
  const fixedRent = capture("fixed_rent", "固定租金", /固定租金\s*[:：]\s*([\d,]+(?:\.\d+)?)/, (match) => strip(match[1]));
  const rate = capture("rate", "扣点比例", /扣点比例\s*[:：]\s*([\d.]+)\s*%?/, (match) => asRate(match[1]));
  const minSales = capture("min_sales", "保底销售额", /保底销售额\s*[:：]\s*([\d,]+(?:\.\d+)?)/, (match) => strip(match[1]));
  const propertyFee = capture("property_fee", "物业费", /物业费\s*[:：]\s*([\d,]+(?:\.\d+)?)/, (match) => strip(match[1]));
  const promoFee = capture("promo_fee", "推广费", /推广费\s*[:：]\s*([\d,]+(?:\.\d+)?)/, (match) => strip(match[1]));
  const utilityFee = capture("utility_fee", "水电费", /水电费\s*[:：]\s*([\d,]+(?:\.\d+)?)/, (match) => strip(match[1]));
  const vatRate = capture("vat_rate", "增值税率", /增值税率\s*[:：]\s*([\d.]+)\s*%?/, (match) => asRate(match[1]));
  const area = capture("area_sqm", "计租面积", /计租面积\s*[:：]\s*([\d.]+)/);
  const selling = capture("selling_area", "销售面积", /销售面积\s*[:：]\s*([\d.]+)/);
  const referenceSales = capture("reference_sales", "参考月销售", /参考月销售\s*[:：]\s*([\d,]+(?:\.\d+)?)/, (match) => strip(match[1]));
  const waive = capture("waive_property", "免租是否免物业", /免租是否免物业\s*[:：]\s*(是|否)/);

  const model = MODEL_BY_LABEL.find(([label]) => modelLabel.includes(label))?.[1] || "";
  if (!model) {
    const field = fields.find((item) => item.field_name === "model");
    if (field) {
      field.needs_review = 1;
      field.confidence = 0.4;
    }
  }

  const required = [contractNo, storeName, startDate, endDate, model, fixedRent || rate];
  const confidence = required.filter(Boolean).length / required.length;

  return {
    confidence: Math.round(confidence * 100) / 100,
    model,
    values: {
      contract_no: contractNo,
      brand,
      store_name: storeName,
      mall_name: mallName,
      region,
      city,
      landlord,
      start_date: startDate,
      end_date: endDate,
      rent_free_start: rentFreeStart,
      rent_free_end: rentFreeEnd,
      fixed_rent: numberOrZero(fixedRent),
      rate: numberOrZero(rate),
      min_sales: numberOrZero(minSales),
      property_fee: numberOrZero(propertyFee),
      promo_fee: numberOrZero(promoFee),
      utility_fee: numberOrZero(utilityFee),
      vat_rate: vatRate ? numberOrZero(vatRate) : 0.09,
      area_sqm: numberOrZero(area),
      selling_area: numberOrZero(selling),
      reference_sales: numberOrZero(referenceSales),
      waive_property: waive === "是" ? 1 : 0,
    },
    fields,
  };
}

export const SAMPLE_CONTRACT = `合同编号：SH-IXT-2026-014
品牌：主品牌
店铺名称：上海前滩太古里店
商场：前滩太古里
区域：华东
城市：上海
业主：太古地产
租赁期限：2026-03-01 至 2029-02-28
免租期：2026-03-01 至 2026-03-15
免租是否免物业：否
租金模式：两者取高
固定租金：90000
扣点比例：11%
保底销售额：1200000
物业费：12000
推广费：4000
水电费：2500
增值税率：9%
计租面积：98
销售面积：86
参考月销售：980000
`;

function strip(value) {
  return String(value).replace(/,/g, "");
}

function asRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(n > 1 ? n / 100 : n);
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
