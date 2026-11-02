const api = require("../../utils/api");
const session = require("../../behaviors/session");

Page({
  behaviors: [session],
  data: {
    active: "contract",
    imported: null,
    draft: null,
    edits: [],
    canWrite: false,
  },
  onShow() {
    this.setData({ canWrite: getApp().globalData.role === "expansion" });
    this.boot(false);
  },
  paint() {
    this.setData({ canWrite: getApp().globalData.role === "expansion" });
  },
  async importSample(event) {
    if (!this.data.canWrite) return;
    const sample = event.currentTarget.dataset.sample;
    const result = await this.run(() => api.importSample(sample));
    if (result) this.setData({ imported: result, draft: null, edits: [] });
  },
  chooseFile() {
    if (!this.data.canWrite || this.data.busy) return;
    wx.chooseMessageFile({
      count: 1,
      type: "file",
      extension: ["doc", "docx", "pdf"],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        wx.getFileSystemManager().readFile({
          filePath: file.path,
          encoding: "base64",
          success: async (read) => {
            const result = await this.run(() => api.importFile(file.name, read.data));
            if (result) this.setData({ imported: result, draft: null, edits: [] });
          },
          fail: () => wx.showToast({ title: "文件没有读出来", icon: "none" }),
        });
      },
    });
  },
  onText(event) {
    const imported = this.data.imported || {};
    this.setData({ imported: { ...imported, text: event.detail.value } });
  },
  async extract() {
    const text = (this.data.imported && this.data.imported.text) || "";
    if (!text.trim()) return;
    const parsed = await this.run(() => api.upload(text));
    if (!parsed) return;
    this.setData({
      draft: { ...parsed, confidenceText: Math.round(Number(parsed.confidence || 0) * 100) },
      edits: (parsed.fields || []).map((field) => ({ ...field, value: field.field_value || "" })),
    });
  },
  onEdit(event) {
    const name = event.currentTarget.dataset.name;
    const edits = this.data.edits.map((field) => (field.field_name === name ? { ...field, value: event.detail.value } : field));
    this.setData({ edits });
  },
  async confirm() {
    const edits = Object.fromEntries(this.data.edits.map((field) => [field.field_name, field.value]));
    const result = await this.run(() => api.confirm(this.data.draft.contractId, edits));
    if (result && result.storeId) {
      getApp().globalData.photoStoreId = result.storeId;
      const period = getApp().globalData.period || (getApp().globalData.snapshot && getApp().globalData.snapshot.period);
      wx.navigateTo({ url: `/pages/journey/journey?id=${result.storeId}&year=${period.year}&month=${period.month}` });
    }
  },
});
