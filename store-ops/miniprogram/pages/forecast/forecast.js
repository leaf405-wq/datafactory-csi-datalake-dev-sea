const view = require("../../utils/view");
const api = require("../../utils/api");
const session = require("../../behaviors/session");

const FIELDS = [
  ["dailySales", "预估日均销售", "元", "20000"],
  ["ticket", "客单价", "元", "2800"],
  ["margin", "毛利率", "%", "62"],
  ["fixedRent", "固定租金", "元/月", "80000"],
  ["rate", "扣点比例", "%", "18"],
  ["propertyFee", "物业费", "元/月", "12000"],
  ["headcount", "人员编制", "人", "8"],
  ["salary", "人均月薪", "元", "8000"],
  ["reno", "装修总包", "元", "1800000"],
  ["equip", "设备采购", "元", "400000"],
  ["amortMonths", "摊销月数", "月", "36"],
  ["days", "每月天数", "天", "30"],
];

Page({
  behaviors: [session],
  data: {
    active: "forecast",
    fields: FIELDS.map(([key, label, unit, value]) => ({ key, label, unit, value })),
    models: view.RENT_MODELS.map(([id, label]) => ({ id, label })),
    modelIndex: 0,
    modelLabel: "两者取高",
    model: "HIGHER_OF_TWO",
    result: null,
  },
  onShow() { this.boot(false); },
  paint() {},
  setField(event) {
    const key = event.currentTarget.dataset.key;
    const fields = this.data.fields.map((item) => (item.key === key ? { ...item, value: event.detail.value } : item));
    this.setData({ fields, result: null });
  },
  onModel(event) {
    const index = Number(event.detail.value);
    const model = this.data.models[index];
    this.setData({ modelIndex: index, modelLabel: model.label, model: model.id, result: null });
  },
  async calc() {
    const payload = Object.fromEntries(this.data.fields.map((item) => [item.key, item.value]));
    payload.model = this.data.model;
    const result = await this.run(() => api.forecast(payload));
    if (!result) return;
    this.setData({
      result: {
        profitText: view.money(result.profit),
        paybackText: result.paybackText,
        breakEvenText: result.breakEvenText,
        irrText: result.irrText,
        lines: [
          ["月销售额", view.money(result.sales)],
          ["月客单笔数", result.tickets == null ? "—" : String(result.tickets)],
          ["毛利", view.money(result.gross)],
          ["租金（含物业，不含税）", view.money(result.rent)],
          ["人工", view.money(result.staff)],
          ["装修和设备摊销", view.money(result.amort)],
          ["净利润", view.money(result.profit)],
          ["净利率", view.percent(result.netMargin)],
        ].map(([name, value]) => ({ name, value })),
        sensitivity: (result.sensitivity || []).map((row) => ({
          label: row.label,
          salesText: view.money(row.sales),
          profitText: view.money(row.profit),
          text: row.text,
        })),
      },
    });
  },
});
