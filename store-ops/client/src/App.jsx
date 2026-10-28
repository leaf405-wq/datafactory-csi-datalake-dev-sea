import { useEffect, useMemo, useRef, useState } from "react";
import { createApi, money } from "./api.js";

const ROLES = [
  { id: "expansion", label: "拓展部", actor: "拓展专员" },
  { id: "ops", label: "营运部", actor: "营运经理" },
  { id: "finance", label: "财务部", actor: "财务专员" },
  { id: "executive", label: "高管", actor: "区域负责人" },
];

const ACTOR = {
  expansion: "拓展部",
  ops: "营运部",
  finance: "财务部",
  mall: "商场方",
  system: "系统",
};

const BUSY_HOLD_MS = 700;

export default function App() {
  const [role, setRole] = useState("expansion");
  const [page, setPage] = useState("home");
  const [storeId, setStoreId] = useState("");
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

  function openStore(id) {
    setStoreId(id);
    setPage("journey");
  }

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <small>Web 4.0 · 账期 {data ? `${data.period.year}年${data.period.month}月` : ""}</small>
          <h1>零售经营系统</h1>
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
          <button className={page === "home" ? "active" : "ghost"} onClick={() => setPage("home")}>经营首页</button>
          <button className={page === "contract" ? "active" : "ghost"} onClick={() => setPage("contract")}>新签合同</button>
          <button className={page === "stores" ? "active" : "ghost"} onClick={() => setPage("stores")}>店览宽表</button>
          <p className="meta" style={{ marginTop: 18 }}>
            当前身份 {actor}。泳道里的每一步只接受对应部门的操作，顺序不能跳。
          </p>
        </aside>
        <main className="main">
          {error ? <div className="error">{error}</div> : null}
          {!data ? <p>{error ? "接口恢复后会自动再打开 Access 数据库。" : "正在打开 Access 数据库…"}</p> : null}
          {data && page === "home" ? <Home data={data} onOpen={openStore} /> : null}
          {data && page === "stores" ? (
            <Stores data={data} role={role} onOpen={openStore} onRun={run} api={api} busyId={busyId} />
          ) : null}
          {data && page === "contract" ? <ContractDesk api={api} onRun={run} onOpen={openStore} busyId={busyId} /> : null}
          {data && page === "journey" ? (
            <Journey data={data} storeId={storeId} role={role} api={api} onRun={run} busyId={busyId} />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function Home({ data, onOpen }) {
  const payable = data.bills.reduce((sum, bill) => sum + Number(bill.payable || 0), 0);
  const reds = data.alerts.filter((alert) => alert.level === "red").length;
  const diffs = data.reconciliations.filter((row) => row.status === "DIFFERENCE").length;
  return (
    <>
      <h2>从签约到收账，按泳道往下走</h2>
      <p className="lede">
        拓展上传合同，系统抽出条款并等人复核，然后生成店铺和租金规则。营运补上当月活动，系统用 DW 销售按流程图算出应付租金和预警。财务收下商场账单，对出差异，再生成付款申请。数据写在 Microsoft Access 文件里。
      </p>
      <div className="kpis">
        <div className="kpi"><strong>{data.stores.length}</strong><span>在册店铺</span></div>
        <div className="kpi"><strong>{money(payable)}</strong><span>本月系统应付租金</span></div>
        <div className="kpi"><strong>{reds}</strong><span>红色预警</span></div>
        <div className="kpi"><strong>{diffs}</strong><span>未对齐的对账</span></div>
      </div>
      <div className="grid">
        {data.stores.map((store) => {
          const step = data.journey.find((item) => item.store_id === store.id)?.step || 0;
          const title = data.steps.find((item) => item.step === step)?.title || "尚未开始";
          return (
            <article className="card" key={store.id}>
              <span className="tag">{store.region} · {store.city}</span>
              <h3>{store.name}</h3>
              <p className="meta">{store.mall_name} · {store.keep_decision || "待评估"}</p>
              <p style={{ margin: "10px 0" }}>进行到第 {step} 步：{title}</p>
              <button className="linkish" onClick={() => onOpen(store.id)}>继续这条泳道</button>
            </article>
          );
        })}
      </div>
    </>
  );
}

function Action({ id, busyId, pending, children }) {
  const waiting = busyId === id;
  return (
    <span className={waiting ? "action is-busy" : "action"}>
      {children}
      <label className="action-status" htmlFor={id} aria-hidden={waiting ? "false" : "true"}>
        <span>
          <progress />
          {pending}
        </span>
      </label>
    </span>
  );
}

function Stores({ data, role, onOpen, onRun, api, busyId }) {
  return (
    <>
      <h2>店览</h2>
      <p className="lede">一行一家店。销售来自 DW，应付租金和租售比来自租金引擎，续租动作由营运或高管填写。</p>
      <div className="panel" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              {["品牌", "店铺", "区域", "城市", "业主", "租约到期", "动作", "3月销售", "应付租金", "租售比", "步骤"].map((name) => (
                <th key={name}>{name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.stores.map((store) => {
              const bill = data.bills.find((item) => item.store_id === store.id);
              const sales = data.sales.find((item) => item.store_id === store.id);
              const step = data.journey.find((item) => item.store_id === store.id)?.step || 0;
              return (
                <tr key={store.id}>
                  <td>{store.brand}</td>
                  <td><button className="linkish" onClick={() => onOpen(store.id)}>{store.name}</button></td>
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
                  <td>{step}/13</td>
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
  const [text, setText] = useState("");
  const [draft, setDraft] = useState(null);
  const [edits, setEdits] = useState({});

  return (
    <>
      <h2>1–4　上传合同，复核，生成档案</h2>
      <p className="lede">拓展部上传合同。系统立刻抽出编号、租期、免租、保底、扣点和费用。低置信度字段标出来，确认后才写入店铺和租金规则。</p>
      <div className="panel">
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="把合同关键条款粘贴在这里" />
        <div className="row">
          <Action id="load-sample" busyId={busyId} pending="正在载入示例">
            <button id="load-sample" className="ghost" disabled={Boolean(busyId)} onClick={() => onRun(async () => setText((await api.sample()).text), "load-sample")}>载入示例合同</button>
          </Action>
          <Action id="upload-contract" busyId={busyId} pending="正在抽取条款">
            <button id="upload-contract" className="button" disabled={Boolean(busyId)} onClick={() => onRun(async () => {
              const parsed = await api.upload(text);
              setDraft(parsed);
              setEdits(Object.fromEntries(parsed.fields.map((field) => [field.field_name, field.field_value])));
            }, "upload-contract")}>上传并抽取条款</button>
          </Action>
        </div>
      </div>
      {draft ? (
        <div className="panel" style={{ marginTop: 14 }}>
          <h3>抽取结果 · 置信度 {Math.round(draft.confidence * 100)}%</h3>
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

function Journey({ data, storeId, role, api, onRun, busyId }) {
  const store = data.stores.find((item) => item.id === storeId);
  const step = data.journey.find((item) => item.store_id === storeId)?.step || 0;
  const bill = data.bills.find((item) => item.store_id === storeId);
  const alerts = data.alerts.filter((item) => item.store_id === storeId);
  const recon = data.reconciliations.find((item) => item.store_id === storeId);
  const payment = data.payments.find((item) => item.store_id === storeId);
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
      <ol className="steps">
        {data.steps.map((item) => (
          <li key={item.step} className={item.step < next ? "done" : item.step === next ? "now" : ""}>
            <span className="dot">{item.step}</span>
            <span>
              {item.title}
              <br />
              <small>{ACTOR[item.from]} → {ACTOR[item.to]}</small>
            </span>
          </li>
        ))}
      </ol>
      <section className="panel">
        <span className="tag">{store.mall_name}</span>
        <h2>{store.name}</h2>
        <p className="meta">第 {step} / 13 步已完成。下一步只能由泳道上的部门提交。</p>

        {next === 5 ? (
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

        {next === 6 || next === 7 ? (
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

        {next === 8 ? (
          <div>
            <h3>8　商场对账单已送到财务</h3>
            <div className="row">
              <Action id="mall-received" busyId={busyId} pending="正在登记收妥">
                <button id="mall-received" className="button" disabled={role !== "finance" || Boolean(busyId)} onClick={() => onRun(() => api.mallReceived(store.id), "mall-received")}>登记收妥</button>
              </Action>
            </div>
          </div>
        ) : null}

        {next >= 9 && next <= 11 ? (
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

        {next === 12 ? (
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

        {next === 13 ? (
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
        {step >= 13 ? <p className="ok" style={{ marginTop: 14 }}>这条泳道本月已走完。</p> : null}
        {next > 13 ? null : next < 5 ? <p className="meta">合同档案已经生成。请把身份切到营运部，录入第 5 步。</p> : null}
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
