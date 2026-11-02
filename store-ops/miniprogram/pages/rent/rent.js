const view = require("../../utils/view");
const api = require("../../utils/api");
const session = require("../../behaviors/session");

const EMPTY = {
  sales: "500000",
  fixedRent: "80000",
  rate: "18",
  propertyFee: "12000",
  model: "HIGHER_OF_TWO",
  minSales: "400000",
  overageRate: "25",
  capAmount: "100000",
  tier1: "300000",
  rate1: "12",
  tier2: "600000",
  rate2: "15",
  rate3: "18",
};

Page({
  behaviors: [session],
  data: {
    active: "rent",
    models: view.RENT_MODELS.map(([id, label]) => ({ id, label })),
    matrix: view.RENT_MATRIX.map((row, index) => ({ id: index, cells: row })),
    modelIndex: 0,
    modelLabel: "两者取高",
    form: EMPTY,
    result: null,
  },
  onShow() { this.boot(false); },
  paint() {},
  setField(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ form: { ...this.data.form, [key]: event.detail.value }, result: null });
  },
  onModel(event) {
    const index = Number(event.detail.value);
    const model = this.data.models[index];
    this.setData({ modelIndex: index, modelLabel: model.label, form: { ...this.data.form, model: model.id }, result: null });
  },
  async calc() {
    const form = this.data.form;
    const result = await this.run(() => api.previewRent({
      ...form,
      tiers: [
        { upTo: form.tier1, rate: form.rate1 },
        { upTo: form.tier2, rate: form.rate2 },
        { upTo: null, rate: form.rate3 },
      ],
    }));
    if (!result) return;
    this.setData({
      result: {
        payableText: view.money(result.payable),
        formula: result.formula || "",
        detail: `扣点租金 ${view.money(result.commissionRent)} · 模型租金 ${view.money(result.baseRent)} · 物业 ${view.money(result.property)} · 增值税 ${view.money(result.vat)}`,
      },
    });
  },
});
