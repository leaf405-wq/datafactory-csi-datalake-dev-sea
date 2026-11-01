const view = require("../../utils/view");
const api = require("../../utils/api");
const session = require("../../behaviors/session");

Page({
  behaviors: [session],
  data: { active: "stores", rows: [], decisions: view.DECISIONS, canDecide: false, salesHead: "销售" },
  onShow() { this.boot(false); },
  paint(snap, ctx) {
    this.setData(view.storesModel(snap, ctx.viewed, this.data.query, getApp().globalData.role));
  },
  async onDecision(event) {
    const id = event.currentTarget.dataset.id;
    const index = Number(event.detail.value);
    const keepDecision = view.DECISIONS[index];
    const result = await this.run(() => api.decision(id, { keepDecision }));
    if (result) this.boot(false);
  },
});
