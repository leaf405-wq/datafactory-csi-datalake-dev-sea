import { useEffect, useMemo, useRef, useState } from "react";
import { createApi, money } from "./api.js";
import { Action, BUSY_HOLD_MS, WaitingCopy } from "./Action.jsx";
import { CockpitPage, ForecastPage, MonitorPage, RentPage } from "./PrdPages.jsx";
import { calendarMonth, historyMonths, historyWindow, monthIndex, sameMonth } from "./period.js";

const ROLES = [
  { id: "expansion", label: "拓展部", actor: "拓展专员" },
  { id: "ops", label: "营运部", actor: "营运经理" },
  { id: "finance", label: "财务部", actor: "财务专员" },
  { id: "executive", label: "高管", actor: "区域负责人" },
];

const FILTER_PLACEHOLDER = "按区域、城市、店名、商场、电话筛选";
const STEP_COLORS = [
  "#8c3f1c", "#1d6b45", "#1f4e79", "#8a5a00", "#6b3fa0",
  "#9d2c2c", "#0f6e6e", "#3d4c8a", "#a15c38", "#2f6f3e",
  "#7a3e5c", "#3e5f8a", "#5c4a1f",
];

const ACTOR = {
  expansion: "拓展部",
  ops: "营运部",
  finance: "财务部",
  mall: "商场方",
  system: "系统",
};

