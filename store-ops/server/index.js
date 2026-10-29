import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { all, startAccess, stopAccess } from "./access.js";
import { SAMPLE_CONTRACT } from "./parser.js";
import { seedIfEmpty } from "./seed.js";
import {
  ApiError,
  PERIOD,
  calculateRent,
  confirmContract,
  createPayment,
  receiveMallBill,
  reconcile,
  resolveRecon,
  saveActivity,
  setDecision,
  snapshot,
  uploadContract,
} from "./workflow.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));

function actor(req) {
  const raw = String(req.header("x-actor") || "");
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {
    name = raw;
  }
  return {
    role: String(req.header("x-role") || "expansion"),
    actor: name,
  };
}

function wrap(handler) {
  return async (req, res) => {
    try {
      res.json(await handler(req));
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 500;
      res.status(status).json({ error: error.message || "服务器错误" });
    }
  };
}

app.get("/api/health", wrap(async () => ({ ok: true, period: PERIOD })));
app.get("/api/sample-contract", wrap(async () => ({ text: SAMPLE_CONTRACT })));
app.get("/api/snapshot", wrap(async () => snapshot()));
app.post("/api/contracts", wrap(async (req) => uploadContract({ ...actor(req), text: req.body.text })));
app.post("/api/contracts/:id/confirm", wrap(async (req) => confirmContract({
  ...actor(req),
  contractId: req.params.id,
  edits: req.body.edits || {},
})));
app.post("/api/stores/:id/activity", wrap(async (req) => saveActivity({
  ...actor(req),
  storeId: req.params.id,
  activityNote: req.body.activityNote,
  tempRate: req.body.tempRate,
  subsidy: req.body.subsidy,
})));
app.post("/api/stores/:id/calculate", wrap(async (req) => calculateRent({ ...actor(req), storeId: req.params.id })));
app.post("/api/stores/:id/mall-received", wrap(async (req) => receiveMallBill({ ...actor(req), storeId: req.params.id })));
app.post("/api/stores/:id/reconcile", wrap(async (req) => reconcile({
  ...actor(req),
  storeId: req.params.id,
  mall: req.body,
})));
app.post("/api/stores/:id/resolve", wrap(async (req) => resolveRecon({
  ...actor(req),
  storeId: req.params.id,
  resolution: req.body.resolution,
  reason: req.body.reason,
})));
app.post("/api/stores/:id/payment", wrap(async (req) => createPayment({ ...actor(req), storeId: req.params.id })));
app.post("/api/stores/:id/decision", wrap(async (req) => setDecision({
  ...actor(req),
  storeId: req.params.id,
  keepDecision: req.body.keepDecision,
  actionPlan: req.body.actionPlan,
})));

const dist = path.resolve(__dirname, "../client/dist");
app.use(express.static(dist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(dist, "index.html"), (error) => {
    if (error) res.status(404).json({ error: "前端还没有构建。开发时请打开 Vite 地址。" });
  });
});

const port = Number(process.env.PORT || 3780);
await startAccess();
if ((await all("stores")).length === 0) await seedIfEmpty();
const httpServer = app.listen(port, () => {
  console.log(`store-ops http://127.0.0.1:${port}`);
});

async function shutdown() {
  httpServer.close();
  await stopAccess();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
