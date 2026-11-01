const view = require("../../utils/view");
const api = require("../../utils/api");
const session = require("../../behaviors/session");

Page({
  behaviors: [session],
  data: {
    active: "monitor",
    matrix: view.ALERT_MATRIX.map((row, index) => ({ id: index, cells: row })),
    rows: [],
  },
  onShow() { this.boot(false); },
  async paint(snap, ctx) {
    const key = `${ctx.viewed.year}-${ctx.viewed.month}`;
    try {
      if (this._deskKey !== key || !this._desk) {
        this._desk = await api.desk(ctx.viewed);
        this._deskKey = key;
      }
      this.setData({ ...view.monitorModel(this._desk, ctx.viewed, this.data.query), error: "" });
    } catch (error) {
      this.setData({ error: error.message || "没有连上接口" });
    }
  },
});
