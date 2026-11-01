import { useEffect, useState } from "react";
import { Action, WaitingCopy } from "./Action.jsx";
import { money } from "./api.js";

const MATRIX = [
  ["两者取高（主流）", "MAX(固定租金, 销售额×扣点)", "80%以上的购物中心"],
  ["保底+超额提成", "保底租金 + MAX(0, (销售额−保底线)×超额扣点)", "高流量核心商圈"],
  ["阶梯扣点", "按销售额区间适用不同扣点率", "鼓励做高销售的商场"],
  ["封顶扣点", "MIN(销售额×扣点, 封顶金额)", "保护商户利益的优惠条款"],
];

const MODELS = [
  ["HIGHER_OF_TWO", "两者取高"],
  ["BASE_PLUS_OVERAGE", "保底+超额提成"],
  ["TIERED", "阶梯扣点"],
  ["CAPPED", "封顶扣点"],
  ["LOWER_OF_TWO", "两者取低"],
  ["FIXED_ONLY", "纯固定"],
  ["COMMISSION_ONLY", "纯扣点"],
];

const ALERT_MATRIX = [
  ["利润状态", "连续3月亏损", "单月亏损", "利润率环比下滑>20%"],
  ["租售比", "租售比 > 30%", "租售比 25%–30%", "租售比 20%–25%"],
  ["保底达成", "预测达成率 < 80%", "预测达成率 80%–90%", "时间进度超前销售进度10%"],
];

const EMPTY_RENT = {
  sales: "500000",
  fixedRent: "80000",
  rate: "18",
  propertyFee: "12000",
  model: "HIGHER_OF_TWO",
  minSales: "400000",
  overageRate: "25",
  capAmount: "100000",
  tier1: "300000",
  rate1: "12",
  tier2: "600000",
  rate2: "15",
  rate3: "18",
};

const EMPTY_FORECAST = {
  dailySales: "20000",
  ticket: "2800",
  margin: "62",
  model: "HIGHER_OF_TWO",
  fixedRent: "80000",
  rate: "18",
  propertyFee: "12000",
  headcount: "8",
  salary: "8000",
  reno: "1800000",
  equip: "400000",
  amortMonths: "36",
  days: "30",
};

