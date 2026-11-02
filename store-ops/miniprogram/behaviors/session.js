const view = require("../utils/view");

module.exports = Behavior({
  data: {
    loading: true,
    error: "",
    busy: false,
    query: "",
    headline: "",
    chips: [],
    roles: view.ROLES,
    pages: view.PAGES,
    role: "expansion",
    photoUrl: "",
    photoName: "",
    photoMeta: "",
  },
  methods: {
    async loadSnap(force) {
      this.setData({ loading: !getApp().globalData.snapshot, error: "" });
      try {
        return await getApp().ensureSnapshot(force);
      } catch (error) {
        this.setData({ loading: false, error: error.message || "没有连上接口" });
        return null;
      }
    },
    shell(snapshot) {
      const app = getApp();
      const ctx = view.buildContext(snapshot, app.globalData.period);
      const photoId = app.globalData.photoStoreId;
      const store = (snapshot.stores || []).find((item) => item.id === photoId)
        || (snapshot.stores || []).find((item) => item.id === "st-sanlitun")
        || (snapshot.stores || []).find((item) => item.photo_id)
        || null;
      const base = String(app.globalData.baseUrl || "").replace(/\/$/, "");
      this.setData({
        loading: false,
        headline: ctx.headline,
        chips: ctx.chips,
        role: app.globalData.role,
        pages: view.pagesFor(app.globalData.role),
        roles: view.ROLES.map((item) => ({ ...item, on: item.id === app.globalData.role })),
        photoUrl: store && store.photo_id ? `${base}/api/photos/${store.photo_id}` : "",
        photoName: (store && store.name) || "",
        photoMeta: [store && store.city, store && store.mall_name].filter(Boolean).join(" · "),
      });
      return ctx;
    },
    rememberStore(id) {
      if (id) getApp().globalData.photoStoreId = id;
    },
    async run(work) {
      if (this.data.busy) return null;
      this.setData({ busy: true, error: "" });
      try {
        const result = await work();
        await getApp().ensureSnapshot(true);
        return result;
      } catch (error) {
        this.setData({ error: error.message || "没有写成" });
        wx.showToast({ title: error.message || "没有写成", icon: "none" });
        return null;
      } finally {
        this.setData({ busy: false });
      }
    },
    async boot(force) {
      const snap = await this.loadSnap(force === true);
      if (!snap) return;
      this._snap = snap;
      const ctx = this.shell(snap);
      if (typeof this.paint === "function") await this.paint(snap, ctx);
    },
    onRetry() {
      this.boot(true);
    },
    onRole(event) {
      getApp().setRole(event.detail.id);
      this.boot(false);
    },
    onMonth(event) {
      const period = event.detail.period;
      if (!period) return;
      getApp().setPeriod(period);
      this.boot(false);
    },
    onQuery(event) {
      const query = event.detail.value;
      this.setData({ query }, async () => {
        if (!this._snap) return;
        const ctx = view.buildContext(this._snap, getApp().globalData.period);
        if (typeof this.paint === "function") await this.paint(this._snap, ctx);
      });
    },
    onNav(event) {
      const id = event.detail.id;
      if (!id || id === this.data.active) return;
      wx.redirectTo({ url: `/pages/${id}/${id}` });
    },
    onBase() {
      const app = getApp();
      wx.showModal({
        title: "接口地址",
        editable: true,
        placeholderText: "http://127.0.0.1:3780",
        content: app.globalData.baseUrl,
        success: (res) => {
          if (!res.confirm || !res.content) return;
          app.setBaseUrl(res.content);
          this.boot(true);
        },
      });
    },
    openLane(event) {
      const id = event.currentTarget.dataset.id;
      const app = getApp();
      const period = app.globalData.period || (app.globalData.snapshot && app.globalData.snapshot.period);
      if (!id || !period) return;
      this.rememberStore(id);
      wx.navigateTo({ url: `/pages/journey/journey?id=${id}&year=${period.year}&month=${period.month}` });
    },
  },
});
