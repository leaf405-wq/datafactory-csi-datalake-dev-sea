const view = require("../../utils/view");
const api = require("../../utils/api");
const session = require("../../behaviors/session");

Page({
  behaviors: [session],
  data: { active: "close", cards: [], empty: true, readyCount: 0, closedCount: 0 },
  onShow() { this.boot(false); },
  paint(snap, ctx) {
    if (getApp().globalData.role !== "executive") {
      wx.redirectTo({ url: "/pages/home/home" });
      return;
    }
    this.setData(view.closeModel(snap, ctx.viewed));
  },
  async onAct(event) {
    const id = event.currentTarget.dataset.id;
    const flag = event.currentTarget.dataset.closed;
    const closed = flag === true || flag === "true" || flag === "1";
    const done = await this.run(() => (closed ? api.reopen(id) : api.close(id)));
    if (done) this.boot(false);
  },
});
