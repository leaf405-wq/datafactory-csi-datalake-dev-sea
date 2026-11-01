import assert from "node:assert/strict";
import { Module } from "node:module";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../miniprogram");

function loadCjs(filename) {
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(readFileSync(filename, "utf8"), filename);
  return mod.exports;
}

const view = loadCjs(path.join(root, "utils/view.js"));

function store(id, name, extra = {}) {
  return {
    id,
    name,
    brand: "Max Mara",
    region: "华东",
    city: "上海",
    mall_name: "商场",
    store_type: "精品店",
    listed_from: "附件",
    lifecycle_start: "2026-03-01",
    phone: "021-0000",
    address: "地址",
    keep_decision: "待评估",
    ...extra,
  };
}

function snapshot() {
  const stores = [
    store("st-sanya", "三亚海棠湾店", { region: "华南", city: "三亚", mall_name: "海棠湾" }),
    store("st-sanlitun", "北京三里屯太古里精品店", { region: "华北", city: "北京", mall_name: "三里屯太古里" }),
    store("st-taikoo", "广州太古汇店", { region: "华南", city: "广州", mall_name: "太古汇" }),
    store("st-houtan", "上海后滩太古里店", {
      mall_name: "后滩太古里",
      listed_from: "新签",
      lifecycle_start: "2026-11-01",
    }),
  ];
  for (let index = 0; index < 49; index += 1) {
    stores.push(store(`st-${index}`, `样本店${index}`));
  }
  const journey = [];
  const alerts = [];
  for (const item of stores) {
    if (item.id === "st-houtan") {
      journey.push({ store_id: item.id, year: 2026, month: 11, step: 4 });
      continue;
    }
    for (let month = 3; month <= 8; month += 1) journey.push({ store_id: item.id, year: 2026, month, step: 13 });
    journey.push({ store_id: item.id, year: 2026, month: 11, step: 4 });
  }
  const parked = { "st-sanya": 9, "st-sanlitun": 10, "st-taikoo": 11 };
  for (const month of [9, 10]) {
    for (const item of stores) {
      if (item.id === "st-houtan") continue;
      const step = parked[item.id] || 13;
      journey.push({ store_id: item.id, year: 2026, month, step });
      if (parked[item.id]) {
        alerts.push({
          id: `al-${item.id}-${month}`,
          store_id: item.id,
          year: 2026,
          month,
          level: "red",
          dimension: "泳道",
          message: `停留在第 ${step + 1} 步，计入红色预警。`,
        });
      }
    }
  }
  alerts.push({
    id: "al-other",
    store_id: "st-sanya",
    year: 2026,
    month: 10,
    level: "red",
    dimension: "租售比",
    message: "不计入首页红色预警。",
  });
  return {
    period: { year: 2026, month: 10 },
    stores,
    journey,
    alerts,
    bills: [],
    sales: [],
    reconciliations: [],
    payments: [],
    steps: [{ step: 5, title: "录入当月活动", from: "ops", to: "system" }],
  };
}

test("小程序账期按上海时区，后滩开业月之前不计入在营", () => {
  assert.deepEqual(view.calendarMonth(new Date("2026-10-31T16:30:00Z")), { year: 2026, month: 11 });
  assert.deepEqual(view.calendarMonth(new Date("2026-10-31T15:00:00Z")), { year: 2026, month: 10 });
  const houtan = { lifecycle_start: "2026-11-01" };
  assert.equal(view.operatingIn(houtan, { year: 2026, month: 10 }), false);
  assert.equal(view.operatingIn(houtan, { year: 2026, month: 11 }), true);
  assert.equal(view.operatingIn({ lifecycleStart: "2026-11-01" }, { year: 2026, month: 4 }), false);
});

test("泳道第 13 步显示完成，停在 9/10/11 步显示 10/11/12 并带红色预警", () => {
  assert.equal(view.laneView(13, false).text, "已完成13步泳道");
  assert.equal(view.laneView(13, true).done, true);
  assert.deepEqual([9, 10, 11].map((step) => view.laneView(step, true).stepText), [
    "第 10 / 13 步 · 红色预警",
    "第 11 / 13 步 · 红色预警",
    "第 12 / 13 步 · 红色预警",
  ]);
  assert.equal(view.laneView(4, false).text, "第 5 / 13 步");
});

test("首页 10 月是 52/53 且红色预警只数泳道，11 月含后滩是 53/53", () => {
  const data = snapshot();
  const october = view.homeModel(data, { year: 2026, month: 10 }, "");
  assert.equal(october.countText, "显示 52 / 53 家");
  assert.equal(october.reds, 3);
  assert.equal(october.queue.length, 3);
  assert.equal(october.cards.some((card) => card.id === "st-houtan"), false);
  const sanya = october.cards.find((card) => card.id === "st-sanya");
  assert.equal(sanya.lane.text, "第 10 / 13 步");
  assert.equal(sanya.lane.alert, true);
  const april = view.homeModel(data, { year: 2026, month: 4 }, "");
  assert.equal(april.cards.every((card) => card.lane.done), true);
  assert.equal(april.reds, 0);
  const november = view.homeModel(data, { year: 2026, month: 11 }, "后滩");
  assert.equal(november.countText, "显示 1 / 53 家");
  assert.equal(november.cards[0].lane.text, "第 5 / 13 步");
  const allNovember = view.homeModel(data, { year: 2026, month: 11 }, "");
  assert.equal(allNovember.countText, "显示 53 / 53 家");
});

