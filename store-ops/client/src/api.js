export function createApi(role, actor) {
  const headers = {
    "content-type": "application/json",
    "x-role": role,
    "x-actor": encodeURIComponent(actor || ""),
  };

  async function send(url, options = {}) {
    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
      });
    } catch {
      throw new Error("接口没有连上。请在 store-ops 目录执行 npm run dev，看到 3780 端口后再刷新。");
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || "Access 服务没有启动。请在 store-ops 目录执行 npm run dev，不要只开前端。");
    }
    return body;
  }

  return {
    snapshot: () => send("/api/snapshot"),
    sample: () => send("/api/sample-contract"),
    upload: (text) => send("/api/contracts", { method: "POST", body: JSON.stringify({ text }) }),
    confirm: (id, edits) => send(`/api/contracts/${id}/confirm`, { method: "POST", body: JSON.stringify({ edits }) }),
    activity: (id, payload) => send(`/api/stores/${id}/activity`, { method: "POST", body: JSON.stringify(payload) }),
    calculate: (id) => send(`/api/stores/${id}/calculate`, { method: "POST", body: "{}" }),
    mallReceived: (id) => send(`/api/stores/${id}/mall-received`, { method: "POST", body: "{}" }),
    reconcile: (id, payload) => send(`/api/stores/${id}/reconcile`, { method: "POST", body: JSON.stringify(payload) }),
    resolve: (id, payload) => send(`/api/stores/${id}/resolve`, { method: "POST", body: JSON.stringify(payload) }),
    payment: (id) => send(`/api/stores/${id}/payment`, { method: "POST", body: "{}" }),
    decision: (id, payload) => send(`/api/stores/${id}/decision`, { method: "POST", body: JSON.stringify(payload) }),
  };
}

export function money(value) {
  return Number(value || 0).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
