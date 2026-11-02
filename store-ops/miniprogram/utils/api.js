const endpoints = require("./endpoints");

function request(method, path, data) {
  const app = getApp();
  const role = app.globalData.role || "expansion";
  const actor = app.globalData.actor || "";
  const list = endpoints.candidateBases(app.globalData.baseUrl, endpoints.bases);

  function once(base) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${base}${path}`,
        method,
        data,
        timeout: 5000,
        header: {
          "content-type": "application/json",
          "x-role": role,
          "x-actor": encodeURIComponent(actor),
        },
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            if (app.globalData.baseUrl !== base) {
              app.globalData.baseUrl = base;
              wx.setStorageSync("baseUrl", base);
            }
            resolve(res.data || {});
            return;
          }
          reject(new Error((res.data && res.data.error) || "Access 服务没有启动。请在 store-ops 目录执行 npm run dev。"));
        },
        fail(err) {
          const detail = (err && err.errMsg) || "request:fail";
          const error = new Error(`${base}（${detail}）`);
          error.offline = true;
          reject(error);
        },
      });
    });
  }

  function tryAt(index, misses) {
    if (index >= list.length) {
      return Promise.reject(new Error(`接口没有连上：${misses.join("；")}。请先在电脑上运行 npm run dev，开发者工具勾选不校验合法域名。点这里重试，或长按标题改接口地址。`));
    }
    return once(list[index]).catch((error) => {
      if (!error || !error.offline) throw error;
      misses.push(error.message);
      return tryAt(index + 1, misses);
    });
  }

  return tryAt(0, []);
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
