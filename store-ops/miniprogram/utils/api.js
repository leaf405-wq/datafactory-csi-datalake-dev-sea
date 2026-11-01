function request(method, path, data) {
  const app = getApp();
  const role = app.globalData.role || "expansion";
  const actor = app.globalData.actor || "";
  const base = String(app.globalData.baseUrl || "").replace(/\/$/, "");
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${base}${path}`,
      method,
      data,
      header: {
        "content-type": "application/json",
        "x-role": role,
        "x-actor": encodeURIComponent(actor),
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data || {});
        else reject(new Error((res.data && res.data.error) || "Access 服务没有启动。请在 store-ops 目录执行 npm run dev。"));
      },
      fail() {
        reject(new Error("接口没有连上。请先在电脑上运行 npm run dev，开发者工具勾选不校验合法域名。长按标题可改接口地址。"));
      },
    });
  });
}

module.exports = {
  snapshot: () => request("GET", "/api/snapshot"),
  sample: () => request("GET", "/api/sample-contract"),
  importSample: (sample) => request("POST", "/api/contracts/import", { sample }),
  importFile: (filename, contentBase64) => request("POST", "/api/contracts/import", { filename, contentBase64 }),
  upload: (text) => request("POST", "/api/contracts", { text }),
  confirm: (id, edits) => request("POST", `/api/contracts/${id}/confirm`, { edits }),
  activity: (id, payload) => request("POST", `/api/stores/${id}/activity`, payload),
  calculate: (id, period) => request("POST", `/api/stores/${id}/calculate`, period || {}),
  mallReceived: (id, period) => request("POST", `/api/stores/${id}/mall-received`, period || {}),
  reconcile: (id, payload) => request("POST", `/api/stores/${id}/reconcile`, payload),
  resolve: (id, payload) => request("POST", `/api/stores/${id}/resolve`, payload),
  payment: (id, period) => request("POST", `/api/stores/${id}/payment`, period || {}),
  decision: (id, payload) => request("POST", `/api/stores/${id}/decision`, payload),
  previewRent: (payload) => request("POST", "/api/rent/preview", payload),
  forecast: (payload) => request("POST", "/api/forecast", payload),
  desk: (period) => request("GET", period ? `/api/prd/desk?year=${period.year}&month=${period.month}` : "/api/prd/desk"),
};
