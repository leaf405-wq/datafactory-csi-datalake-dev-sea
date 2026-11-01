const view = require("../../utils/view");
const api = require("../../utils/api");
const session = require("../../behaviors/session");

const EMPTY_MALL = {
  base_rent: "", commission_rent: "0", property_fee: "", promo_fee: "", utility_fee: "", card_fee: "0", advance_fee: "0", total: "",
};

Page({
  behaviors: [session],
  data: {
    active: "journey",
    storeId: "",
    year: 0,
    month: 0,
    role: "expansion",
    activityNote: "本月无特殊活动",
    tempRate: "",
    subsidy: "0",
    reason: "商场固定租金与合同不一致",
    mall: view.MALL_FIELDS.map(([key, label]) => ({ key, label, value: EMPTY_MALL[key] || "" })),
    missing: false,
  },
  onLoad(query) {
    this.storeId = query.id || "";
    this.year = Number(query.year) || 0;
    this.month = Number(query.month) || 0;
    this.setData({ storeId: this.storeId, year: this.year, month: this.month });
    if (this.year && this.month) getApp().setPeriod({ year: this.year, month: this.month });
    if (this.storeId) getApp().globalData.photoStoreId = this.storeId;
  },
  onShow() { this.boot(false); },
  paint(snap, ctx) {
    const period = {
      year: this.year || this.data.year || ctx.viewed.year,
      month: this.month || this.data.month || ctx.viewed.month,
    };
    const model = view.journeyModel(snap, this.storeId || this.data.storeId, period, ctx.calendar);
    this.setData({ ...model, role: getApp().globalData.role, year: period.year, month: period.month });
  },
  period() {
    return { year: this.data.year, month: this.data.month };
  },
  onNote(event) { this.setData({ activityNote: event.detail.value }); },
  onRate(event) { this.setData({ tempRate: event.detail.value }); },
  onSubsidy(event) { this.setData({ subsidy: event.detail.value }); },
  onReason(event) { this.setData({ reason: event.detail.value }); },
  onMall(event) {
    const key = event.currentTarget.dataset.key;
    const mall = this.data.mall.map((item) => (item.key === key ? { ...item, value: event.detail.value } : item));
    this.setData({ mall });
  },
  async saveActivity() {
    const result = await this.run(() => api.activity(this.data.storeId, {
      activityNote: this.data.activityNote,
      tempRate: this.data.tempRate,
      subsidy: this.data.subsidy,
      ...this.period(),
    }));
    if (result) this.boot(false);
  },
  async calculate() {
    const result = await this.run(() => api.calculate(this.data.storeId, this.period()));
    if (result) this.boot(false);
  },
  async mallIn() {
    const result = await this.run(() => api.mallReceived(this.data.storeId, this.period()));
    if (result) this.boot(false);
  },
  async reconcile() {
    const mall = Object.fromEntries(this.data.mall.map((item) => [item.key, item.value]));
    const result = await this.run(() => api.reconcile(this.data.storeId, { ...mall, ...this.period() }));
    if (result) this.boot(false);
  },
  async resolve(event) {
    const resolution = event.currentTarget.dataset.resolution;
    const result = await this.run(() => api.resolve(this.data.storeId, { resolution, reason: this.data.reason, ...this.period() }));
    if (result) this.boot(false);
  },
  async pay() {
    const result = await this.run(() => api.payment(this.data.storeId, this.period()));
    if (result) this.boot(false);
  },
});