export default function App() {
  const [role, setRole] = useState("expansion");
  const [page, setPage] = useState("home");
  const [storeId, setStoreId] = useState("");
  const [photoStoreId, setPhotoStoreId] = useState("");
  const [period, setPeriod] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const busyRef = useRef(false);
  const actor = ROLES.find((item) => item.id === role)?.actor || "";
  const api = useMemo(() => createApi(role, actor), [role, actor]);

  async function reload() {
    const next = await api.snapshot();
    setData(next);
    return next;
  }

  useEffect(() => {
    let stop = false;
    let timer;
    async function tick() {
      if (stop) return;
      try {
        await reload();
        if (!stop) setError("");
      } catch (err) {
        if (stop) return;
        setError(err.message);
        timer = setTimeout(tick, 1500);
      }
    }
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [role]);

  async function run(action, id = "submit") {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusyId(id);
    setError("");
    const started = performance.now();
    try {
      const result = await action();
      const remain = BUSY_HOLD_MS - (performance.now() - started);
      if (remain > 0) await new Promise((resolve) => setTimeout(resolve, remain));
      await reload();
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      busyRef.current = false;
      setBusyId("");
    }
  }

  const calendar = calendarMonth();
  const accounting = data?.period || null;
  const viewed = period || accounting;
  const months = data ? historyMonths([
    ...data.journey, ...data.sales, ...data.bills, ...data.reconciliations, ...data.payments,
  ], accounting, calendar) : [];

  function openStore(id, nextPeriod) {
    if (nextPeriod) setPeriod(nextPeriod);
    setStoreId(id);
    setPhotoStoreId(id);
    setPage("journey");
  }

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <img className="wordmark" src="/maxmara-wordmark.png" alt="Max Mara" />
          <div>
            <small>Web 4.0 · 账期 {viewed ? `${viewed.year}年${viewed.month}月${sameMonth(viewed, accounting) ? " · 上月" : sameMonth(viewed, calendar) ? " · 当月" : ""}` : ""}</small>
            <h1>零售经营系统</h1>
          </div>
        </div>
        <div className="roles">
          {ROLES.map((item) => (
            <button key={item.id} className={item.id === role ? "active" : ""} onClick={() => setRole(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </header>
      <div className="layout">
        <aside className="nav">
          <SidePhoto data={data} storeId={photoStoreId || storeId} />
          <button className={page === "home" ? "active" : "ghost"} onClick={() => setPage("home")}>经营首页</button>
          <button className={page === "contract" ? "active" : "ghost"} onClick={() => setPage("contract")}>新签合同</button>
          <button className={page === "stores" ? "active" : "ghost"} onClick={() => setPage("stores")}>店览宽表</button>
          <button className={page === "rent" ? "active" : "ghost"} onClick={() => setPage("rent")}>租金引擎</button>
          <button className={page === "forecast" ? "active" : "ghost"} onClick={() => setPage("forecast")}>盈利预测</button>
          <button className={page === "monitor" ? "active" : "ghost"} onClick={() => setPage("monitor")}>每日预警</button>
          <button className={page === "cockpit" ? "active" : "ghost"} onClick={() => setPage("cockpit")}>管理驾驶舱</button>
          <p className="meta" style={{ marginTop: 18 }}>
            当前身份 {actor}。泳道里的每一步只接受对应部门的操作，顺序不能跳。
          </p>
        </aside>
        <main className="main">
          {error ? <div className="error">{error}</div> : null}
          {!data ? <p>{error ? "接口恢复后会自动再打开 Access 数据库。" : <WaitingCopy text="正在打开 Access 数据库" active />}</p> : null}
          {data && page === "home" ? (
            <Home data={data} period={viewed} months={months} accounting={accounting} calendar={calendar} onPeriod={setPeriod} onOpen={openStore} onPreview={setPhotoStoreId} />
          ) : null}
          {data && page === "stores" ? (
            <Stores data={data} period={viewed} months={months} accounting={accounting} calendar={calendar} onPeriod={setPeriod} role={role} onOpen={openStore} onPreview={setPhotoStoreId} onRun={run} api={api} busyId={busyId} />
          ) : null}
          {data && page === "contract" ? <ContractDesk api={api} onRun={run} onOpen={openStore} busyId={busyId} /> : null}
          {data && page === "journey" ? (
            <Journey data={data} storeId={storeId} period={viewed} accounting={accounting} calendar={calendar} onOpen={openStore} role={role} api={api} onRun={run} busyId={busyId} />
          ) : null}
          {data && page === "rent" ? <RentPage api={api} onRun={run} busyId={busyId} /> : null}
          {data && page === "forecast" ? <ForecastPage api={api} onRun={run} busyId={busyId} /> : null}
          {data && page === "monitor" ? (
            <MonitorPage api={api} period={viewed} months={months} accounting={accounting} calendar={calendar} onPeriod={setPeriod} MonthHistory={MonthHistory} />
          ) : null}
          {data && page === "cockpit" ? (
            <CockpitPage api={api} period={viewed} months={months} accounting={accounting} calendar={calendar} onPeriod={setPeriod} MonthHistory={MonthHistory} />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function matchesStore(store, query) {
  if (!query) return true;
  const blob = [store.region, store.city, store.name, store.mall_name, store.phone].filter(Boolean).join(" ");
  return blob.toLowerCase().includes(query.trim().toLowerCase());
}

function SidePhoto({ data, storeId }) {
  if (!data?.stores?.length) return null;
  const store = data.stores.find((item) => item.id === storeId)
    || data.stores.find((item) => item.id === "st-sanlitun")
    || data.stores[0];
  if (!store?.photo_id) return null;
  return (
    <figure className="nav-photo">
      <img src={`/api/photos/${store.photo_id}`} alt={`${store.name}实景`} />
      <figcaption>
        <strong>{store.name}</strong>
        <span>{[store.city, store.mall_name].filter(Boolean).join(" · ")}</span>
        <span>实景样本</span>
      </figcaption>
    </figure>
  );
}

function inMonth(row, period) {
  return Number(row.year) === Number(period.year) && Number(row.month) === Number(period.month);
}

function laneStep(data, storeId, period) {
  return data.journey.find((item) => item.store_id === storeId && inMonth(item, period))?.step || 0;
}

function monthChipLabel(item, accounting, calendar) {
  if (calendar && sameMonth(item, calendar) && !sameMonth(item, accounting)) return "当月";
  if (sameMonth(item, accounting)) return "上月";
  return `${item.year}年${item.month}月`;
}

function MonthHistory({ months, selected, accounting, calendar, onPeriod }) {
  const windowed = historyWindow(months, selected, 6);
  return (
    <div className="month-history" aria-label="经营历史记录（按月）">
      <span className="meta">经营历史记录（按月）</span>
      {windowed.hasPrev ? (
        <button type="button" className="ghost" onClick={() => onPeriod(windowed.prevMonth)}>...(前一页)</button>
      ) : null}
      {windowed.visible.map((item) => (
        <button
          type="button"
          key={`${item.year}-${item.month}`}
          className={sameMonth(item, selected) ? "active" : "ghost"}
          onClick={() => onPeriod(item)}
        >
          {monthChipLabel(item, accounting, calendar)}
        </button>
      ))}
      {windowed.hasNext ? (
        <button type="button" className="ghost" onClick={() => onPeriod(windowed.nextMonth)}>....(后一页)</button>
      ) : null}
    </div>
  );
}

function laneUnfinished(data, storeId, period) {
  return data.alerts.some((alert) => (
    alert.store_id === storeId && inMonth(alert, period) && alert.level === "red" && alert.dimension === "泳道"
  ));
}

function StepRail({ step }) {
  const completed = Number(step) || 0;
  const current = completed >= 13 ? 13 : completed + 1;
  return (
    <div className="lane-steps" aria-label={`第 ${current} / 13 步`}>
      {STEP_COLORS.map((color, index) => {
        const number = index + 1;
        const reached = number <= completed;
        const now = number === current && completed < 13;
        return (
          <span
            key={number}
            style={reached
              ? { background: color, borderColor: color, color: "#fff" }
              : { borderColor: color, color, fontWeight: now ? 700 : 400 }}
            title={`第 ${number} 步`}
          >
            {number}
          </span>
        );
      })}
    </div>
  );
}

function LaneStatus({ step, unfinished }) {
  const completed = Number(step) || 0;
  if (completed >= 13) return <p className="lane-done">该泳道13步全部完成</p>;
  if (unfinished) return <p className="lane-alert">未完成 · 红色预警</p>;
  const current = completed + 1;
  return (
    <>
      <StepRail step={completed} />
      <p className="meta">第 {current} / 13 步</p>
    </>
  );
}

function LaneLinks({ storeId, accounting, calendar, onOpen, lastDone }) {
  return (
    <>
      {lastDone ? <p className="lane-done">完成上月泳道</p> : null}
      <div className="lane-links">
        <button type="button" className="linkish" onClick={() => onOpen(storeId, accounting)}>上月这条泳道</button>
        <button type="button" className="linkish" onClick={() => onOpen(storeId, calendar)}>当月这条泳道</button>
      </div>
    </>
  );
}

function RedQueue({ data, period, stores, onOpen }) {
  const ids = new Set(stores.map((store) => store.id));
  const rows = data.alerts.filter((alert) => alert.level === "red" && inMonth(alert, period) && ids.has(alert.store_id));
  return (
    <section className="panel" id="red-queue">
      <h3>红色预警</h3>
      {rows.length === 0 ? <p className="meta">这个月没有未完成的泳道。</p> : (
        <table>
          <thead><tr><th>店铺</th><th>维度</th><th>说明</th></tr></thead>
          <tbody>
            {rows.map((alert) => {
              const store = data.stores.find((item) => item.id === alert.store_id);
              return (
                <tr key={alert.id}>
                  <td><button type="button" className="linkish" onClick={() => onOpen(alert.store_id, period)}>{store?.name || alert.store_id}</button></td>
                  <td><span className="tag red">{alert.dimension}</span></td>
                  <td>{alert.message}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Home({ data, period, months, accounting, calendar, onPeriod, onOpen, onPreview }) {
  const [query, setQuery] = useState("");
  const shown = data.stores.filter((store) => matchesStore(store, query));
  const payable = data.bills.filter((bill) => inMonth(bill, period)).reduce((sum, bill) => sum + Number(bill.payable || 0), 0);
  const reds = data.alerts.filter((alert) => alert.level === "red" && inMonth(alert, period)).length;
  const diffs = data.reconciliations.filter((row) => row.status === "DIFFERENCE" && inMonth(row, period)).length;
  return (
    <>
      <h2>从签约到收账，按泳道往下走</h2>
      <p className="lede">
        拓展上传合同，系统抽出条款并等人复核，然后生成店铺和租金规则。营运补上活动，系统用 DW 销售按流程图算出应付租金和预警。财务收下商场账单，对出差异，再生成付款申请。数据写在 Microsoft Access 文件里。页面默认停在上月。当月每家店从泳道第 1 步开始，13 步都列在店里。4 月到上月按 3 月的正常水平做了样本，走完的只标绿色完成。没有走完的店放在红色预警队列里。
      </p>
      <div className="kpis">
        <div className="kpi"><strong>{data.stores.length}</strong><span>在册店铺</span></div>
        <div className="kpi"><strong>{money(payable)}</strong><span>{sameMonth(period, accounting) ? "上月" : `${period.month}月`}系统应付租金</span></div>
        <div className="kpi"><strong>{reds}</strong><span>红色预警</span></div>
        <div className="kpi"><strong>{diffs}</strong><span>未对齐的对账</span></div>
      </div>
      <div className="row">
        <input id="home-filter" value={query} placeholder={FILTER_PLACEHOLDER} onChange={(event) => setQuery(event.target.value)} style={{ maxWidth: 320 }} />
        <span className="meta">显示 {shown.length} / {data.stores.length} 家</span>
        <MonthHistory months={months} selected={period} accounting={accounting} calendar={calendar} onPeriod={onPeriod} />
      </div>
      <RedQueue data={data} period={period} stores={shown} onOpen={onOpen} />
      <div className="grid">
        {shown.map((store) => {
          const step = laneStep(data, store.id, period);
          return (
            <article className="card" key={store.id} onMouseEnter={() => onPreview(store.id)}>
              <span className="tag">{store.region} · {store.city}</span>
              <h3>{store.name}</h3>
              <p className="meta">{store.store_type || "精品店"} · {store.mall_name} · {store.keep_decision || "待评估"}</p>
              {store.address ? <p className="meta">{store.address}</p> : null}
              <LaneStatus step={step} unfinished={laneUnfinished(data, store.id, period)} />
              <LaneLinks
                storeId={store.id}
                accounting={accounting}
                calendar={calendar}
                onOpen={onOpen}
                lastDone={laneStep(data, store.id, accounting) >= 13}
              />
            </article>
          );
        })}
      </div>
    </>
  );
}

function Stores({ data, period, months, accounting, calendar, onPeriod, role, onOpen, onPreview, onRun, api, busyId }) {
  const [query, setQuery] = useState("");
  const shown = data.stores.filter((store) => matchesStore(store, query));
  return (
    <>
      <h2>店览</h2>
      <p className="lede">
        52 家大陆 Max Mara 主品牌店。附件里写了店名、地址、电话和旗舰类型的，按附件写入；其余地址和电话来自品牌门店名录。名录实际分布在 33 个城市。首都、大兴、白云和首都 T2 这四个机场柜台没有放进来，海口在名录里只有美兰机场，所以保留。没有合同原件的租金、面积和月销售按城市级别估算。前滩太古里附件没有电话，电话留空。
      </p>
      <div className="row">
        <input id="store-filter" value={query} placeholder={FILTER_PLACEHOLDER} onChange={(event) => setQuery(event.target.value)} style={{ maxWidth: 320 }} />
        <span className="meta">显示 {shown.length} / {data.stores.length} 家</span>
        <MonthHistory months={months} selected={period} accounting={accounting} calendar={calendar} onPeriod={onPeriod} />
      </div>
      <div className="panel" style={{ overflowX: "auto" }}>
        <table className="store-directory">
          <thead>
            <tr>
              {["品牌", "店铺", "区域", "城市", "业主", "租约到期", "动作", `${period.month}月销售`, "应付租金", "租售比", "步骤"].map((name) => (
                <th key={name} className={name === "店铺" ? "col-store" : name === "步骤" ? "col-step" : undefined}>{name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((store) => {
              const bill = data.bills.find((item) => item.store_id === store.id && inMonth(item, period));
              const sales = data.sales.find((item) => item.store_id === store.id && inMonth(item, period));
              const step = laneStep(data, store.id, period);
              return (
                <tr key={store.id} onMouseEnter={() => onPreview(store.id)}>
                  <td>{store.brand}</td>
                  <td className="col-store">
                    <button className="linkish" onClick={() => onOpen(store.id)}>{store.name}</button>
                    <div className="meta">{store.store_type || "精品店"} · {store.listed_from || "样本"} · {store.hours || ""}</div>
                    <div className="meta">{store.address || ""}</div>
                    <div className="meta">{store.phone || "电话未提供"}</div>
                  </td>
                  <td>{store.region}</td>
                  <td>{store.city}</td>
                  <td>{store.landlord}</td>
                  <td>{store.lease_end}</td>
                  <td>
                    <Action id={`decision-${store.id}`} busyId={busyId} pending="正在保存动作">
                      <select
                        id={`decision-${store.id}`}
                        value={store.keep_decision || "待评估"}
                        onChange={(event) => onRun(
                          () => api.decision(store.id, { keepDecision: event.target.value, actionPlan: store.action_plan }),
                          `decision-${store.id}`,
                        )}
                        disabled={(role !== "ops" && role !== "executive") || Boolean(busyId)}
                      >
                        {["待评估", "Keep", "Keep & Renovate", "Keep & Relocate", "Close"].map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </Action>
                  </td>
                  <td className="num">{sales ? money(sales.sales) : "—"}</td>
                  <td className="num">{bill ? money(bill.payable) : "—"}</td>
                  <td className="num">{bill?.rent_to_sales ? `${(Number(bill.rent_to_sales) * 100).toFixed(1)}%` : "—"}</td>
                  <td className="col-step">{step >= 13 ? <span className="lane-done">该泳道13步全部完成</span> : laneUnfinished(data, store.id, period) ? <span className="lane-alert">未完成 · 红色预警</span> : (step ? `进行到第 ${step} 步` : "—")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ContractDesk({ api, onRun, onOpen, busyId }) {
  const [imported, setImported] = useState(null);
  const [draft, setDraft] = useState(null);
  const [edits, setEdits] = useState({});
  const fileRef = useRef(null);

  function takeImport(result) {
    setImported(result);
    setDraft(null);
    setEdits({});
  }

  async function importChosen(file) {
    const contentBase64 = await readBase64(file);
    takeImport(await api.importFile(file.name, contentBase64));
  }

  const text = imported?.text || "";

  return (
    <>
      <h2>1–4　上传合同，复核，生成档案</h2>
      <p className="lede">拓展部按这个顺序办理：原件进入本机文件柜（对应 MinIO），Word / PDF 取出文字作为导入结果（扫描件留给本机 PaddleOCR），再点提取关键字（对应本机 Qwen，合同不出这台电脑），人工确认后才生成店铺档案。</p>
      <ol className="pipe">
        <li className={imported ? "done" : "now"}>导入合同</li>
        <li className={imported ? "done" : ""}>导入结果</li>
        <li className={draft ? "done" : imported ? "now" : ""}>提取关键字</li>
        <li className={draft ? "now" : ""}>人工确认</li>
      </ol>
      <div className="panel">
        <input
          ref={fileRef}
          className="file-input"
          type="file"
          accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            onRun(() => importChosen(file), "import-contract");
          }}
        />
        <div className="row">
          <Action id="import-contract" busyId={busyId} pending="正在导入合同">
            <button id="import-contract" className="button" disabled={Boolean(busyId)} onClick={() => fileRef.current?.click()}>导入合同</button>
          </Action>
          <Action id="import-docx" busyId={busyId} pending="正在导入示例 Word">
            <button id="import-docx" className="ghost" disabled={Boolean(busyId)} onClick={() => onRun(async () => takeImport(await api.importSample("docx")), "import-docx")}>导入示例 Word</button>
          </Action>
          <Action id="import-pdf" busyId={busyId} pending="正在导入示例 PDF">
            <button id="import-pdf" className="ghost" disabled={Boolean(busyId)} onClick={() => onRun(async () => takeImport(await api.importSample("pdf")), "import-pdf")}>导入示例 PDF</button>
          </Action>
        </div>
      </div>
      {imported ? (
        <div className="panel" style={{ marginTop: 14 }}>
          <h3>导入结果</h3>
          <p className="meta">{imported.filename} · {imported.reader} · 原件在 {imported.cabinet}/{imported.storedAs}</p>
          {text ? (
            <textarea id="import-result" value={text} onChange={(event) => setImported({ ...imported, text: event.target.value })} />
          ) : (
            <p className="lede">这份文件没有文字层。本机演示不把扫描件送出电脑。接上 PaddleOCR 之后，才能在这里看到识别结果。</p>
          )}
          <div className="row">
            <Action id="extract-keywords" busyId={busyId} pending="正在提取关键字">
              <button id="extract-keywords" className="button" disabled={!text.trim() || Boolean(busyId)} onClick={() => onRun(async () => {
                const parsed = await api.upload(text);
                setDraft(parsed);
                setEdits(Object.fromEntries(parsed.fields.map((field) => [field.field_name, field.field_value])));
              }, "extract-keywords")}>提取关键字</button>
            </Action>
          </div>
        </div>
      ) : null}
      {draft ? (
        <div className="panel" style={{ marginTop: 14 }}>
          <h3>关键字 · 请人工确认 · 置信度 {Math.round(draft.confidence * 100)}%</h3>
          <div className="fields">
            {draft.fields.map((field) => (
              <div className="field" key={field.field_name}>
                <label>{field.label}{field.needs_review ? <small>　待复核</small> : null}</label>
                <input value={edits[field.field_name] ?? ""} onChange={(event) => setEdits({ ...edits, [field.field_name]: event.target.value })} />
              </div>
            ))}
          </div>
          <div className="row">
            <Action id="confirm-contract" busyId={busyId} pending="正在生成店铺档案">
              <button id="confirm-contract" className="button" disabled={Boolean(busyId)} onClick={async () => {
                const result = await onRun(() => api.confirm(draft.contractId, edits), "confirm-contract");
                if (result?.storeId) onOpen(result.storeId);
              }}>确认并生成店铺档案</button>
            </Action>
          </div>
        </div>
      ) : null}
    </>
  );
}

function readBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Journey({ data, storeId, period, accounting, calendar, onOpen, role, api, onRun, busyId }) {
  const store = data.stores.find((item) => item.id === storeId);
  const step = laneStep(data, storeId, period);
  const currentLane = sameMonth(period, data.period);
  const futureLane = monthIndex(period) > monthIndex(data.period);
  const bill = data.bills.find((item) => item.store_id === storeId && inMonth(item, period));
  const alerts = data.alerts.filter((item) => item.store_id === storeId && inMonth(item, period));
  const recon = data.reconciliations.find((item) => item.store_id === storeId && inMonth(item, period));
  const payment = data.payments.find((item) => item.store_id === storeId && inMonth(item, period));
  const [activityNote, setActivityNote] = useState("本月无特殊活动");
  const [tempRate, setTempRate] = useState("");
  const [subsidy, setSubsidy] = useState("0");
  const [reason, setReason] = useState("商场固定租金与合同不一致");
  const [mall, setMall] = useState({
    base_rent: "", commission_rent: "0", property_fee: "", promo_fee: "", utility_fee: "", card_fee: "0", advance_fee: "0", total: "",
  });

  if (!store) return <p>请从首页选择一家店。</p>;
  const next = step + 1;

  return (
    <div className="work">
      {Number(step) < 13 ? (
      <ol className="steps">
        {data.steps.map((item) => {
          const color = STEP_COLORS[item.step - 1];
          const reached = item.step <= step;
          return (
            <li key={item.step} className={item.step < next ? "done" : item.step === next ? "now" : ""}>
              <span
                className="dot"
                style={reached
                  ? { background: color, borderColor: color, color: "#fff" }
                  : { borderColor: color, color }}
              >{item.step}</span>
              <span>
                {item.title}
                <br />
                <small>{ACTOR[item.from]} → {ACTOR[item.to]}</small>
              </span>
            </li>
          );
        })}
      </ol>
      ) : null}
      <section className="panel">
        <span className="tag">{store.mall_name}</span>
        <h2>{store.name}</h2>
        <p className="meta">{[store.store_type, store.province, store.city, store.phone, store.hours].filter(Boolean).join(" · ")}</p>
        {store.address ? <p className="meta">{store.address}</p> : null}
        {store.data_note ? <p className="meta">{store.data_note}</p> : null}
        <p className="meta">{currentLane ? "下一步只能由泳道上的部门提交。" : futureLane ? "当月从第 1 步开始，共 13 步。结账仍看上月。" : "这是历史月份，只可查看。"}</p>
        <LaneStatus step={step} unfinished={laneUnfinished(data, storeId, period)} />
        <LaneLinks storeId={store.id} accounting={accounting} calendar={calendar} onOpen={onOpen} lastDone={laneStep(data, storeId, accounting) >= 13} />

        {currentLane && next === 5 ? (
          <form onSubmit={(event) => { event.preventDefault(); onRun(() => api.activity(store.id, { activityNote, tempRate, subsidy }), "save-activity"); }}>
            <h3>5　录入当月活动</h3>
            <label htmlFor="activity-note">特殊活动</label>
            <input id="activity-note" value={activityNote} onChange={(event) => setActivityNote(event.target.value)} />
            <label htmlFor="temp-rate">临时提点（小数，留空表示沿用合同）</label>
            <input id="temp-rate" value={tempRate} onChange={(event) => setTempRate(event.target.value)} placeholder="留空沿用合同" />
            <label htmlFor="subsidy">补贴</label>
            <input id="subsidy" value={subsidy} onChange={(event) => setSubsidy(event.target.value)} />
            <div className="row">
              <Action id="save-activity" busyId={busyId} pending="正在写入当月活动">
                <button id="save-activity" className="button" type="submit" disabled={role !== "ops" || Boolean(busyId)}>提交给系统</button>
              </Action>
            </div>
            {role !== "ops" ? <p className="meta">这一步由营运部提交。请先切换右上角身份。</p> : null}
          </form>
        ) : null}

        {currentLane && (next === 6 || next === 7) ? (
          <div>
            <h3>6–7　接收 DW 销售并计算</h3>
            <p className="lede">系统读取本月 DW 销售，按免租、两者取高、附加费、补贴、增值税的顺序出账，并把距保底过大写成预警。</p>
            <div className="row">
              <Action id="calculate-rent" busyId={busyId} pending="正在计算租金">
                <button id="calculate-rent" className="button" disabled={(role !== "ops" && role !== "finance") || Boolean(busyId)} onClick={() => onRun(() => api.calculate(store.id), "calculate-rent")}>计算本月租金</button>
              </Action>
            </div>
          </div>
        ) : null}

        {bill && step >= 7 ? <BillTrace bill={bill} alerts={alerts} /> : null}

        {currentLane && next === 8 ? (
          <div>
            <h3>8　商场对账单已送到财务</h3>
            <div className="row">
              <Action id="mall-received" busyId={busyId} pending="正在登记收妥">
                <button id="mall-received" className="button" disabled={role !== "finance" || Boolean(busyId)} onClick={() => onRun(() => api.mallReceived(store.id), "mall-received")}>登记收妥</button>
              </Action>
            </div>
          </div>
        ) : null}

        {currentLane && next >= 9 && next <= 11 ? (
          <form onSubmit={(event) => { event.preventDefault(); onRun(() => api.reconcile(store.id, mall), "reconcile"); }}>
            <h3>9–11　上传商场账单并自动比对</h3>
            {["base_rent", "commission_rent", "property_fee", "promo_fee", "utility_fee", "card_fee", "advance_fee", "total"].map((key) => (
              <div key={key}>
                <label>{{
                  base_rent: "基础租金",
                  commission_rent: "扣点租金",
                  property_fee: "物业费",
                  promo_fee: "推广费",
                  utility_fee: "水电费",
                  card_fee: "刷卡手续费",
                  advance_fee: "商场代垫",
                  total: "商场合计",
                }[key]}</label>
                <input value={mall[key]} onChange={(event) => setMall({ ...mall, [key]: event.target.value })} />
              </div>
            ))}
            <div className="row">
              <Action id="reconcile" busyId={busyId} pending="正在比对账单">
                <button id="reconcile" className="button" type="submit" disabled={role !== "finance" || Boolean(busyId)}>比对</button>
              </Action>
            </div>
          </form>
        ) : null}

        {recon && step >= 11 ? <Recon recon={recon} /> : null}

        {currentLane && next === 12 ? (
          <div>
            <h3>12　确认无误，或发差异函</h3>
            <label>原因</label>
            <input value={reason} onChange={(event) => setReason(event.target.value)} />
            <div className="row">
              <Action id="resolve-accept" busyId={busyId} pending="正在确认账单">
                <button id="resolve-accept" className="button" disabled={role !== "finance" || Boolean(busyId)} onClick={() => onRun(() => api.resolve(store.id, { resolution: "accept", reason }), "resolve-accept")}>确认无误</button>
              </Action>
              <Action id="resolve-dispute" busyId={busyId} pending="正在生成差异函">
                <button id="resolve-dispute" className="ghost" disabled={role !== "finance" || Boolean(busyId)} onClick={() => onRun(() => api.resolve(store.id, { resolution: "dispute", reason }), "resolve-dispute")}>发起申诉</button>
              </Action>
            </div>
          </div>
        ) : null}

        {currentLane && next === 13 ? (
          <div>
            <h3>13　生成付款申请</h3>
            <div className="row">
              <Action id="create-payment" busyId={busyId} pending="正在生成付款申请">
                <button id="create-payment" className="button" disabled={role !== "finance" || Boolean(busyId)} onClick={() => onRun(() => api.payment(store.id), "create-payment")}>按系统金额生成付款申请</button>
              </Action>
            </div>
          </div>
        ) : null}

        {payment ? <p className="ok" style={{ marginTop: 14 }}>付款申请 {money(payment.amount)} 元，状态 {payment.status}。</p> : null}
        {currentLane && next < 5 ? <p className="meta">本月泳道还停在合同阶段。已有档案的店，从第 5 步录入活动。</p> : null}
      </section>
    </div>
  );
}

function BillTrace({ bill, alerts }) {
  const trace = Array.isArray(bill.trace) ? bill.trace : [];
  return (
    <div style={{ marginTop: 16 }}>
      <h3>租金计算过程</h3>
      <p className="meta">应付 {money(bill.payable)} 元　租售比 {bill.rent_to_sales ? `${(Number(bill.rent_to_sales) * 100).toFixed(1)}%` : "—"}</p>
      {alerts.map((alert) => (
        <p key={alert.id} style={{ marginTop: 8 }}><span className={`tag ${alert.level}`}>{alert.level}</span> {alert.message}</p>
      ))}
      <ol className="flow">
        {trace.map((item) => (
          <li key={item.node}>
            <strong>{item.node}</strong>
            {item.decision}　<em>{item.detail}</em>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Recon({ recon }) {
  const lines = Array.isArray(recon.lines) ? recon.lines : [];
  return (
    <div style={{ marginTop: 16 }}>
      <h3>差异明细</h3>
      <p className="meta">系统 {money(recon.system_total)}　商场 {money(recon.mall_total)}　差额 {money(recon.diff_amount)}</p>
      <table>
        <thead><tr><th>项目</th><th>系统</th><th>商场</th><th>差额</th></tr></thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.name}>
              <td>{line.name}</td>
              <td className="num">{money(line.system)}</td>
              <td className="num">{money(line.mall)}</td>
              <td className={Math.abs(line.diff) >= 0.01 ? "num diff" : "num"}>{money(line.diff)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {recon.letter ? <pre className="letter">{recon.letter}</pre> : null}
    </div>
  );
}