function percent(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function Level({ level, children }) {
  return <span className={`tag ${level || ""}`}>{children}</span>;
}

function useDesk(api, period) {
  const [desk, setDesk] = useState(null);
  const [error, setError] = useState("");
  const key = period ? `${period.year}-${period.month}` : "";
  useEffect(() => {
    let stop = false;
    setDesk(null);
    api.desk(period || null)
      .then((body) => {
        if (!stop) setDesk(body);
      })
      .catch((err) => {
        if (!stop) setError(err.message);
      });
    return () => {
      stop = true;
    };
  }, [api, key]);
  return { desk, error };
}

export function RentPage({ api, onRun, busyId }) {
  const [form, setForm] = useState(EMPTY_RENT);
  const [result, setResult] = useState(null);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setResult(null);
  }

  const payload = {
    ...form,
    tiers: [
      { upTo: form.tier1, rate: form.rate1 },
      { upTo: form.tier2, rate: form.rate2 },
      { upTo: null, rate: form.rate3 },
    ],
  };

  return (
    <section id="page-rent">
      <h2>5.3 租金与提点计算引擎</h2>
      <p className="lede">
        四种商场租金模型用同一套月结引擎试算。下面这个计算器只加附加物业费，不含增值税、推广费和水电费。月结泳道仍按合同计税。
      </p>
      <div className="panel" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>模型</th>
              <th>计算公式</th>
              <th>应用场景</th>
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((row) => (
              <tr key={row[0]}>
                {row.map((cell) => <td key={cell}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="calc">
        <h3>交互演示：租金计算器</h3>
        <label htmlFor="rent-model">租金模型</label>
        <select id="rent-model" value={form.model} onChange={(event) => set("model", event.target.value)}>
          {MODELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <div className="calc-fields">
          <Field id="rent-sales" label="当月实际销售额" unit="元" value={form.sales} onChange={(value) => set("sales", value)} />
          <Field id="rent-fixed" label="合同固定租金" unit="元/月" value={form.fixedRent} onChange={(value) => set("fixedRent", value)} />
          <Field id="rent-rate" label="商场扣点比例" unit="%" value={form.rate} onChange={(value) => set("rate", value)} />
          <Field id="rent-property" label="附加物业费" unit="元/月" value={form.propertyFee} onChange={(value) => set("propertyFee", value)} />
          {form.model === "BASE_PLUS_OVERAGE" ? (
            <>
              <Field id="rent-min" label="保底销售额" unit="元" value={form.minSales} onChange={(value) => set("minSales", value)} />
              <Field id="rent-overage" label="超额扣点" unit="%" value={form.overageRate} onChange={(value) => set("overageRate", value)} />
            </>
          ) : null}
          {form.model === "CAPPED" ? (
            <Field id="rent-cap" label="封顶金额" unit="元" value={form.capAmount} onChange={(value) => set("capAmount", value)} />
          ) : null}
        </div>
        {form.model === "TIERED" ? (
          <div className="calc-fields">
            <Field id="tier-1" label="第一档上限" unit="元" value={form.tier1} onChange={(value) => set("tier1", value)} />
            <Field id="tier-rate-1" label="第一档扣点" unit="%" value={form.rate1} onChange={(value) => set("rate1", value)} />
            <Field id="tier-2" label="第二档上限" unit="元" value={form.tier2} onChange={(value) => set("tier2", value)} />
            <Field id="tier-rate-2" label="第二档扣点" unit="%" value={form.rate2} onChange={(value) => set("rate2", value)} />
            <Field id="tier-rate-3" label="以上扣点" unit="%" value={form.rate3} onChange={(value) => set("rate3", value)} />
          </div>
        ) : null}
        <p className="meta">填 18 表示 18%。这个演示的应付 = 模型租金 + 物业费。</p>
        <div className="row">
          <Action id="rent-calc" busyId={busyId} pending="正在计算当月应付租金">
            <button
              id="rent-calc"
              className="button"
              disabled={Boolean(busyId)}
              onClick={() => onRun(async () => {
                const next = await api.previewRent(payload);
                setResult(next);
                return next;
              }, "rent-calc")}
            >
              计算当月应付租金
            </button>
          </Action>
        </div>
        {result ? (
          <div className="result" id="rent-result">
            <strong id="rent-payable">{money(result.payable)}</strong>
            <span>当月应付租金（元）</span>
            <p id="rent-formula">{result.formula}</p>
            <p className="meta">扣点租金 {money(result.commissionRent)} · 模型租金 {money(result.baseRent)} · 物业 {money(result.property)} · 增值税 {money(result.vat)}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Field({ id, label, unit, value, onChange }) {
  return (
    <div className="calc-row">
      <label htmlFor={id}>{label}</label>
      <input id={id} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} />
      <span>{unit}</span>
    </div>
  );
}

export function ForecastPage({ api, onRun, busyId }) {
  const [form, setForm] = useState(EMPTY_FORECAST);
  const [result, setResult] = useState(null);
  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setResult(null);
  }
  return (
    <section id="page-forecast">
      <h2>5.4 新开店铺盈利能力预测</h2>
      <p className="lede">
        立项时填预估日销、客单价、毛利率、租金模型和投入。系统按月结引擎算租金，再给出月度损益、静态回收期、盈亏平衡日销和年化 IRR。销售额下降 10%、20% 会各算一次。
      </p>
      <div className="calc">
        <div className="calc-fields">
          <Field id="fc-daily" label="预估日均销售" unit="元" value={form.dailySales} onChange={(value) => set("dailySales", value)} />
          <Field id="fc-ticket" label="客单价" unit="元" value={form.ticket} onChange={(value) => set("ticket", value)} />
          <Field id="fc-margin" label="毛利率" unit="%" value={form.margin} onChange={(value) => set("margin", value)} />
          <Field id="fc-fixed" label="固定租金" unit="元/月" value={form.fixedRent} onChange={(value) => set("fixedRent", value)} />
          <Field id="fc-rate" label="扣点比例" unit="%" value={form.rate} onChange={(value) => set("rate", value)} />
          <Field id="fc-property" label="物业费" unit="元/月" value={form.propertyFee} onChange={(value) => set("propertyFee", value)} />
          <Field id="fc-head" label="人员编制" unit="人" value={form.headcount} onChange={(value) => set("headcount", value)} />
          <Field id="fc-salary" label="人均月薪" unit="元" value={form.salary} onChange={(value) => set("salary", value)} />
          <Field id="fc-reno" label="装修总包" unit="元" value={form.reno} onChange={(value) => set("reno", value)} />
          <Field id="fc-equip" label="设备采购" unit="元" value={form.equip} onChange={(value) => set("equip", value)} />
          <Field id="fc-amort" label="摊销月数" unit="月" value={form.amortMonths} onChange={(value) => set("amortMonths", value)} />
          <Field id="fc-days" label="每月天数" unit="天" value={form.days} onChange={(value) => set("days", value)} />
        </div>
        <label htmlFor="fc-model">租金模型</label>
        <select id="fc-model" value={form.model} onChange={(event) => set("model", event.target.value)}>
          {MODELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <div className="row">
          <Action id="forecast-calc" busyId={busyId} pending="正在测算盈利能力">
            <button
              id="forecast-calc"
              className="button"
              disabled={Boolean(busyId)}
              onClick={() => onRun(async () => {
                const next = await api.forecast(form);
                setResult(next);
                return next;
              }, "forecast-calc")}
            >
              测算盈利能力
            </button>
          </Action>
        </div>
        {result ? (
          <div id="forecast-result">
            <div className="kpis">
              <div className="kpi"><strong id="forecast-profit">{money(result.profit)}</strong><span>月净利润</span></div>
              <div className="kpi"><strong id="forecast-payback">{result.paybackText}</strong><span>静态投资回收期</span></div>
              <div className="kpi"><strong id="forecast-breakeven">{result.breakEvenText}</strong><span>盈亏平衡日均销售</span></div>
              <div className="kpi"><strong id="forecast-irr">{result.irrText}</strong><span>年化 IRR</span></div>
            </div>
            <table>
              <tbody>
                <tr><th>月销售额</th><td className="num">{money(result.sales)}</td></tr>
                <tr><th>月客单笔数</th><td className="num">{result.tickets == null ? "—" : result.tickets}</td></tr>
                <tr><th>毛利</th><td className="num">{money(result.gross)}</td></tr>
                <tr><th>租金（含物业，不含税）</th><td className="num">{money(result.rent)}</td></tr>
                <tr><th>人工</th><td className="num">{money(result.staff)}</td></tr>
                <tr><th>装修和设备摊销</th><td className="num">{money(result.amort)}</td></tr>
                <tr><th>净利润</th><td className="num">{money(result.profit)}</td></tr>
                <tr><th>净利率</th><td className="num">{percent(result.netMargin)}</td></tr>
              </tbody>
            </table>
            <h3>敏感性</h3>
            <table>
              <thead>
                <tr><th>情景</th><th>月销售</th><th>月净利润</th><th>是否依然盈利</th></tr>
              </thead>
              <tbody>
                {result.sensitivity.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className="num">{money(row.sales)}</td>
                    <td className="num">{money(row.profit)}</td>
                    <td>{row.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function matchesDesk(row, query) {
  if (!query.trim()) return true;
  const blob = [row.region, row.city, row.name, row.mall, row.phone].filter(Boolean).join(" ");
  return blob.toLowerCase().includes(query.trim().toLowerCase());
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function rollupDesk(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    if (row.missing) continue;
    const name = row[key] || "未填";
    const current = groups.get(name) || { name, sales: 0, netRent: 0, payable: 0 };
    current.sales += Number(row.sales) || 0;
    current.netRent += Number(row.netRent) || 0;
    current.payable += Number(row.payable) || 0;
    groups.set(name, current);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    ratio: group.sales > 0 ? group.netRent / group.sales : null,
  }));
}

function summarizeGeo(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (row.missing || row.sales == null) continue;
    const region = row.region || "未填区域";
    const city = row.city || "未填城市";
    const key = `${region} / ${city}`;
    const current = groups.get(key) || { label: key, region, city, stores: 0, sales: 0, profit: 0, weighted: 0 };
    const sales = Number(row.sales) || 0;
    const profit = Number(row.profit) || 0;
    current.stores += 1;
    current.sales += sales;
    current.profit += profit;
    current.weighted += profit * sales;
    groups.set(key, current);
  }
  const geo = [...groups.values()].map((group) => ({
    label: group.label,
    region: group.region,
    city: group.city,
    stores: group.stores,
    sales: round2(group.sales),
    weightedAverageProfit: group.sales > 0 ? round2(group.weighted / group.sales) : null,
    weightedNetProfit: round2(group.profit),
  })).sort((left, right) => left.label.localeCompare(right.label, "zh"));
  const sales = [...groups.values()].reduce((sum, group) => sum + group.sales, 0);
  const weighted = [...groups.values()].reduce((sum, group) => sum + group.weighted, 0);
  const profit = [...groups.values()].reduce((sum, group) => sum + group.profit, 0);
  return {
    geo,
    summary: {
      regions: new Set(geo.map((group) => group.region)).size,
      cities: new Set(geo.map((group) => group.city)).size,
      weightedAverageProfit: sales > 0 ? round2(weighted / sales) : null,
      weightedNetProfit: round2(profit),
    },
  };
}

export function MonitorPage({ api, period, months, accounting, calendar, onPeriod, MonthHistory }) {
  const { desk, error } = useDesk(api, period);
  const [query, setQuery] = useState("");
  const shown = (desk?.monitor || []).filter((row) => matchesDesk(row, query));
  return (
    <section id="page-monitor">
      <h2>5.6 营业中店铺每日监控与预警</h2>
      <p className="lede">
        观察日定在 2026-03-20，时间进度按 20/31。销售用的是所选月份的月结数，不是当日流水。DW 日数据还没有接进来。页面默认停在上月。预警标签用绿色。
      </p>
      {error ? <div className="error">{error}</div> : null}
      {!desk ? <p><WaitingCopy text="正在读取店铺" active /></p> : (
        <>
          <div className="row">
            <input id="monitor-filter" value={query} placeholder="按区域、城市、店名、商场、电话筛选" onChange={(event) => setQuery(event.target.value)} style={{ maxWidth: 320 }} />
            <span className="meta">显示 {shown.length} / {desk.monitor.length} 家</span>
            {MonthHistory ? <MonthHistory months={months} selected={period} accounting={accounting} calendar={calendar} onPeriod={onPeriod} /> : null}
          </div>
          <p className="meta">{desk.marginNote}</p>
          <p className="meta">{desk.brdNote}</p>
          <p className="meta">{desk.historyNote}</p>
          <div className="panel" style={{ overflowX: "auto", marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>预警维度</th>
                  <th>红色（严重）</th>
                  <th>橙色（警告）</th>
                  <th>黄色（关注）</th>
                </tr>
              </thead>
              <tbody>
                {ALERT_MATRIX.map((row) => (
                  <tr key={row[0]}>
                    <td>{row[0]}</td>
                    <td><Level level="green">{row[1]}</Level></td>
                    <td><Level level="orange">{row[2]}</Level></td>
                    <td><Level level="yellow">{row[3]}</Level></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel" style={{ overflowX: "auto", marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  {["店铺", "商场", "销售", "应付租金", "租售比", "估算利润", "达成率", "预警"].map((name) => <th key={name}>{name}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.storeId}>
                    <td>{row.name}</td>
                    <td>{row.mall}</td>
                    <td className="num">{row.sales == null ? "—" : money(row.sales)}</td>
                    <td className="num">{row.payable == null ? "—" : money(row.payable)}</td>
                    <td className="num">{percent(row.rentToSales)}</td>
                    <td className="num">{row.profit == null ? "—" : money(row.profit)}</td>
                    <td className="num">{percent(row.achievement)}</td>
                    <td>
                      {row.alerts?.length ? row.alerts.map((alert) => (
                        <span key={alert.message} style={{ display: "block", marginBottom: 4 }}>
                          <Level level={alert.level === "red" ? "green" : alert.level}>{alert.dimension}</Level> {alert.message}
                        </span>
                      )) : <Level>正常</Level>}
                      {row.notes?.map((note) => <span key={note} className="meta" style={{ display: "block" }}>{note}</span>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export function CockpitPage({ api, period, months, accounting, calendar, onPeriod, MonthHistory }) {
  const { desk, error } = useDesk(api, period);
  const [query, setQuery] = useState("");
  const shown = (desk?.monitor || []).filter((row) => matchesDesk(row, query));
  const shownIds = new Set(shown.map((row) => row.storeId));
  const geoView = summarizeGeo(shown);
  const mallBars = rollupDesk(shown, "mall");
  const regionBars = rollupDesk(shown, "region");
  return (
    <section id="page-cockpit">
      <h2>5.8 多维报表与管理驾驶舱</h2>
      <p className="lede">给区域经理、财务、营运总监、拓展和高管看同一套账期的数。区域和城市合在一列，利润按销售额加权。页面默认停在上月。</p>
      {error ? <div className="error">{error}</div> : null}
      {!desk ? <p><WaitingCopy text="正在汇总报表" active /></p> : (
        <>
          <h3>区域 / 城市</h3>
          <p className="meta">适用角色：区域经理 / 财务 / 高管。平均加权利润 = Σ(店铺净利润 × 店铺销售额) / Σ销售额。加权净利润 = Σ店铺净利润。毛利仍按销售额的 55% 估算。</p>
          <div className="row">
            <input id="cockpit-filter" value={query} placeholder="按区域、城市、店名、商场、电话筛选" onChange={(event) => setQuery(event.target.value)} style={{ maxWidth: 320 }} />
            <span className="meta">显示 {shown.length} / {desk.monitor.length} 家</span>
            {MonthHistory ? <MonthHistory months={months} selected={period} accounting={accounting} calendar={calendar} onPeriod={onPeriod} /> : null}
          </div>
          <div className="kpis">
            <div className="kpi"><strong>{geoView.summary.regions} / {geoView.summary.cities}</strong><span>区域 / 城市</span></div>
            <div className="kpi"><strong>{geoView.geo.length ? (geoView.summary.weightedAverageProfit == null ? "—" : money(geoView.summary.weightedAverageProfit)) : "—"}</strong><span>平均加权利润</span></div>
            <div className="kpi"><strong>{geoView.geo.length ? money(geoView.summary.weightedNetProfit) : "—"}</strong><span>加权净利润</span></div>
          </div>
          {geoView.geo.length === 0 ? <p className="meta">这个月还没有销售。结账数字看上月。</p> : null}
          <div className="panel" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  {["区域/城市", "店铺数", "销售额", "平均加权利润", "加权净利润"].map((name) => <th key={name}>{name}</th>)}
                </tr>
              </thead>
              <tbody>
                {geoView.geo.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className="num">{row.stores}</td>
                    <td className="num">{money(row.sales)}</td>
                    <td className="num">{row.weightedAverageProfit == null ? "—" : money(row.weightedAverageProfit)}</td>
                    <td className="num">{money(row.weightedNetProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>单店损益表</h3>
          <p className="meta">适用角色：区域经理 / 财务。{desk.marginNote}</p>
          <div className="panel" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  {["店铺", "收入", "毛利", "租金", "净利润", "净利率"].map((name) => <th key={name}>{name}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.filter((row) => !row.missing).map((row) => (
                  <tr key={row.storeId}>
                    <td>{row.name}</td>
                    <td className="num">{money(row.sales)}</td>
                    <td className="num">{money(row.gross)}</td>
                    <td className="num">{money(row.payable)}</td>
                    <td className="num">{money(row.profit)}</td>
                    <td className="num">{percent(row.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>店铺健康度排行榜</h3>
          <p className="meta">适用角色：高管 / 营运总监。综合分是销售、利润、坪效三项的相对位置，各项同等。人效要人事编制，这里空着，不计入分数。红榜是综合分最高的前 20%，而且综合分至少 50。黑榜是综合分最低的后 20%，不看分数线。</p>
          <div className="panel" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  {["榜", "店铺", "综合分", "销售", "利润", "坪效", "人效"].map((name) => <th key={name}>{name}</th>)}
                </tr>
              </thead>
              <tbody>
                {desk.ranking.filter((row) => shownIds.has(row.storeId)).map((row) => (
                  <tr key={row.storeId}>
                    <td>{row.board ? <Level level={row.board === "红榜" ? "red" : "yellow"}>{row.board}</Level> : "—"}</td>
                    <td>{row.name}</td>
                    <td className="num">{row.score}</td>
                    <td className="num">{money(row.sales)}</td>
                    <td className="num">{money(row.profit)}</td>
                    <td className="num">{row.productivity == null ? "—" : money(row.productivity)}</td>
                    <td>—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>租金成本占比</h3>
          <p className="meta">适用角色：财务 / 拓展。{desk.historyNote} 占比 = 不含税租金 / 销售额。</p>
          <div className="bars">
            {mallBars.map((row) => (
              <div key={`mall-${row.name}`}>
                <span>{row.name}</span>
                <div className="bar-track"><div className="bar" style={{ width: `${Math.min(100, (row.ratio || 0) * 100)}%` }} /></div>
                <strong>{percent(row.ratio)}</strong>
              </div>
            ))}
            {regionBars.map((row) => (
              <div key={`region-${row.name}`}>
                <span>{row.name}</span>
                <div className="bar-track"><div className="bar" style={{ width: `${Math.min(100, (row.ratio || 0) * 100)}%` }} /></div>
                <strong>{percent(row.ratio)}</strong>
              </div>
            ))}
          </div>

          <h3>闭店 / 续租决策评估</h3>
          <p className="meta">适用角色：高管 / 拓展。到期前 6 个月才自动标出。违约金按 3 个月固定租金估算，不是合同条款。</p>
          <div className="panel" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  {["店铺", "租约结束", "剩余月数", "估算违约金", "当月利润", "建议"].map((name) => <th key={name}>{name}</th>)}
                </tr>
              </thead>
              <tbody>
                {desk.lease.filter((row) => shownIds.has(row.storeId)).map((row) => (
                  <tr key={row.storeId}>
                    <td>{row.name}</td>
                    <td>{row.leaseEnd || "—"}</td>
                    <td className="num">{row.monthsLeft == null ? "—" : row.monthsLeft}</td>
                    <td className="num">{money(row.penalty)}</td>
                    <td className="num">{row.monthlyProfit == null ? "—" : money(row.monthlyProfit)}</td>
                    <td>{row.advice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>商场贡献度</h3>
          <p className="meta">适用角色：拓展 / 高管。商场总销售未知，所以不能算我方在该商场的销售占比。下表是我方在各商场的销售额和应付租金。</p>
          <div className="panel" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  {["商场", "我方销售", "我方应付租金", "商场总销售"].map((name) => <th key={name}>{name}</th>)}
                </tr>
              </thead>
              <tbody>
                {mallBars.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td className="num">{money(row.sales)}</td>
                    <td className="num">{money(row.payable)}</td>
                    <td>未知</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
