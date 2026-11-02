const view = require("../../utils/view");
const session = require("../../behaviors/session");

Page({
  behaviors: [session],
  data: { active: "home", cards: [], queue: [], queueEmpty: true },
  onShow() { this.boot(false); },
  paint(snap, ctx) {
    const model = view.homeModel(snap, ctx.viewed, this.data.query);
    this.setData(model);
  },
});
