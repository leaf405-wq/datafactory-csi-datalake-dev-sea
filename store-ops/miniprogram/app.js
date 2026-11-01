const view = require("./utils/view");

App({
  globalData: {
    baseUrl: "http://127.0.0.1:3780",
    role: "expansion",
    actor: "拓展专员",
    period: null,
    snapshot: null,
    photoStoreId: "",
  },
  onLaunch() {
    const saved = wx.getStorageSync("baseUrl");
    if (saved) this.globalData.baseUrl = String(saved).replace(/\/$/, "");
    const role = wx.getStorageSync("role");
    if (role) this.setRole(role);
  },
  setRole(id) {
    const found = view.roleOf(id);
    this.globalData.role = found.id;
    this.globalData.actor = found.actor;
    wx.setStorageSync("role", found.id);
  },
  setPeriod(period) {
    if (!period || !period.year) return;
    this.globalData.period = { year: Number(period.year), month: Number(period.month) };
  },
  setBaseUrl(url) {
    const next = String(url || "").trim().replace(/\/$/, "");
    if (!next) return;
    this.globalData.baseUrl = next;
    wx.setStorageSync("baseUrl", next);
    this.globalData.snapshot = null;
  },
  async ensureSnapshot(force) {
    if (!force && this.globalData.snapshot) return this.globalData.snapshot;
    const api = require("./utils/api");
    const snap = await api.snapshot();
    this.globalData.snapshot = snap;
    if (!this.globalData.period) this.globalData.period = snap.period;
    return snap;
  },
});