test("月份标签把结账月标成上月，把日历月标成当月，选中 4 月打开 4 月", () => {
  const accounting = { year: 2026, month: 10 };
  const calendar = { year: 2026, month: 11 };
  assert.equal(view.monthChipLabel(accounting, accounting, calendar), "上月");
  assert.equal(view.monthChipLabel(calendar, accounting, calendar), "当月");
  assert.equal(view.monthChipLabel({ year: 2026, month: 4 }, accounting, calendar), "2026年4月");
  const data = snapshot();
  const ctx = view.buildContext(data, { year: 2026, month: 4 });
  assert.equal(ctx.headline, "账期 2026年4月");
  if (view.monthIndex(ctx.calendar) >= view.monthIndex({ year: 2026, month: 4 })) {
    assert.equal(ctx.chips.find((chip) => chip.key === "2026-4").active, true);
  }
  const stores = view.storesModel(data, ctx.viewed, "", "ops");
  assert.equal(stores.rows.every((row) => row.stepText === "已完成13步泳道"), true);
  assert.equal(stores.canDecide, true);
});

test("泳道页用商场名，不覆盖账单表单字段", () => {
  const data = snapshot();
  const model = view.journeyModel(data, "st-houtan", { year: 2026, month: 11 }, { year: 2026, month: 11 });
  assert.equal(model.mallName, "后滩太古里");
  assert.equal(Object.hasOwn(model, "mall"), false);
  assert.equal(model.showActivity, true);
  assert.equal(model.lane.text, "第 5 / 13 步");
  const finished = view.journeyModel(data, "st-sanya", { year: 2026, month: 4 }, { year: 2026, month: 11 });
  assert.equal(finished.lane.text, "已完成13步泳道");
  assert.match(finished.hint, /2026年4月/);
});

test("每日预警把红色严重标签改成绿色，驾驶舱排行和闭店跟着在营店走", () => {
  const desk = {
    marginNote: "毛利按 55%",
    brdNote: "月结仍用 BRD",
    historyNote: "历史",
    monitor: [
      {
        storeId: "st-sanya",
        name: "三亚海棠湾店",
        mall: "海棠湾",
        region: "华南",
        city: "三亚",
        lifecycleStart: "2026-03-01",
        sales: 100,
        payable: 20,
        netRent: 20,
        profit: 35,
        gross: 55,
        margin: 0.35,
        productivity: 10,
        rentToSales: 0.2,
        achievement: 0.9,
        alerts: [{ level: "red", dimension: "租售比", message: "严重" }],
        notes: [],
      },
      {
        storeId: "st-houtan",
        name: "上海后滩太古里店",
        mall: "后滩太古里",
        region: "华东",
        city: "上海",
        lifecycleStart: "2026-11-01",
        missing: true,
        sales: null,
        alerts: [],
        notes: [],
      },
    ],
    ranking: [
      { storeId: "st-sanya", name: "三亚海棠湾店", board: "红榜", score: 80, sales: 100, profit: 35, productivity: 10 },
      { storeId: "st-houtan", name: "上海后滩太古里店", board: "黑榜", score: 10, sales: 1, profit: 0, productivity: 1 },
    ],
    lease: [
      { storeId: "st-sanya", name: "三亚海棠湾店", leaseEnd: "2026-12-01", monthsLeft: 2, penalty: 3000, monthlyProfit: 35, advice: "到期" },
      { storeId: "st-houtan", name: "上海后滩太古里店", leaseEnd: "2031-10-01", monthsLeft: 60, penalty: 0, monthlyProfit: null, advice: "新店" },
    ],
  };
  const october = { year: 2026, month: 10 };
  const monitor = view.monitorModel(desk, october, "");
  assert.equal(monitor.rows.length, 1);
  assert.equal(monitor.rows[0].alerts[0].level, "green");
  const cockpit = view.cockpitModel(desk, october, "");
  assert.deepEqual(cockpit.ranking.map((row) => row.storeId), ["st-sanya"]);
  assert.equal(cockpit.ranking[0].boardClass, "red");
  assert.deepEqual(cockpit.lease.map((row) => row.storeId), ["st-sanya"]);
  const november = view.cockpitModel(desk, { year: 2026, month: 11 }, "后滩");
  assert.equal(november.ranking[0].storeId, "st-houtan");
  assert.equal(november.ranking[0].boardClass, "yellow");
  assert.equal(view.money(1234.5), "1,234.50");
  assert.equal(view.percent(0.2), "20.0%");
});

test("小程序页面文件能通过语法检查，并且每页都有 wxml", () => {
  const app = JSON.parse(readFileSync(path.join(root, "app.json"), "utf8"));
  const files = [];
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".js")) files.push(full);
    }
  }
  walk(root);
  for (const file of files) {
    const checked = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    assert.equal(checked.status, 0, `${file}\n${checked.stderr}`);
  }
  for (const page of app.pages) {
    assert.equal(statSync(path.join(root, `${page}.wxml`)).isFile(), true);
    assert.equal(statSync(path.join(root, `${page}.js`)).isFile(), true);
    const json = JSON.parse(readFileSync(path.join(root, `${page}.json`), "utf8"));
    assert.equal(json.usingComponents.chrome, "/components/chrome/chrome");
  }
  const project = JSON.parse(readFileSync(path.join(root, "project.config.json"), "utf8"));
  assert.equal(project.setting.urlCheck, false);
  assert.equal(project.appid, "touristappid");
  assert.equal(project.projectname, "maxmara-store-ops");
  const rootProject = JSON.parse(readFileSync(path.resolve(root, "../project.config.json"), "utf8"));
  assert.equal(rootProject.miniprogramRoot, "miniprogram/");
  assert.equal(rootProject.setting.urlCheck, false);
});
