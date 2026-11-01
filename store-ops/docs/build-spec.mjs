import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const excelCandidates = [
  "exceljs",
  "/tmp/xlsx-tools/node_modules/exceljs/excel.js",
];
let ExcelJS;
for (const candidate of excelCandidates) {
  try {
    const loaded = candidate.startsWith("/")
      ? await import(pathToFileURL(candidate).href)
      : await import(candidate);
    ExcelJS = loaded.default;
    break;
  } catch {
    // try the next location
  }
}
if (!ExcelJS) throw new Error("需要 exceljs。可执行 npm install exceljs@4.4.0 后再运行 node docs/build-spec.mjs");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const OUT_SPEC = path.join(root, "MaxMara经营管理式样书.xlsx");
const OUT_MANUAL = path.join(root, "MaxMara角色操作手册.xlsx");

const NAVY = "1F4E79";
const INK = "1A1A1A";
const CREAM = "F7F1E8";
const LINE = "D9D0C3";
const GOLD = "8C6A3D";
const RED = "8C2F2F";
const GREEN = "1F6B45";

const SPEC_ID = "MM-OPS-SPEC-001";
const MAN_ID = "MM-OPS-MAN-001";
const VER = "1.0";
const DATE = "2026-11-01";

function book(title) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MaxMara经营管理式样";
  wb.created = new Date("2026-11-01T12:00:00Z");
  wb.modified = new Date("2026-11-01T12:00:00Z");
  wb.title = title;
  wb.subject = "画面仕様書・テーブル定義書・操作マニュアル";
  return wb;
}

function font(size, bold, color) {
  return { name: "Calibri", size, bold: Boolean(bold), color: { argb: color || "FF1A1A1A" } };
}

function fill(hex) {
  return { type: "pattern", pattern: "solid", fgColor: { argb: `FF${hex}` } };
}

function border() {
  const edge = { style: "thin", color: { argb: `FF${LINE}` } };
  return { top: edge, left: edge, bottom: edge, right: edge };
}

function paint(cell, value, style) {
  cell.value = value;
  cell.font = font(style.size || 11, style.bold, style.color);
  cell.alignment = { vertical: "top", wrapText: true, horizontal: style.align || "left" };
  if (style.fill) cell.fill = fill(style.fill);
  if (style.border !== false) cell.border = border();
}

function cover(wb, meta) {
  const ws = wb.addWorksheet("00_表纸", { properties: { tabColor: { argb: "FF1A1A1A" } }, views: [{ showGridLines: false }] });
  ws.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 88;
  ws.getRow(1).height = 18;
  paint(ws.getCell("A2"), meta.docId, { size: 14, bold: true, color: "FFFFFFFF", fill: INK, border: false });
  paint(ws.getCell("B2"), meta.kind, { size: 14, bold: true, color: "FFFFFFFF", fill: INK, border: false });
  ws.mergeCells("A4:B4");
  paint(ws.getCell("A4"), meta.title, { size: 22, bold: true, color: "FF1A1A1A", border: false });
  ws.getRow(4).height = 32;
  ws.mergeCells("A5:B5");
  paint(ws.getCell("A5"), meta.subtitle, { size: 14, color: `FF${GOLD}`, border: false });
  const rows = [
    ["文书编号（文書番号）", meta.docId],
    ["文书种类（文書種別）", meta.kind],
    ["版数（版）", VER],
    ["做成日（作成日）", DATE],
    ["做成依据", "store-ops 实现、Microsoft Access 文件 data/storeops.accdb、画面 http://127.0.0.1:5173"],
    ["适用对象", meta.audience],
    ["记述基准", "按日本 SI 的画面项目定义书、表定义书、处理式样书、操作手顺书的粒度书写。正文用中文，与画面用语一致。"],
    ["机密区分", "社内。演示数据，不作为正式会计凭证。"],
    ["关联文书", meta.related],
    ["承认栏", "做成：式样整理　　确认：　　　　承认："],
  ];
  rows.forEach((pair, index) => {
    const row = 7 + index;
    ws.getRow(row).height = 28;
    paint(ws.getCell(row, 1), pair[0], { bold: true, fill: CREAM });
    paint(ws.getCell(row, 2), pair[1], {});
  });
  ws.getRow(16).height = 36;
  paint(ws.getCell("A17"), "阅读顺序", { bold: true, fill: CREAM });
  paint(ws.getCell("B17"), meta.order, {});
  ws.getRow(17).height = 48;
}

function history(wb, docId, changes) {
  const ws = grid(wb, "01_修订履历", ["版数", "日期", "区分", "变更内容", "影响范围", "做成", "确认", "承认"], [12, 16, 14, 70, 36, 16, 16, 16]);
  changes.forEach((row) => ws.addRow([row[0], row[1], row[2], row[3], row[4], "式样整理", "", ""]));
  finish(ws);
  ws.getCell("A1").note = `${docId} 的改订履历。承认栏留给使用部门填写。`;
}

function grid(wb, name, headers, widths) {
  const ws = wb.addWorksheet(name, {
    properties: { tabColor: { argb: "FF1F4E79" } },
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
    pageSetup: {
      paperSize: 8,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
    },
    headerFooter: {
      oddHeader: `&L${name}&R${VER}`,
      oddFooter: "&L社内&C&P / &N&R2026-11-01",
    },
  });
  ws.addRow(headers);
  widths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });
  return ws;
}

function finish(ws) {
  const header = ws.getRow(1);
  header.height = 32;
  header.eachCell((cell) => {
    cell.font = font(10, true, "FFFFFFFF");
    cell.fill = fill(NAVY);
    cell.alignment = { vertical: "middle", wrapText: true, horizontal: "center" };
    cell.border = border();
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  ws.eachRow((row, index) => {
    if (index === 1) return;
    row.height = Math.max(32, row.height || 32);
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > ws.columnCount) return;
      cell.font = font(10, false);
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = border();
      if (index % 2 === 0 && !cell.fill?.fgColor) cell.fill = fill("FFFBF8F3");
    });
  });
  ws.pageSetup.printTitlesRow = "1:1";
}

function add(ws, rows) {
  rows.forEach((row) => ws.addRow(row));
  finish(ws);
}

function toc(wb, entries) {
  const ws = wb.addWorksheet("02_目录", { views: [{ showGridLines: false }] });
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 36;
  ws.getColumn(3).width = 78;
  paint(ws.getCell("A1"), "No", { bold: true, color: "FFFFFFFF", fill: NAVY });
  paint(ws.getCell("B1"), "工作表", { bold: true, color: "FFFFFFFF", fill: NAVY });
  paint(ws.getCell("C1"), "内容", { bold: true, color: "FFFFFFFF", fill: NAVY });
  entries.forEach((entry, index) => {
    const row = index + 2;
    paint(ws.getCell(row, 1), index + 1, { align: "center" });
    const cell = ws.getCell(row, 2);
    cell.value = { text: entry[0], hyperlink: `#'${entry[0]}'!A1` };
    cell.font = { name: "Calibri", size: 11, color: { argb: "FF1F4E79" }, underline: true };
    cell.alignment = { vertical: "middle" };
    cell.border = border();
    paint(ws.getCell(row, 3), entry[1], {});
    ws.getRow(row).height = 24;
  });
}

const TABLES = [
  ["TBL-01", "stores", "店铺主档", "1 店 1 行。经营主体。新签确认后才插入。"],
  ["TBL-02", "store_photos", "门店照片", "实景图。stores.photo_id 指向本表 id。图片本体在 content。"],
  ["TBL-03", "contracts", "租赁合同", "抽取后 status=EXTRACTED，确认后 EFFECTIVE 并回写 store_id。"],
  ["TBL-04", "contract_fields", "合同抽取字段", "人工复核的一行一个字段。确认时按编辑值回写。"],
  ["TBL-05", "monthly_inputs", "当月活动输入", "第 5 步。一家店一个月一行。"],
  ["TBL-06", "sales_monthly", "月销售", "DW 或样本。租金计算只读，不在泳道里手工改。"],
  ["TBL-07", "rent_bills", "系统租金账单", "第 6–7 步计算后覆盖当月旧账单。"],
  ["TBL-08", "alerts", "预警", "月结预警与泳道红色预警共用。首页红色计数只取维度=泳道。"],
  ["TBL-09", "mall_bills", "商场对账单", "第 9 步录入。比对时覆盖当月旧行。"],
  ["TBL-10", "reconciliations", "对账结果", "第 10–12 步。差额、状态、差异函。"],
  ["TBL-11", "payment_requests", "付款申请", "第 13 步。金额取系统应付，不取商场合计。"],
  ["TBL-12", "journey", "泳道进度", "一家店一个月一行。step 是已完成步，不是当前步。"],
  ["TBL-13", "audit_log", "审计日志", "每次写操作追加。画面只取最新 40 条，本画面未单独做审计页。"],
];

const COLS = {
  stores: [
    ["id", "店铺ID", "TEXT", "255", "PK", "否", "", "应用生成。样本店用稳定编码，新签用 UUID。"],
    ["brand", "品牌", "TEXT", "255", "", "是", "", "默认「主品牌」。"],
    ["code", "店铺编码", "TEXT", "255", "", "是", "", "合同编号或名录编码。逻辑上应唯一，库未建唯一索引。"],
    ["name", "店铺名称", "TEXT", "255", "", "是", "", "画面主显示名。"],
    ["region", "区域", "TEXT", "255", "", "是", "CD-REGION", "华东、华南、华北、华中、西南、西北、东北。"],
    ["city", "城市", "TEXT", "255", "", "是", "", "筛选键。"],
    ["mall_name", "商场", "TEXT", "255", "", "是", "", "筛选键，驾驶舱按商场汇总。"],
    ["grade", "城市等级", "TEXT", "255", "", "是", "A/B", "样本估算用。新签确认时写成 B。"],
    ["area_sqm", "计租面积", "DOUBLE", "—", "", "是", "", "平方米。"],
    ["selling_area", "销售面积", "DOUBLE", "—", "", "是", "", "坪效分母。0 时坪效为空。"],
    ["gfa", "建筑面积 GFA", "DOUBLE", "—", "", "是", "", "新签时等于计租面积。画面不单独列出。"],
    ["gla", "可租面积 GLA", "DOUBLE", "—", "", "是", "", "新签时等于销售面积。画面不单独列出。"],
    ["floor", "楼层", "TEXT", "255", "", "是", "", "样本为 1F。"],
    ["status", "经营状态", "TEXT", "255", "", "是", "CD-STATUS", "样本与新签均为 NORMAL_OPERATION。"],
    ["keep_decision", "续租或关店动作", "TEXT", "255", "", "是", "CD-DECISION", "店览下拉。"],
    ["lease_end", "租约结束", "TEXT", "255", "", "是", "YYYY-MM-DD", "闭店评估的结束月。"],
    ["lifecycle_start", "开业月", "TEXT", "255", "", "是", "YYYY-MM-DD", "决定该店从哪个月起出现，以及新签宽限。"],
    ["landlord", "业主", "TEXT", "255", "", "是", "", "店览列。"],
    ["rank", "等级标记", "TEXT", "255", "", "是", "", "样本写 LFL。画面不显示。"],
    ["action_plan", "动作说明", "TEXT", "255", "", "是", "", "与 keep_decision 同时保存。画面未单独展示。"],
    ["province", "省", "TEXT", "255", "", "是", "", "泳道页副标题。"],
    ["address", "地址", "MEMO", "长文本", "", "是", "", "店卡与店览。"],
    ["phone", "电话", "TEXT", "255", "", "是", "", "空则显示「电话未提供」。筛选键。"],
    ["hours", "营业时间", "TEXT", "255", "", "是", "", "店览副行。"],
    ["store_type", "店型", "TEXT", "255", "", "是", "", "旗舰店、精品店。空则显示精品店。"],
    ["listed_from", "来源", "TEXT", "255", "", "是", "CD-LISTED", "新签宽限只认「新签」。"],
    ["data_note", "数据说明", "MEMO", "长文本", "", "是", "", "泳道页说明。"],
    ["photo_id", "照片ID", "TEXT", "255", "", "是", "", "逻辑外键 store_photos.id。无照片则左侧不换图。"],
  ],
  store_photos: [
    ["id", "照片ID", "TEXT", "255", "PK", "否", "", ""],
    ["label", "说明", "TEXT", "255", "", "是", "", ""],
    ["mime", "媒体类型", "TEXT", "255", "", "是", "", "如 image/jpeg。"],
    ["content", "图片本体", "MEMO", "长文本", "", "是", "", "Base64。经 /api/photos/:id 输出，不进快照 JSON。"],
  ],
  contracts: [
    ["id", "合同ID", "TEXT", "255", "PK", "否", "", ""],
    ["store_id", "店铺ID", "TEXT", "255", "", "是", "", "抽取时为空。确认后写入。逻辑外键 stores.id。"],
    ["contract_no", "合同编号", "TEXT", "255", "", "是", "", ""],
    ["status", "状态", "TEXT", "255", "", "是", "CD-CONTRACT", "EXTRACTED 或 EFFECTIVE。"],
    ["raw_text", "合同正文", "MEMO", "长文本", "", "是", "", "导入后的全文。"],
    ["model", "租金模型", "TEXT", "255", "", "是", "CD-MODEL", ""],
    ["fixed_rent", "固定租金", "DOUBLE", "2位小数", "", "是", "", "元/月。"],
    ["rate", "扣点", "DOUBLE", "比率", "", "是", "", "0.11 表示 11%。大于 1 的输入在试算时除以 100。"],
    ["min_sales", "保底销售额", "DOUBLE", "2位小数", "", "是", "", "达成率分母。0 表示不考核保底。"],
    ["min_rent", "保底租金", "DOUBLE", "2位小数", "", "是", "", "抽取时写 0。月结引擎未单独读取。"],
    ["overage_rate", "超额扣点", "DOUBLE", "比率", "", "是", "", "空则沿用 rate。"],
    ["cap_amount", "封顶金额", "DOUBLE", "2位小数", "", "是", "", "封顶模型使用。"],
    ["tiers_json", "阶梯", "MEMO", "JSON", "", "是", "", "[{upTo, rate}]。upTo 空表示以上。"],
    ["rent_free_start", "免租开始", "TEXT", "255", "", "是", "YYYY-MM-DD", "按月比较，不含日。"],
    ["rent_free_end", "免租结束", "TEXT", "255", "", "是", "YYYY-MM-DD", ""],
    ["waive_property", "免租免物业", "LONG", "0/1", "", "是", "0/1", "1 且在免租月时物业费为 0。"],
    ["property_fee", "物业费", "DOUBLE", "2位小数", "", "是", "", ""],
    ["promo_fee", "推广费", "DOUBLE", "2位小数", "", "是", "", "月结计入。租金试算页不加。"],
    ["utility_fee", "水电费", "DOUBLE", "2位小数", "", "是", "", "月结计入。租金试算页不加。"],
    ["vat_rate", "增值税率", "DOUBLE", "比率", "", "是", "", "空按 0.09。试算页强制 0。"],
    ["start_date", "租期开始", "TEXT", "255", "", "是", "YYYY-MM-DD", ""],
    ["end_date", "租期结束", "TEXT", "255", "", "是", "YYYY-MM-DD", ""],
    ["version", "版本", "LONG", "整数", "", "是", "", "抽取时为 1。"],
    ["confidence", "置信度", "DOUBLE", "0–1", "", "是", "", "抽取结果。确认后字段行改为 1。"],
    ["confirmed_by", "确认人", "TEXT", "255", "", "是", "", "确认时写入当前身份。"],
    ["created_at", "做成时刻", "TEXT", "255", "", "是", "YYYY-MM-DD HH:mm:ss", ""],
  ],
  contract_fields: [
    ["id", "字段行ID", "TEXT", "255", "PK", "否", "", ""],
    ["contract_id", "合同ID", "TEXT", "255", "", "是", "", "逻辑外键 contracts.id。"],
    ["field_name", "字段键", "TEXT", "255", "", "是", "CD-FIELD", ""],
    ["field_value", "字段值", "MEMO", "长文本", "", "是", "", "复核页可改。"],
    ["confidence", "置信度", "DOUBLE", "0–1", "", "是", "", "缺项 0.35，齐备 0.97。"],
    ["needs_review", "需复核", "LONG", "0/1", "", "是", "0/1", "缺项为 1。人工改过后为 0。"],
  ],
  monthly_inputs: [
    ["id", "输入ID", "TEXT", "255", "PK", "否", "", ""],
    ["store_id", "店铺ID", "TEXT", "255", "", "是", "", "逻辑外键。"],
    ["year", "年", "LONG", "4", "", "是", "", "与 month 组成业务键。"],
    ["month", "月", "LONG", "1–12", "", "是", "", ""],
    ["activity_note", "活动说明", "MEMO", "长文本", "", "是", "", "空则「本月无特殊活动」。"],
    ["temp_rate", "临时提点", "DOUBLE", "比率", "", "是", "", "空则沿用合同扣点。"],
    ["subsidy", "补贴", "DOUBLE", "2位小数", "", "是", "", "从税前金额扣减，结果不低于 0。"],
    ["created_by", "录入人", "TEXT", "255", "", "是", "", ""],
    ["created_at", "录入时刻", "TEXT", "255", "", "是", "", ""],
  ],
  sales_monthly: [
    ["id", "销售ID", "TEXT", "255", "PK", "否", "", ""],
    ["store_id", "店铺ID", "TEXT", "255", "", "是", "", ""],
    ["year", "年", "LONG", "4", "", "是", "", ""],
    ["month", "月", "LONG", "1–12", "", "是", "", ""],
    ["sales", "销售额", "DOUBLE", "2位小数", "", "是", "", "元。"],
    ["source", "来源", "TEXT", "255", "", "是", "DW/样本估算", ""],
  ],
  rent_bills: [
    ["id", "账单ID", "TEXT", "255", "PK", "否", "", "重算时删旧插新。"],
    ["store_id", "店铺ID", "TEXT", "255", "", "是", "", ""],
    ["year", "年", "LONG", "4", "", "是", "", ""],
    ["month", "月", "LONG", "1–12", "", "是", "", ""],
    ["model", "模型", "TEXT", "255", "", "是", "CD-MODEL", "计算当时的合同模型。"],
    ["in_rent_free", "免租月", "LONG", "0/1", "", "是", "", ""],
    ["sales", "销售额", "DOUBLE", "2位小数", "", "是", "", "无销售行时按 0，并另写数据异常预警。"],
    ["rate", "适用扣点", "DOUBLE", "比率", "", "是", "", "临时提点优先。"],
    ["fixed_rent", "固定租金", "DOUBLE", "2位小数", "", "是", "", ""],
    ["commission_rent", "扣点租金", "DOUBLE", "2位小数", "", "是", "", "Sales × Rate。"],
    ["base_rent", "基础租金", "DOUBLE", "2位小数", "", "是", "", "模型判断结果。对账「租金」的系统侧。"],
    ["surcharge", "附加费合计", "DOUBLE", "2位小数", "", "是", "", "物业+推广+水电。"],
    ["property_fee", "物业费", "DOUBLE", "2位小数", "", "是", "", "免租且免物业时为 0。"],
    ["promo_fee", "推广费", "DOUBLE", "2位小数", "", "是", "", ""],
    ["utility_fee", "水电费", "DOUBLE", "2位小数", "", "是", "", ""],
    ["subsidy", "补贴", "DOUBLE", "2位小数", "", "是", "", ""],
    ["net_before_vat", "税前金额", "DOUBLE", "2位小数", "", "是", "", "MAX(0, 基础+附加−补贴)。租售比分子。"],
    ["vat", "增值税", "DOUBLE", "2位小数", "", "是", "", "税前 × 税率。"],
    ["payable", "应付", "DOUBLE", "2位小数", "", "是", "", "税前+增值税。付款申请取此数。"],
    ["rent_to_sales", "租售比", "DOUBLE", "4位小数", "", "是", "", "销售为 0 时存 0。空比率在引擎里是 null。"],
    ["trace_json", "计算轨迹", "MEMO", "JSON", "", "是", "", "泳道页「租金计算过程」。"],
    ["created_at", "做成时刻", "TEXT", "255", "", "是", "", ""],
  ],
  alerts: [
    ["id", "预警ID", "TEXT", "255", "PK", "否", "", "泳道预警 id 为 al-lane-{店}-{年}-{月}。"],
    ["store_id", "店铺ID", "TEXT", "255", "", "是", "", ""],
    ["year", "年", "LONG", "4", "", "是", "", ""],
    ["month", "月", "LONG", "1–12", "", "是", "", ""],
    ["level", "级别", "TEXT", "255", "", "是", "red/orange/yellow", ""],
    ["dimension", "维度", "TEXT", "255", "", "是", "泳道/保底达成/租售比/数据异常", "首页红数只计「泳道」。"],
    ["message", "说明", "MEMO", "长文本", "", "是", "", ""],
    ["status", "状态", "TEXT", "255", "", "是", "OPEN", "画面不提供关闭操作。"],
  ],
  mall_bills: [
    ["id", "商场账单ID", "TEXT", "255", "PK", "否", "", ""],
    ["store_id", "店铺ID", "TEXT", "255", "", "是", "", ""],
    ["year", "年", "LONG", "4", "", "是", "", ""],
    ["month", "月", "LONG", "1–12", "", "是", "", ""],
    ["base_rent", "基础租金", "DOUBLE", "2位小数", "", "是", "", "与扣点租金相加后对系统基础租金。"],
    ["commission_rent", "扣点租金", "DOUBLE", "2位小数", "", "是", "", ""],
    ["property_fee", "物业费", "DOUBLE", "2位小数", "", "是", "", ""],
    ["promo_fee", "推广费", "DOUBLE", "2位小数", "", "是", "", ""],
    ["utility_fee", "水电费", "DOUBLE", "2位小数", "", "是", "", ""],
    ["card_fee", "刷卡手续费", "DOUBLE", "2位小数", "", "是", "", "系统侧固定为 0。"],
    ["advance_fee", "商场代垫", "DOUBLE", "2位小数", "", "是", "", "系统侧固定为 0。"],
    ["total", "商场合计", "DOUBLE", "2位小数", "", "是", "", "未填时用各行商场金额之和。"],
    ["note", "备注", "MEMO", "长文本", "", "是", "", "画面未提供输入框，写入空。"],
  ],
  reconciliations: [
    ["id", "对账ID", "TEXT", "255", "PK", "否", "", ""],
    ["store_id", "店铺ID", "TEXT", "255", "", "是", "", ""],
    ["year", "年", "LONG", "4", "", "是", "", ""],
    ["month", "月", "LONG", "1–12", "", "是", "", ""],
    ["system_total", "系统合计", "DOUBLE", "2位小数", "", "是", "", "等于 rent_bills.payable。"],
    ["mall_total", "商场合计", "DOUBLE", "2位小数", "", "是", "", ""],
    ["diff_amount", "差额", "DOUBLE", "2位小数", "", "是", "", "商场 − 系统。"],
    ["status", "状态", "TEXT", "255", "", "是", "CD-RECON", ""],
    ["reason", "原因", "TEXT", "255", "", "是", "", "第 12 步填写。"],
    ["letter", "差异函", "MEMO", "长文本", "", "是", "", "有差额时生成。"],
    ["resolution", "处理", "TEXT", "255", "", "是", "accept/dispute", ""],
    ["lines_json", "明细", "MEMO", "JSON", "", "是", "", "项目、系统、商场、差额。"],
  ],
  payment_requests: [
    ["id", "付款申请ID", "TEXT", "255", "PK", "否", "", "同月已有则不重复插入。"],
    ["store_id", "店铺ID", "TEXT", "255", "", "是", "", ""],
    ["year", "年", "LONG", "4", "", "是", "", ""],
    ["month", "月", "LONG", "1–12", "", "是", "", ""],
    ["amount", "金额", "DOUBLE", "2位小数", "", "是", "", "系统应付。申诉后仍按系统金额。"],
    ["status", "状态", "TEXT", "255", "", "是", "PENDING_APPROVAL", "无后续审批画面。"],
    ["created_at", "做成时刻", "TEXT", "255", "", "是", "", ""],
  ],
  journey: [
    ["id", "泳道ID", "TEXT", "255", "PK", "否", "", "{storeId}-{year}-{month}。月不补零。"],
    ["store_id", "店铺ID", "TEXT", "255", "", "是", "", ""],
    ["year", "年", "LONG", "4", "", "是", "", ""],
    ["month", "月", "LONG", "1–12", "", "是", "", ""],
    ["step", "已完成步", "LONG", "0–13", "", "是", "", "画面当前步 = step+1。step≥13 视为完成。"],
    ["updated_at", "更新时刻", "TEXT", "255", "", "是", "", ""],
  ],
  audit_log: [
    ["id", "日志ID", "TEXT", "255", "PK", "否", "", ""],
    ["actor", "操作者", "TEXT", "255", "", "是", "", "请求头 x-actor。"],
    ["role", "角色", "TEXT", "255", "", "是", "CD-ROLE", ""],
    ["action", "动作", "TEXT", "255", "", "是", "", "含一次性迁移「泳道按完成档期」。"],
    ["detail", "明细", "MEMO", "长文本", "", "是", "", ""],
    ["created_at", "时刻", "TEXT", "255", "", "是", "", ""],
  ],
};

function tableRows() {
  const rows = [];
  let n = 1;
  for (const [tableId, physical, logical] of TABLES) {
    COLS[physical].forEach((col, index) => {
      rows.push([
        n,
        tableId,
        logical,
        physical,
        index + 1,
        col[1],
        col[0],
        col[2],
        col[3],
        col[4],
        col[4] === "PK" ? "否" : "是",
        col[5],
        col[6],
        col[7],
      ]);
      n += 1;
    });
  }
  return rows;
}

const SCREEN_ITEMS = [
  ["SCR-00", "共通", "HDR-BRAND", "字标", "页眉左", "O", "—", "图像", "—", "maxmara-wordmark.png", "始终", "不可编辑", "—", "静态资源", "—", "无", "全角色", "替代文字 Max Mara。"],
  ["SCR-00", "共通", "HDR-PERIOD", "账期", "页眉小字", "O", "—", "文本", "—", "上月", "快照返回后", "不可编辑", "—", "选中月。等于会计月加「 · 上月」，等于日历月加「 · 当月」。", "journey/sales/bills 的年月", "D-PERIOD", "全角色", "例：WEB 4.0 · 账期 2026年4月。"],
  ["SCR-00", "共通", "HDR-ROLE", "身份切换", "页眉右", "I", "◎", "按钮组", "4", "拓展部", "始终", "可点", "四选一", "写入后续请求的 x-role 与 x-actor", "—", "D-AUTH", "全角色", "拓展专员、营运经理、财务专员、区域负责人。"],
  ["SCR-00", "共通", "NAV-01", "经营首页", "左导航第1", "I", "—", "按钮", "—", "当前页", "始终", "可点", "—", "切换 SCR-01，不改月份", "—", "—", "全角色", ""],
  ["SCR-00", "共通", "NAV-02", "新签合同", "左导航第2", "I", "—", "按钮", "—", "—", "始终", "可点", "—", "SCR-03", "—", "—", "全角色可看，写操作仅拓展部", ""],
  ["SCR-00", "共通", "NAV-03", "店览宽表", "左导航第3", "I", "—", "按钮", "—", "—", "始终", "可点", "—", "SCR-02", "—", "—", "全角色", ""],
  ["SCR-00", "共通", "NAV-04", "租金引擎", "左导航第4", "I", "—", "按钮", "—", "—", "始终", "可点", "—", "SCR-05", "—", "—", "全角色", "不写 Access。"],
  ["SCR-00", "共通", "NAV-05", "盈利预测", "左导航第5", "I", "—", "按钮", "—", "—", "始终", "可点", "—", "SCR-06", "—", "—", "全角色", "不写 Access。"],
  ["SCR-00", "共通", "NAV-06", "每日预警", "左导航第6", "I", "—", "按钮", "—", "—", "始终", "可点", "—", "SCR-07", "—", "—", "全角色", ""],
  ["SCR-00", "共通", "NAV-07", "管理驾驶舱", "左导航第7", "I", "—", "按钮", "—", "—", "始终", "可点", "—", "SCR-08", "—", "—", "全角色", ""],
  ["SCR-00", "共通", "NAV-PHOTO", "门店实景", "左导航上方", "O", "—", "图像", "—", "三里屯或第一家有图的店", "店铺有 photo_id", "不可编辑", "—", "悬停店卡或打开泳道后换成该店", "stores.photo_id → store_photos", "D-PHOTO", "全角色", ""],
  ["SCR-00", "共通", "NAV-WHO", "当前身份说明", "左导航下方", "O", "—", "文本", "—", "拓展专员", "始终", "不可编辑", "—", "当前身份 {actor}。顺序不能跳。", "—", "D-AUTH", "全角色", ""],
  ["SCR-01", "页头", "HOME-TITLE", "标题", "主区顶部", "O", "—", "文本", "—", "从签约到收账，按泳道往下走", "始终", "不可编辑", "—", "固定文案", "—", "—", "全角色", ""],
  ["SCR-01", "KPI", "HOME-KPI-N", "在册店铺", "KPI第1", "O", "—", "整数", "—", "stores 行数", "始终", "不可编辑", "—", "COUNT(stores)。不按月份过滤。", "stores", "—", "全角色", "现行 53。"],
  ["SCR-01", "KPI", "HOME-KPI-PAY", "系统应付租金", "KPI第2", "O", "—", "金额", "2位", "所选月账单合计", "始终", "不可编辑", "—", "SUM(rent_bills.payable)，年=选中年且月=选中月。会计月标题为「上月」。", "rent_bills.payable", "F-PAY-01", "全角色", "无账单显示 0.00。"],
  ["SCR-01", "KPI", "HOME-KPI-RED", "红色预警", "KPI第3", "O", "—", "整数", "—", "0", "始终", "不可编辑", "—", "COUNT(alerts)，level=red 且 dimension=泳道 且年月=选中月。", "alerts", "F-RED-01", "全角色", "保底、租售比的红预警不计入。9月与10月应为 3。"],
  ["SCR-01", "KPI", "HOME-KPI-DIFF", "未对齐的对账", "KPI第4", "O", "—", "整数", "—", "0", "始终", "不可编辑", "—", "COUNT(reconciliations)，status=DIFFERENCE 且年月=选中月。", "reconciliations.status", "—", "全角色", "ACCEPTED、DISPUTED、MATCHED 不计。"],
  ["SCR-01", "筛选", "HOME-FILTER", "筛选框", "KPI下方", "I", "—", "文本", "—", "空", "始终", "可编辑", "包含匹配，不区分大小写", "区域、城市、店名、商场、电话", "stores", "D-FILTER", "全角色", "不写库。"],
  ["SCR-01", "筛选", "HOME-COUNT", "显示家数", "筛选框右", "O", "—", "文本", "—", "显示 52 / 53 家", "始终", "不可编辑", "—", "分子=开业中且符合筛选。分母=在册总数。", "stores.lifecycle_start", "F-OPEN-01", "全角色", "11月之前 52/53。11月 53/53。"],
  ["SCR-01", "历史", "HOME-MONTH", "月份标签", "历史条", "I", "◎", "按钮组", "前后各6个月", "上月", "有快照", "可点", "不能选出晚于日历月的月", "标签：日历月且非会计月=当月；会计月=上月；其余=YYYY年M月。", "journey,sales,bills,reconciliations,payments", "D-PERIOD", "全角色", "窗口外用前一页、后一页。"],
  ["SCR-01", "红队列", "HOME-Q-STORE", "预警店铺", "红色预警表", "O", "—", "链接", "—", "—", "该月泳道红预警>0", "可点", "—", "打开该店、该选中月的泳道", "alerts + stores.name", "F-RED-01", "全角色", "0 条时显示「这个月没有未完成的泳道。」"],
  ["SCR-01", "红队列", "HOME-Q-DIM", "维度", "红色预警表", "O", "—", "标签", "—", "泳道", "有行", "不可编辑", "—", "固定取 dimension", "alerts.dimension", "—", "全角色", "红色标签。"],
  ["SCR-01", "红队列", "HOME-Q-MSG", "说明", "红色预警表", "O", "—", "文本", "—", "停留在第 N 步，计入红色预警。", "有行", "不可编辑", "—", "N 为显示步 10、11 或 12", "alerts.message", "F-LANE-01", "全角色", ""],
  ["SCR-01", "店卡", "HOME-CARD-NAME", "店名", "卡片标题", "O", "—", "链接", "—", "—", "开业中且符合筛选", "可点", "—", "打开该店该月泳道", "stores.name", "F-OPEN-01", "全角色", "后滩在 2026-11 之前不出现。"],
  ["SCR-01", "店卡", "HOME-CARD-META", "店型商场动作", "店名下", "O", "—", "文本", "—", "精品店", "有店卡", "不可编辑", "—", "店型空则精品店。动作为 keep_decision，空则待评估。", "stores", "—", "全角色", ""],
  ["SCR-01", "店卡", "HOME-CARD-LANE", "泳道状态", "店卡中部", "O", "—", "文本或色条", "13格", "—", "有店卡", "不可编辑", "—", "已完成步≥13：绿色「已完成13步泳道」。否则色条加「第 (step+1) / 13 步」。有泳道红预警再加红色「红色预警」。", "journey.step, alerts", "F-LANE-02", "全角色", "3–8月全部绿色。11月为第 5 / 13 步。"],
  ["SCR-01", "店卡", "HOME-CARD-LINK", "该选中月份泳道", "店卡底部", "I", "—", "链接", "—", "该选中月份泳道", "有店卡", "可点", "—", "打开 SCR-04，月份=当前历史条选中月", "journey", "D-NAV", "全角色", "不再分「上月这条泳道」「当月这条泳道」。"],
  ["SCR-02", "表", "STORE-FILTER", "筛选与家数", "表上方", "I/O", "—", "文本", "—", "同首页", "始终", "筛选可编辑", "同首页", "同 F-OPEN-01", "stores", "D-FILTER", "全角色", ""],
  ["SCR-02", "表", "STORE-BRAND", "品牌", "第1列", "O", "—", "文本", "255", "—", "开业中", "不可编辑", "—", "stores.brand", "stores.brand", "—", "全角色", ""],
  ["SCR-02", "表", "STORE-NAME", "店铺", "第2列，宽240", "O", "—", "链接+三行说明", "255", "—", "开业中", "店名可点", "—", "点店名打开泳道，不改月份", "stores", "—", "全角色", "电话空显示电话未提供。列不换行。"],
  ["SCR-02", "表", "STORE-REGION", "区域", "第3列", "O", "—", "文本", "255", "—", "开业中", "不可编辑", "—", "stores.region", "stores.region", "—", "全角色", ""],
  ["SCR-02", "表", "STORE-CITY", "城市", "第4列", "O", "—", "文本", "255", "—", "开业中", "不可编辑", "—", "stores.city", "stores.city", "—", "全角色", ""],
  ["SCR-02", "表", "STORE-LAND", "业主", "第5列", "O", "—", "文本", "255", "—", "开业中", "不可编辑", "—", "stores.landlord", "stores.landlord", "—", "全角色", ""],
  ["SCR-02", "表", "STORE-END", "租约到期", "第6列", "O", "—", "日期文本", "10", "—", "开业中", "不可编辑", "—", "stores.lease_end", "stores.lease_end", "—", "全角色", ""],
  ["SCR-02", "表", "STORE-ACT", "动作", "第7列", "I", "△", "下拉", "5项", "待评估", "开业中", "营运部或高管，且无其他提交进行中", "必须是代码表 CD-DECISION", "保存 stores.keep_decision，并写审计", "stores.keep_decision", "D-AUTH", "营运部、高管", "拓展部、财务部可见但禁用。"],
  ["SCR-02", "表", "STORE-SALES", "N月销售", "第8列", "O", "—", "金额", "2位", "—", "该月有销售行", "不可编辑", "—", "无行显示 —", "sales_monthly.sales", "—", "全角色", "列名随选中月变化。"],
  ["SCR-02", "表", "STORE-PAY", "应付租金", "第9列", "O", "—", "金额", "2位", "—", "该月有账单", "不可编辑", "—", "无账单显示 —", "rent_bills.payable", "F-RENT-01", "全角色", ""],
  ["SCR-02", "表", "STORE-RATIO", "租售比", "第10列", "O", "—", "百分数", "1位", "—", "账单租售比非空", "不可编辑", "—", "rent_to_sales×100，1位小数。空或 0 显示 —", "rent_bills.rent_to_sales", "F-RTS-01", "全角色", ""],
  ["SCR-02", "表", "STORE-STEP", "步骤", "第11列，宽240", "O", "—", "文本", "—", "—", "开业中", "不可编辑", "—", "step≥13：绿色已完成13步泳道。有泳道红预警：第 (step+1)/13 步 · 红色预警。有 step：第 (step+1)/13 步。无泳道：—", "journey.step, alerts", "F-LANE-02", "全角色", "不换行。"],
  ["SCR-03", "导入", "CT-FILE", "合同文件", "面板上部", "I", "△", "文件", "—", "空", "始终", "拓展部", "doc、docx、pdf", "读出正文，不立即入库", "—", "D-FILE", "拓展部", "其他角色按钮禁用。"],
  ["SCR-03", "导入", "CT-SAMPLE", "使用示例合同", "文件按钮旁", "I", "—", "按钮", "—", "示例正文", "始终", "拓展部", "—", "不上传文件，返回内置示例", "—", "—", "拓展部", "示例是上海前滩太古里，不是后滩。"],
  ["SCR-03", "导入", "CT-TEXT", "导入正文", "导入结果", "O", "—", "长文本", "—", "空", "导入成功后", "不可编辑", "空正文不能提取", "contracts 尚未写入", "—", "D-FILE", "拓展部", ""],
  ["SCR-03", "抽取", "CT-EXTRACT", "提取关键字", "导入结果下", "I", "◎", "按钮", "—", "—", "已有正文", "拓展部", "正文非空", "写入 contracts status=EXTRACTED，并写 contract_fields。泳道停在第 2 步的返回值。", "contracts, contract_fields", "D-STEP-1", "拓展部", ""],
  ["SCR-03", "复核", "CT-CONF", "整单置信度", "复核标题", "O", "—", "百分数", "整数", "—", "已抽取", "不可编辑", "—", "confidence×100 四舍五入", "contracts.confidence", "—", "拓展部", ""],
  ["SCR-03", "复核", "CT-FIELD", "复核字段", "复核表", "I/O", "△", "文本", "按字段", "抽取值", "已抽取且未生效", "可改", "租金模式必须能识别", "见 CD-FIELD。缺项置信度低。", "contract_fields", "D-STEP-3", "拓展部", "19 个字段。"],
  ["SCR-03", "复核", "CT-OK", "确认并生成店铺", "复核表下", "I", "◎", "按钮", "—", "—", "已抽取", "拓展部", "未生效；模型可识别", "插入 stores，合同改 EFFECTIVE，有参考销售则写当月 sales。泳道至少完成第 4 步。", "stores, contracts, journey, sales_monthly", "D-STEP-3", "拓展部", "已生效返回 409。"],
  ["SCR-04", "进度", "LANE-RAIL", "13步清单", "左列", "O", "—", "有序列表", "13", "—", "已完成步<13", "不可编辑", "—", "已完成步打色。当前步=step+1。完成时整列不显示。", "journey.step, STEPS", "F-LANE-02", "全角色", ""],
  ["SCR-04", "店头", "LANE-NAME", "店名与地址", "右面板", "O", "—", "文本", "—", "—", "已选店", "不可编辑", "—", "stores", "stores", "—", "全角色", "无店时提示从首页选择。"],
  ["SCR-04", "店头", "LANE-HINT", "月份说明", "店名下", "O", "—", "文本", "—", "—", "已选店", "不可编辑", "—", "step≥13：YYYY年M月这条泳道已经走完。未到月：还没到这个月。否则：当前是该月，下一步只能由对应部门提交。", "journey.step", "D-PERIOD", "全角色", ""],
  ["SCR-04", "店头", "LANE-STATUS", "泳道状态", "说明下", "O", "—", "同店卡", "—", "—", "已选店", "不可编辑", "—", "同 F-LANE-02", "journey, alerts", "F-LANE-02", "全角色", ""],
  ["SCR-04", "店头", "LANE-LINK", "该选中月份泳道", "状态下", "I", "—", "链接", "—", "—", "已选店", "可点", "—", "仍打开当前店、当前月", "—", "—", "全角色", ""],
  ["SCR-04", "第5步", "LANE-ACT", "特殊活动", "表单", "I", "◎", "文本", "—", "本月无特殊活动", "选中月≤日历月 且 当前步=5", "营运部", "可空，空按无特殊活动", "写入 monthly_inputs，step 至少为 5", "monthly_inputs", "D-STEP-5", "营运部", "其他角色看到禁用和身份提示。"],
  ["SCR-04", "第5步", "LANE-RATE", "临时提点", "表单", "I", "—", "小数", "—", "空", "同第5步", "营运部", "空=沿用合同。填写则为比率，如 0.12", "非空则替代 contracts.rate", "monthly_inputs.temp_rate", "F-RATE-01", "营运部", ""],
  ["SCR-04", "第5步", "LANE-SUB", "补贴", "表单", "I", "—", "金额", "2位", "0", "同第5步", "营运部", "按数字", "税前扣减", "monthly_inputs.subsidy", "F-RENT-01", "营运部", ""],
  ["SCR-04", "第6–7步", "LANE-CALC", "计算本月租金", "按钮", "I", "◎", "按钮", "—", "—", "选中月≤日历月 且 当前步为 6 或 7", "营运部或财务部", "已完成第5步；有生效合同", "读销售与活动，写 rent_bills，覆盖当月 alerts，step 设为 7", "sales_monthly, rent_bills, alerts", "F-RENT-01", "营运部、财务部", "无销售仍可算，销售额按 0 并写数据异常。"],
  ["SCR-04", "结果", "LANE-TRACE", "租金计算过程", "账单区", "O", "—", "列表", "—", "—", "已有账单且 step≥7", "不可编辑", "—", "trace_json 与当月该店全部 alerts", "rent_bills.trace_json", "F-RENT-01", "全角色", ""],
  ["SCR-04", "第8步", "LANE-MALLIN", "登记收妥", "按钮", "I", "◎", "按钮", "—", "—", "当前步=8 且月已到", "财务部", "step≥7", "step 至少为 8。不写商场金额。", "journey", "D-STEP-8", "财务部", ""],
  ["SCR-04", "第9–11步", "LANE-MALL", "商场八项金额", "表单", "I", "◎", "金额×8", "2位", "空", "当前步 9 到 11 且月已到", "财务部", "空按 0", "写 mall_bills 与 reconciliations，step=11", "mall_bills, reconciliations", "F-DIFF-01", "财务部", "基础、扣点、物业、推广、水电、刷卡、代垫、合计。"],
  ["SCR-04", "结果", "LANE-LINES", "差异明细", "对账区", "O", "—", "表", "6行", "—", "有对账且 step≥11", "不可编辑", "—", "系统、商场、差额。绝对差额≥0.01 用差异色。", "reconciliations.lines_json", "F-DIFF-01", "全角色", ""],
  ["SCR-04", "第12步", "LANE-REASON", "原因", "表单", "I", "—", "文本", "255", "商场固定租金与合同不一致", "当前步=12 且月已到", "财务部", "空则按按钮给默认原因", "accept 或 dispute", "reconciliations.reason", "D-STEP-12", "财务部", ""],
  ["SCR-04", "第12步", "LANE-OK", "确认无误", "按钮", "I", "△", "按钮", "—", "—", "当前步=12", "财务部", "已有对账", "status=ACCEPTED，resolution=accept，step=12", "reconciliations", "D-STEP-12", "财务部", ""],
  ["SCR-04", "第12步", "LANE-NO", "发起申诉", "按钮", "I", "△", "按钮", "—", "—", "当前步=12", "财务部", "已有对账", "status=DISPUTED，resolution=dispute，step=12。生成函已在比对时写好。", "reconciliations.letter", "D-STEP-12", "财务部", ""],
  ["SCR-04", "第13步", "LANE-PAY", "生成付款申请", "按钮", "I", "◎", "按钮", "—", "—", "当前步=13 且月已到", "财务部", "step≥12", "金额=系统应付。状态 PENDING_APPROVAL。step=13。", "payment_requests.amount", "F-PAY-02", "财务部", "申诉后仍可生成，金额不改跟商场。"],
  ["SCR-04", "结果", "LANE-PAYOUT", "付款结果", "按钮下", "O", "—", "文本", "—", "—", "有付款行且 step≥13", "不可编辑", "—", "金额与状态", "payment_requests", "F-PAY-02", "全角色", ""],
  ["SCR-05", "说明", "RENT-MATRIX", "四模型说明", "表", "O", "—", "表", "4行", "固定文案", "始终", "不可编辑", "—", "两者取高、保底+超额、阶梯、封顶", "—", "F-RENT-01", "全角色", "引擎另支持两者取低、纯固定、纯扣点。"],
  ["SCR-05", "试算", "RENT-MODEL", "租金模型", "计算器", "I", "◎", "下拉", "7", "两者取高", "始终", "全角色", "必须是 CD-MODEL", "不入库", "—", "F-RENT-01", "全角色", ""],
  ["SCR-05", "试算", "RENT-SALES", "当月实际销售额", "计算器", "I", "◎", "金额", "—", "500000", "始终", "全角色", "数字", "试算输入", "—", "F-RENT-01", "全角色", ""],
  ["SCR-05", "试算", "RENT-FIX", "合同固定租金", "计算器", "I", "◎", "金额", "—", "80000", "始终", "全角色", "数字", "试算输入", "—", "F-RENT-01", "全角色", ""],
  ["SCR-05", "试算", "RENT-RATE", "商场扣点比例", "计算器", "I", "◎", "百分数", "—", "18", "始终", "全角色", "18 与 0.18 同义", "大于 1 则除以 100", "—", "F-RATE-01", "全角色", ""],
  ["SCR-05", "试算", "RENT-PROP", "附加物业费", "计算器", "I", "—", "金额", "—", "12000", "始终", "全角色", "数字", "试算只加物业。推广、水电、增值税按 0。", "—", "F-PREVIEW-01", "全角色", ""],
  ["SCR-05", "试算", "RENT-EXTRA", "保底、超额、封顶、阶梯", "条件区", "I", "△", "金额或百分数", "—", "见初期值", "模型需要时", "全角色", "数字", "保底+超额要保底销售额和超额扣点。封顶要封顶金额。阶梯要三档。", "—", "F-RENT-01", "全角色", ""],
  ["SCR-05", "结果", "RENT-OUT", "当月应付租金", "结果区", "O", "—", "金额", "2位", "—", "计算后", "不可编辑", "—", "模型租金+物业。公式同时显示。", "—", "F-PREVIEW-01", "全角色", "改任一输入即清空结果。"],
  ["SCR-06", "输入", "FC-IN", "预测输入", "计算器", "I", "◎", "数字与模型", "—", "日销 20000、客单 2800、毛利 62%、固定 80000、扣点 18、物业 12000、8人、月薪 8000、装修 1800000、设备 400000、摊销 36、天数 30", "始终", "全角色", "百分数规则同试算", "不入库", "—", "F-FC-01", "全角色", ""],
  ["SCR-06", "结果", "FC-OUT", "月净利润、回收期、盈亏平衡日销、年化IRR", "KPI", "O", "—", "金额或文本", "—", "—", "测算后", "不可编辑", "—", "见计算式。不能回收时写「无法回收」。", "—", "F-FC-01", "全角色", ""],
  ["SCR-06", "结果", "FC-PL", "月度损益", "表", "O", "—", "金额", "2位", "—", "测算后", "不可编辑", "—", "销售、笔数、毛利、租金、人工、摊销、净利润、净利率", "—", "F-FC-01", "全角色", "租金含物业、不含税。"],
  ["SCR-06", "结果", "FC-SENS", "敏感性", "表", "O", "—", "两行", "—", "下降 10%、20%", "测算后", "不可编辑", "—", "日销乘 0.9 与 0.8 后重算利润", "—", "F-FC-02", "全角色", ""],
  ["SCR-07", "说明", "MON-ASOF", "观察日", "导语", "O", "—", "日期", "—", "2026-03-20", "始终", "不可编辑", "—", "时间进度=20/31。与所选月份无关。", "—", "F-PACE-01", "全角色", "日流水未接入。"],
  ["SCR-07", "说明", "MON-RULE", "预警矩阵", "表", "O", "—", "三行", "—", "固定", "始终", "不可编辑", "—", "严重标签在本页显示为绿色，级别仍按红处理。", "—", "F-PRD-01", "全角色", "月结泳道仍用 25% 红线，不改。"],
  ["SCR-07", "表", "MON-ROW", "店铺监控行", "表", "O", "—", "8列", "—", "—", "开业中且符合筛选", "不可编辑", "—", "销售、应付、租售比、估算利润、达成率、预警与备注", "bills 或按合同重算", "F-ECO-01", "全角色", "无销售显示 —，备注说明不能当成经营预警。"],
  ["SCR-08", "汇总", "CK-GEO", "区域/城市", "第一表", "O", "—", "表", "—", "—", "有销售的开业店", "不可编辑", "—", "店铺数、销售额、平均加权利润、加权净利润", "monitor", "F-GEO-01", "全角色", "无销售时提示结账数字看上月。"],
  ["SCR-08", "汇总", "CK-KPI", "区域数、城市数、两种利润", "KPI", "O", "—", "整数与金额", "—", "—", "有汇总", "不可编辑", "—", "随筛选重算，不只用服务端全量", "—", "F-GEO-01", "全角色", ""],
  ["SCR-08", "损益", "CK-PL", "单店损益", "第二表", "O", "—", "金额", "2位", "—", "开业中且未缺销售", "不可编辑", "—", "收入、毛利、租金、净利润、净利率", "—", "F-PL-01", "全角色", "毛利=销售×55%。"],
  ["SCR-08", "排行", "CK-RANK", "健康度排行", "第三表", "O", "—", "榜、分、金额", "2位", "—", "未缺销售且不在开业首月宽限", "不可编辑", "—", "红榜、黑榜或 —。人效固定 —。", "—", "F-BOARD-01", "全角色", "后滩首月不在表内。"],
  ["SCR-08", "占比", "CK-BAR", "租金成本占比", "条形", "O", "—", "比率", "—", "—", "有销售", "不可编辑", "—", "不含税租金/销售额。按商场、按区域。", "—", "F-RATIO-02", "全角色", "条宽最大 100%。"],
  ["SCR-08", "闭店", "CK-LEASE", "闭店续租评估", "表", "O", "—", "表", "—", "—", "开业中，且不是新签的前 6 个月", "不可编辑", "—", "剩余月、违约金、当月利润、建议", "stores.lease_end", "F-LEASE-01", "全角色", "后滩 2026-11 至 2027-04 不出现。"],
  ["SCR-08", "商场", "CK-MALL", "商场贡献", "表", "O", "—", "金额", "2位", "—", "有销售", "不可编辑", "—", "我方销售、我方应付。商场总销售固定「未知」。", "—", "F-GEO-01", "全角色", "不能算我方占比。"],
];

function buildSpec() {
  const wb = book("MaxMara经营管理式样书");
  cover(wb, {
    docId: SPEC_ID,
    kind: "详细式样书（画面仕様書・テーブル定義書・処理仕様書）",
    title: "MaxMara 经营管理式样书",
    subtitle: "标准字段、表关系、显示位置、显示逻辑、计算式、依赖与权限",
    audience: "拓展部、营运部、财务部、高管、后续开发与测试",
    related: MAN_ID,
    order: "先读 03 适用范围和 07 权限，再读 10 表定义与 11 关系，然后用 13 画面项目对照页面，用 15 计算式和 16 依赖核对数字。操作步骤见操作手册。",
  });
  history(wb, SPEC_ID, [
    [VER, DATE, "初版", "按现行 Access 结构与 http://127.0.0.1:5173 的画面逻辑做成。包含 13 张表、8 个业务画面、泳道 13 步、新签店宽限和月份链接。", "全部"],
  ]);
  toc(wb, [
    ["03_适用范围", "目的、对象、不做的事、物理约束"],
    ["04_记号", "I/O、必须、端数、依赖记号"],
    ["05_用语", "上月、当月、已完成步、新签"],
    ["06_画面一览", "画面 ID、路径、数据来源"],
    ["07_画面迁移", "从哪到哪，带不带月份"],
    ["08_权限矩阵", "四个角色对每个动作"],
    ["09_CRUD", "角色×表的增删改查"],
    ["10_表一览", "13 张 Access 表"],
    ["11_表定义", "全部物理列"],
    ["12_关系", "逻辑外键与删除影响"],
    ["13_代码值", "状态、模型、动作"],
    ["14_画面项目", "每个显示项的位置、条件和公式"],
    ["15_处理详细", "13 步和批处理"],
    ["16_计算式", "租金、排行、闭店、家数"],
    ["17_依赖关系", "顺序、时间和主数据"],
    ["18_状态迁移", "合同、泳道、对账"],
    ["19_消息", "画面文案与错误"],
    ["20_初期数据", "3月到11月怎么铺"],
    ["21_接口", "浏览器调用的 API"],
  ]);

  add(grid(wb, "03_适用范围", ["项", "内容"], [24, 110]), [
    ["目的", "把演示系统里已经实现的数据、画面和计算固定成可验收的式样。不另增功能。"],
    ["系统边界", "浏览器画面、Node 接口、本机 Microsoft Access 2016 文件 storeops.accdb。照片经接口读出。"],
    ["不做", "不做真实 OCR、不做 DW 日销售接口、不做付款审批流、不做商场总销售、不把 Access 文件当正式账套。"],
    ["会计月", "会计月=日历月的上一个月。2026-11-01 至 2026-11-30，会计月仍是 2026-10，画面称「上月」。日历月称「当月」。"],
    ["时区", "日历月按 Asia/Shanghai。"],
    ["物理约束", "每张表只有主键 id。没有数据库外键、没有唯一索引、没有事务批处理。关系全部是逻辑关系，由程序维护。"],
    ["并发", "Access 进程单线程。画面提交中会禁用同一批按钮。"],
    ["可编辑月", "选中月的年月序号 ≤ 日历月，泳道表单才出现。更晚的月只显示「还没到这个月。」"],
    ["家数", "分母永远是在册店铺数。分子是该月已开业且通过筛选的店。后滩开业月为 2026-11，故 3–10 月为 52/53，11 月为 53/53。"],
    ["泳道步号", "库存的 step 是最后完成的一步。画面说的「第 N 步」= step+1。完成 13 步时 step=13，不再加 1。"],
    ["红预警口径", "首页 KPI 和红色队列表只数 dimension=泳道 且 level=red。月结保底、租售比的红色不进这个数。"],
    ["新签", "listed_from=新签 且 lifecycle_start 落在开业月。后滩为 2026-11-01。首月不进排行。开业月起连续 6 个月不做闭店评估。"],
    ["迁移一次", "审计动作「泳道按完成档期」只强制改写一次。之后用户往下走的步数不被启动程序覆盖。后滩在 2026-11 之前的行，每次启动仍删除。"],
  ]);

  add(grid(wb, "04_记号", ["记号", "日文对照", "含义", "使用处"], [16, 24, 55, 40]), [
    ["I", "入力", "使用者输入", "画面项目"],
    ["O", "出力", "系统显示", "画面项目"],
    ["I/O", "入出力", "带出后可改", "复核字段"],
    ["◎", "必須", "该条件下必须", "画面项目"],
    ["△", "条件付き必須", "仅在显示条件成立时必须", "画面项目"],
    ["—", "任意または対象外", "可选，或只显示", "画面项目"],
    ["PK", "主キー", "物理主键，均为 id", "表定义"],
    ["FK逻辑", "論理外部キー", "程序维护，库不强制", "关系"],
    ["1:N", "一対多", "一方可有多行子记录", "关系"],
    ["端数", "端数処理", "金额 ROUND 到分。比率另注。", "计算式"],
    ["D-xx", "依存", "依赖编号", "依赖关系"],
    ["F-xx", "計算式", "计算式编号", "计算式"],
    ["CD-xx", "コード", "代码值", "代码值"],
    ["SCR-xx", "画面", "画面编号", "画面一览"],
    ["TBL-xx", "テーブル", "表编号", "表一览"],
  ]);

  add(grid(wb, "05_用语", ["用语", "定义", "不要和什么混淆"], [22, 70, 45]), [
    ["上月", "会计月。2026年11月整月都是 2026年10月。", "不是日历上的昨天，也不是 9 月。"],
    ["当月", "亚洲/上海的日历月。式样基准日为 2026年11月。", "不是会计月。"],
    ["已完成步", "journey.step。", "不是画面上的当前步。"],
    ["当前步", "step<13 时为 step+1。step≥13 时不再显示当前步，显示已完成。", "色条上涂满的是已完成步。"],
    ["已完成13步泳道", "step≥13 的绿色文案。", "不是「该泳道13步全部完成」。"],
    ["红色预警范围", "该月泳道维度红预警的条数。9月和10月各 3。", "不是全部红色经营预警。"],
    ["开业中", "未填开业月，或选中月 ≥ 开业月。", "不是 status 字段。"],
    ["新签", "listed_from=新签。现行只有上海后滩太古里店。", "成都太古里虽有 2026-03 开业日，来源不是新签，不走 6 个月豁免。"],
    ["开业月龄", "(选中年−开业年)×12+(选中月−开业月)。开业当月为 0。", "月龄为负表示尚未开业。"],
    ["系统金额", "rent_bills.payable。", "不是商场对账单合计。"],
    ["差额", "商场合计 − 系统应付。", "不是绝对值。"],
    ["红榜", "综合分降序后的前 ceil(20%)，且分数≥50。", "不是所有高分店。"],
    ["黑榜", "综合分降序后的后 ceil(20%)，不看分数线。与红榜重叠时红榜优先。", "不是分数低于 50 的全部店。"],
  ]);

  add(grid(wb, "06_画面一览", ["画面ID", "导航名", "区域", "主要表", "写操作", "默认月"], [14, 28, 36, 42, 28, 22]), [
    ["SCR-00", "共通框", "页眉、左导航、照片", "stores, store_photos", "切换身份", "随选中月"],
    ["SCR-01", "经营首页", "主区", "stores, journey, alerts, rent_bills, reconciliations", "只跳转", "上月"],
    ["SCR-02", "店览宽表", "主区", "stores, sales_monthly, rent_bills, journey", "续租动作", "上月"],
    ["SCR-03", "新签合同", "主区", "contracts, contract_fields, stores, journey, sales_monthly", "导入、抽取、确认", "会计月与日历月各停在第4步"],
    ["SCR-04", "单店泳道", "主区，由链接进入", "journey 及当月业务表", "第5步至第13步", "打开时带入的月份"],
    ["SCR-05", "租金引擎", "主区", "无", "无", "无关"],
    ["SCR-06", "盈利预测", "主区", "无", "无", "无关"],
    ["SCR-07", "每日预警", "主区", "经 /api/prd/desk 现算", "无", "上月"],
    ["SCR-08", "管理驾驶舱", "主区", "经 /api/prd/desk 现算", "无", "上月"],
  ]);

  add(grid(wb, "07_画面迁移", ["从", "操作", "到", "月份", "前提"], [16, 36, 16, 28, 40]), [
    ["SCR-01", "点月份标签", "SCR-01", "改为该月", "标签在前后 6 个月内，或不晚于日历月"],
    ["SCR-01", "点店名、红队列店名或「该选中月份泳道」", "SCR-04", "保持选中月", "该店该月可无泳道，则步为 0"],
    ["SCR-02", "点店名", "SCR-04", "保持选中月", ""],
    ["SCR-04", "点「该选中月份泳道」", "SCR-04", "保持", "同一店同一月"],
    ["SCR-03", "确认并生成店铺", "SCR-04", "改为会计月", "确认成功才跳转"],
    ["任一", "点左导航", "对应画面", "不改月份", ""],
    ["SCR-07/08", "点月份标签", "原画面", "改为该月", "重新请求 desk"],
  ]);

  add(grid(wb, "08_权限矩阵", ["功能", "拓展部", "营运部", "财务部", "高管", "拒绝时"], [28, 16, 16, 16, 16, 36]), [
    ["查看全部画面", "可", "可", "可", "可", "—"],
    ["导入合同、提取、确认建档", "可", "不可", "不可", "不可", "403 这一步由拓展部操作"],
    ["第5步录入活动", "不可", "可", "不可", "不可", "403 这一步由营运部操作"],
    ["第6–7步计算租金", "不可", "可", "可", "不可", "403"],
    ["第8步登记收妥", "不可", "不可", "可", "不可", "403"],
    ["第9–11步比对", "不可", "不可", "可", "不可", "403"],
    ["第12步确认或申诉", "不可", "不可", "可", "不可", "403"],
    ["第13步付款申请", "不可", "不可", "可", "不可", "403"],
    ["店览续租动作", "不可", "可", "不可", "可", "下拉禁用"],
    ["租金试算、盈利预测", "可", "可", "可", "可", "—"],
    ["改已完成的历史步", "不可", "不可", "不可", "不可", "只能在当前步提交，不能跳，不能回退"],
  ]);

  add(grid(wb, "09_CRUD", ["表", "拓展部", "营运部", "财务部", "高管", "系统启动"], [24, 18, 18, 18, 18, 28]), [
    ["stores", "C 确认时", "U 动作", "R", "U 动作", "C 名录缺店；U 地址与新签开业月"],
    ["store_photos", "R", "R", "R", "R", "C 缺图并回写 photo_id"],
    ["contracts", "C/U", "R", "R", "R", "C 样本合同"],
    ["contract_fields", "C/U", "—", "—", "—", "—"],
    ["monthly_inputs", "—", "C/U", "R", "R", "C 历史月样本"],
    ["sales_monthly", "C 参考销售", "R", "R", "R", "C 历史月；D 后滩开业前"],
    ["rent_bills", "—", "C 计算时覆盖", "C 计算时覆盖", "R", "C 历史月；D 后滩开业前"],
    ["alerts", "—", "C 计算时覆盖", "C 计算时覆盖", "R", "C 泳道红预警；D 后滩开业前及首次迁移时的旧泳道预警"],
    ["mall_bills", "—", "—", "C 比对时覆盖", "R", "C 历史月；D 后滩开业前"],
    ["reconciliations", "—", "—", "C/U", "R", "C 历史月；D 后滩开业前"],
    ["payment_requests", "—", "—", "C", "R", "C 历史月；D 后滩开业前"],
    ["journey", "C 第4步", "U", "U", "R", "C/U 按档期。已迁移后不覆盖用户进度"],
    ["audit_log", "C", "C", "C", "C", "C 迁移标记"],
  ]);

  add(grid(wb, "10_表一览", ["表ID", "物理名", "逻辑名", "粒度", "业务键", "说明"], [12, 22, 18, 22, 32, 40]), [
    ...TABLES.map(([id, physical, logical, note]) => [id, physical, logical, "一行一实体或一行一月", physical === "stores" || physical === "store_photos" ? "id" : "见关系表", note]),
  ]);

  add(grid(wb, "11_表定义", ["No", "表ID", "逻辑表名", "物理表名", "列号", "逻辑名", "物理名", "型", "桁", "键", "NULL", "代码", "说明"], [8, 12, 16, 20, 8, 18, 22, 12, 14, 8, 8, 22, 55]), tableRows());

  add(grid(wb, "12_关系", ["父表", "父列", "子表", "子列", "多重度", "物理约束", "删除时", "业务含义"], [20, 16, 22, 16, 12, 16, 28, 36]), [
    ["stores", "id", "contracts", "store_id", "1:N", "无", "程序不级联", "生效合同才参与月结。一家店可有历史合同，取 EFFECTIVE。"],
    ["contracts", "id", "contract_fields", "contract_id", "1:N", "无", "程序不级联", "复核明细。"],
    ["stores", "id", "monthly_inputs", "store_id", "1:N", "无", "后滩开业前的行在启动时删除", "一家店一月一行，由程序先查后改。"],
    ["stores", "id", "sales_monthly", "store_id", "1:N", "无", "同上", "一家店一月应一行。"],
    ["stores", "id", "rent_bills", "store_id", "1:N", "无", "重算时按店按月删除再插入", "一家店一月一行。"],
    ["stores", "id", "alerts", "store_id", "1:N", "无", "月结重算会删该店该月全部预警，含泳道预警", "计算租金会清掉该月泳道红预警。见依赖 D-ALERT。"],
    ["stores", "id", "mall_bills", "store_id", "1:N", "无", "比对时覆盖", "一家店一月一行。"],
    ["stores", "id", "reconciliations", "store_id", "1:N", "无", "比对时覆盖", "一家店一月一行。"],
    ["stores", "id", "payment_requests", "store_id", "1:N", "无", "已有则不覆盖金额", "一家店一月一行。"],
    ["stores", "id", "journey", "store_id", "1:N", "无", "不应开业的月删除", "业务键店+年+月。主键 id 即该键。"],
    ["store_photos", "id", "stores", "photo_id", "1:N", "无", "不删除", "多店可共用一张图，现行是一店一图。"],
  ]);

  add(grid(wb, "13_代码值", ["代码ID", "使用列", "值", "画面显示", "含义"], [16, 28, 24, 22, 45]), [
    ["CD-ROLE", "请求头 x-role", "expansion", "拓展部", "操作者名 拓展专员"],
    ["CD-ROLE", "请求头 x-role", "ops", "营运部", "营运经理"],
    ["CD-ROLE", "请求头 x-role", "finance", "财务部", "财务专员"],
    ["CD-ROLE", "请求头 x-role", "executive", "高管", "区域负责人"],
    ["CD-CONTRACT", "contracts.status", "EXTRACTED", "已抽取", "待复核"],
    ["CD-CONTRACT", "contracts.status", "EFFECTIVE", "生效", "可参与月结"],
    ["CD-MODEL", "contracts.model", "HIGHER_OF_TWO", "两者取高", "MAX(固定, 销售×扣点)"],
    ["CD-MODEL", "contracts.model", "LOWER_OF_TWO", "两者取低", "MIN(固定, 销售×扣点)"],
    ["CD-MODEL", "contracts.model", "FIXED_ONLY", "纯固定", "固定租金"],
    ["CD-MODEL", "contracts.model", "COMMISSION_ONLY", "纯扣点", "销售×扣点"],
    ["CD-MODEL", "contracts.model", "BASE_PLUS_OVERAGE", "保底+超额", "固定+超额"],
    ["CD-MODEL", "contracts.model", "TIERED", "阶梯扣点", "按档累加"],
    ["CD-MODEL", "contracts.model", "CAPPED", "封顶扣点", "MIN(扣点租金, 封顶)"],
    ["CD-DECISION", "stores.keep_decision", "待评估", "待评估", "初始值"],
    ["CD-DECISION", "stores.keep_decision", "Keep", "Keep", "续约维持"],
    ["CD-DECISION", "stores.keep_decision", "Keep & Renovate", "Keep & Renovate", "续约并装修"],
    ["CD-DECISION", "stores.keep_decision", "Keep & Relocate", "Keep & Relocate", "续约并搬迁"],
    ["CD-DECISION", "stores.keep_decision", "Close", "Close", "关闭"],
    ["CD-RECON", "reconciliations.status", "MATCHED", "一致", "绝对差额<0.01"],
    ["CD-RECON", "reconciliations.status", "DIFFERENCE", "有差额", "首页未对齐计数用此值"],
    ["CD-RECON", "reconciliations.status", "ACCEPTED", "已确认", "第12步确认后。首页不再计数。"],
    ["CD-RECON", "reconciliations.status", "DISPUTED", "申诉中", "第12步申诉后。首页不再计数。"],
    ["CD-LISTED", "stores.listed_from", "新签", "新签", "唯一享受首月不计分、前6个月不评估闭店"],
    ["CD-LISTED", "stores.listed_from", "名录/附件/样本", "来源说明", "不触发新签宽限"],
    ["CD-FIELD", "contract_fields.field_name", "contract_no 至 reference_sales", "复核标签", "共 19 个键，见处理 P-03"],
  ]);

  const itemHeader = ["项番", "画面ID", "区域", "项目ID", "项目名", "显示位置", "I/O", "必须", "型", "桁", "初期值", "显示条件", "编辑条件", "校验", "计算或来源", "关联表.列", "依赖", "权限", "备注"];
  add(grid(wb, "14_画面项目", itemHeader, [8, 12, 12, 16, 18, 16, 8, 8, 12, 12, 22, 28, 18, 22, 36, 28, 14, 16, 28]), SCREEN_ITEMS.map((row, index) => [index + 1, ...row]));

  add(grid(wb, "15_处理详细", ["处理ID", "名称", "触发", "角色", "前置", "处理", "写表", "完成后的步", "失败"], [12, 22, 22, 14, 28, 55, 28, 16, 28]), [
    ["P-01", "导入原文", "选择文件或示例", "拓展部", "无", "解析 doc、docx、pdf 或返回示例。不入库。", "audit_log", "不变", "格式不支持则拒绝"],
    ["P-02", "抽取条款", "提取关键字", "拓展部", "正文非空", "按标签抽出 19 个字段。缺项置信度 0.35 且 needs_review=1。", "contracts, contract_fields, audit_log", "返回 step=2，尚未有店", "正文空"],
    ["P-03", "确认建档", "确认并生成店铺", "拓展部", "合同存在且不是 EFFECTIVE；模型可识别", "插 stores。回写合同。参考销售>0 则写会计月销售。会计月与日历月若不同，两个月的泳道都至少完成第 4 步。", "stores, contracts, contract_fields, sales_monthly, journey, audit_log", "4", "已确认、模型无法识别"],
    ["P-04", "录入活动", "提交给系统", "营运部", "该月 step≥4；月已到", "插或改 monthly_inputs。step 提升到至少 5，不降低已有更高步。", "monthly_inputs, journey, audit_log", "≥5", "步不够、角色不对"],
    ["P-05", "计算租金", "计算本月租金", "营运部或财务部", "step≥5；有生效合同", "无销售行则销售额 0 并记数据异常。按 F-RENT-01 出账。删除该店该月旧账单和全部预警后重插。", "rent_bills, alerts, journey, audit_log", "7", "无合同。会清掉泳道红预警，见 D-ALERT"],
    ["P-06", "登记收妥", "登记收妥", "财务部", "step≥7", "只推进泳道。", "journey, audit_log", "≥8", "步不够"],
    ["P-07", "比对", "比对", "财务部", "step≥8；已有系统账单", "按 F-DIFF-01 写商场账单和对账。差额绝对值<0.01 为 MATCHED，否则 DIFFERENCE。", "mall_bills, reconciliations, journey, audit_log", "11", "无系统账单"],
    ["P-08", "确认或申诉", "两个按钮", "财务部", "step≥11；已有对账", "确认：ACCEPTED。申诉：DISPUTED。原因空则用默认文案。", "reconciliations, journey, audit_log", "12", "没有对账"],
    ["P-09", "付款申请", "按系统金额生成", "财务部", "step≥12", "无申请则插入。金额取 payable。已有申请不改金额。", "payment_requests, journey, audit_log", "13", "步不够"],
    ["P-10", "续租动作", "店览下拉", "营运部或高管", "店存在", "只改 keep_decision。action_plan 沿用旧值。", "stores, audit_log", "不变", "动作不在代码表"],
    ["P-11", "租金试算", "计算当月应付租金", "全角色", "无", "F-PREVIEW-01。不入库。", "无", "不变", "未知模型"],
    ["P-12", "盈利预测", "测算盈利能力", "全角色", "无", "F-FC-01。不入库。", "无", "不变", "—"],
    ["P-13", "驾驶舱汇总", "打开或改月", "全角色", "无", "按选中月现算。不写库。", "无", "不变", "—"],
    ["P-14", "启动铺数", "进程启动", "系统", "无", "补名录、补照片、补 4–10 月样本、补当月泳道、按 20_初期数据 校正。", "多表", "按档期", "Access 或 Java 未就绪则页面等待"],
  ]);

  add(grid(wb, "16_计算式", ["式ID", "名称", "适用", "公式", "端数", "例外"], [14, 22, 28, 70, 22, 36]), [
    ["F-OPEN-01", "是否开业", "首页、店览、预警、驾驶舱的行过滤", "无 lifecycle_start 则视为开业。否则 选中年月序号 ≥ 开业年月序号。年月序号=年×12+月。", "—", "后滩 2026-11-01。2026-10 及以前隐藏。"],
    ["F-COUNT-01", "显示家数", "带月份的列表", "分子=开业中且筛选命中。分母=stores 全表行数，不受筛选和开业影响。", "整数", "筛选后分子变小，分母仍是 53。"],
    ["F-LANE-01", "显示步", "店卡、店览、泳道", "step≥13：已完成。否则显示步=step+1。", "整数", "11月库存 step=4，显示第 5 步。9月和10月三家店库存 9、10、11，显示 10、11、12。"],
    ["F-LANE-02", "完成文案", "店卡、店览、泳道", "step≥13 显示绿色「已完成13步泳道」，不画 1–13 色条。否则画色条并写「第 N / 13 步」。若该店该月存在泳道红预警，再写「红色预警」。", "—", "店览把两句合成「第 N / 13 步 · 红色预警」。"],
    ["F-RED-01", "红色预警条数", "首页 KPI 与队列表", "alerts.level=red AND dimension=泳道 AND 年=选中年 AND 月=选中月。队列表还要求店在当前筛选结果内。", "整数", "9月、10月各 3。3–8月和11月为 0。"],
    ["F-RATE-01", "百分数输入", "试算、预测、复核扣点", "若输入>1，则除以 100。0.18 保持 0.18。字符串去掉末尾 %。", "比率", "临时提点按原数使用，不走这条。应填 0.12 这种比率。"],
    ["F-FREE-01", "免租月", "月结", "免租起止都有，且 年×100+月 落在起止月份之间（含端点）。日不计。", "—", "任一边空则不免租。"],
    ["F-RENT-01", "月结应付", "泳道计算、历史样本", "免租则基础租金=0，否则按模型。扣点租金=ROUND(销售×扣点,2)。两者取高=MAX(固定,扣点租金)。两者取低=MIN。纯固定=固定。纯扣点=扣点租金。保底+超额=固定+ROUND(MAX(0,销售−保底)×超额扣点,2)。阶梯=各档区间×该档扣点之和。封顶=MIN(扣点租金,封顶额)。物业=免租且免物业 ? 0 : 物业费。附加=物业+推广+水电。税前=MAX(0, 基础+附加−补贴)。增值税=ROUND(税前×税率,2)。应付=税前+增值税。", "金额到分", "无销售行时销售按 0，另写数据异常，不写经营预警。"],
    ["F-RTS-01", "租售比", "账单、店览", "销售>0 时 税前/销售，四舍五入到 4 位小数。否则空。店览显示 ×100 后 1 位，0 显示 —。", "4位小数", "分子是税前，不是应付。"],
    ["F-PREVIEW-01", "试算应付", "租金引擎页", "与 F-RENT-01 相同，但推广=0、水电=0、补贴=0、增值税率=0、不免租。应付=模型租金+物业。", "金额到分", "画面声明不含增值税。"],
    ["F-ALERT-BRD", "月结预警", "计算租金时入库", "保底>0：达成率<0.8 红，<0.9 橙。租售比>0.25 红，>0.20 橙，>0.15 黄。缺销售：只写数据异常红。", "1位百分数", "这些红不进首页红色 KPI。"],
    ["F-ECO-01", "驾驶舱取数", "预警与驾驶舱", "有该月账单则用账单。否则有生效合同且有销售则按 F-RENT-01 重算，补贴按 0。否则缺数。", "—", "11月样本没有销售，也没有账单，故整月缺数。"],
    ["F-PL-01", "单店损益", "驾驶舱、预警利润", "毛利=ROUND(销售×0.55,2)。净利润=毛利−应付。净利率=销售>0 ? 净利润/销售 : 空。", "金额到分", "人工和折旧不扣。与预测页不同。"],
    ["F-PRD-01", "每日预警级别", "每日预警页，不入库", "利润：连续3月亏损为红，但现行只传单月，故亏损为橙，并注明不能判断连续 3 月。利润率环比下滑>20% 为黄，无上月则只备注。租售比>0.30 红，>0.25 橙，≥0.20 且<0.25 黄。达成率<0.8 红，<0.9 橙。未触发前两档且时间进度−达成率≥0.10 为黄。", "1位", "观察日固定 2026-03-20，时间进度=20/31。本页红色标签画成绿色。"],
    ["F-SCORE-01", "综合分", "排行", "在入榜集合内，销售、利润、坪效各自 (值−最小)/(最大−最小)×100。缺坪效则不参加平均。综合分=参加项的平均。", "2位", "人效不参加。最大=最小时该项无分。"],
    ["F-BOARD-01", "红榜黑榜", "排行", "入榜集合=未缺销售 且 不是新签开业月龄<1。按综合分降序，同分按店名。前 ceil(人数×0.2) 且分数≥50 为红榜。后 ceil(人数×0.2) 为黑榜。先判红榜。", "—", "后滩首月即使有销售也不入榜。第2个月起可入榜。"],
    ["F-GEO-01", "区域城市加权", "驾驶舱", "平均加权利润=Σ(净利润×销售额)/Σ销售额。加权净利润=Σ净利润。商场占比=不含税租金/销售额。", "金额到分", "筛选后在浏览器重算。"],
    ["F-LEASE-01", "闭店评估", "驾驶舱", "剩余月=(结束年−选中年)×12+(结束月−选中月)。违约金=ROUND(固定租金×3,2)。新签且月龄≥0 且月龄<6 的店不进本表。剩余月≤6 才提示进入窗口。", "整数月", "后滩月龄 0 至 5 排除，即 2026-11 至 2027-04。"],
    ["F-FC-01", "新店预测", "盈利预测", "月销售=日销×天数。毛利=月销售×毛利率。租金=F-PREVIEW-01。人工=人数×月薪。摊销=(装修+设备)/摊销月数。净利润=毛利−租金−人工−摊销。回收期=投资/月净利润，仅当净利润>0。年化 IRR 由月利率牛顿法求出后再 (1+月利率)^12−1。", "金额到分；IRR 1位百分数", "净利润≤0 则回收期和 IRR 为无法回收。"],
    ["F-FC-02", "敏感性", "盈利预测", "日销×0.9 与日销×0.8，其余输入不变，重算净利润。", "金额到分", ""],
    ["F-FC-03", "盈亏平衡日销", "盈利预测", "对日销做二分，直到月净利润≥0。", "2位", "日销高到 1e8 仍亏损则无法平衡。"],
    ["F-DIFF-01", "对账差额", "泳道比对", "系统租金行=账单基础租金。商场租金行=商场基础+商场扣点。物业、推广、水电各自对账。刷卡和代垫的系统侧=0。差额行=商场−系统。总差额=商场合计−系统应付。绝对总差额<0.01 则 MATCHED。", "金额到分", "商场合计未填时，用各商场行金额之和，不是系统应付。"],
    ["F-PAY-02", "付款金额", "第13步", "payment_requests.amount = rent_bills.payable。", "金额到分", "不采用商场合计。同月已有申请则不更新金额。"],
    ["F-HASH-01", "未完成三店", "9月和10月初始化", "排除 st-houtan。对其余店 id 做 FNV-1a 32 位，按哈希再按 id 排序，取前 3 家。依次完成步 9、10、11，即显示 10、11、12。两月同一批店。", "—", "现行结果：三亚海棠湾店、北京三里屯太古里精品店、广州太古汇店。"],
  ]);

  add(grid(wb, "17_依赖关系", ["依赖ID", "种类", "先行", "后行", "条件", "不满足时"], [12, 12, 28, 28, 36, 36]), [
    ["D-PERIOD", "时间", "日历月", "会计月、历史条、可编辑月", "会计月=日历月减 1 个月。1月则上年12月。", "不能选出未来月"],
    ["D-OPEN", "主数据", "stores.lifecycle_start", "列表是否出现", "F-OPEN-01", "后滩不出现在 11 月之前"],
    ["D-LISTED", "主数据", "listed_from=新签", "排行与闭店", "仅新签走月龄宽限", "其他店即使开业日较近也参与"],
    ["D-AUTH", "权限", "右上角身份", "全部写接口", "见权限矩阵。身份只在浏览器保存。", "403，按钮禁用"],
    ["D-STEP-1", "顺序", "合同正文", "抽取", "正文非空", "请先导入"],
    ["D-STEP-3", "顺序", "EXTRACTED 合同", "建档", "未生效且模型可识别", "409 或 400"],
    ["D-STEP-5", "顺序", "journey.step≥4", "活动", "月已到", "提示先完成合同复核"],
    ["D-STEP-6", "顺序", "step≥5 且生效合同", "租金", "销售可缺", "无合同则停止"],
    ["D-STEP-8", "顺序", "step≥7", "收妥", "—", "提示先计算"],
    ["D-STEP-9", "顺序", "step≥8 且有账单", "比对", "—", "提示先收妥或没有账单"],
    ["D-STEP-12", "顺序", "step≥11 且有对账", "确认或申诉", "—", "提示先比对"],
    ["D-STEP-13", "顺序", "step≥12", "付款", "—", "提示先确认或申诉"],
    ["D-ALERT", "副作用", "P-05 计算租金", "该月预警", "重算会删除该店该月全部 alerts 再按经营规则重插", "9月或10月若对那 3 家店重新计算，泳道红预警会消失，首页红数会小于 3"],
    ["D-MIGRATE", "启动", "审计中无「泳道按完成档期」", "journey.step", "只强制一次", "之后重启不覆盖人工进度"],
    ["D-HOUTAN", "启动", "后滩店", "开业前的月数据", "每次启动都删 2026-11 之前的销售、账单、预警、输入、商场账单、对账、付款、泳道", "历史月不会出现这家店的数"],
    ["D-NAV", "画面", "历史条选中月", "泳道页", "链接把该月传入", "4月标签进入的就是 2026年4月"],
    ["D-FILTER", "画面", "筛选文字", "分子", "分母不随筛选变化", "见 F-COUNT-01"],
    ["D-PHOTO", "主数据", "photo_id", "左图", "无 id 或无图则保留上一张或默认", "不阻塞业务"],
    ["D-FILE", "接口", "文件字节", "正文", "仅 doc、docx、pdf、示例", "其他格式拒绝"],
    ["D-SCORE", "计算", "入榜集合", "红榜黑榜", "先排除缺销售和新签首月", "11月样本无销售，排行表为空"],
  ]);

  add(grid(wb, "18_状态迁移", ["对象", "从", "事件", "到", "不可逆说明"], [18, 20, 28, 22, 45]), [
    ["合同", "无", "抽取", "EXTRACTED", "可再次抽取会新增一份合同，不改旧件"],
    ["合同", "EXTRACTED", "确认", "EFFECTIVE", "不能再次确认"],
    ["泳道", "无或更低", "确认建档", "至少 4", "不把已经更高的步降下来"],
    ["泳道", "≥4", "提交活动", "至少 5", ""],
    ["泳道", "≥5", "计算", "7", "第6步不单独停留，计算一次跨到 7"],
    ["泳道", "≥7", "登记收妥", "至少 8", ""],
    ["泳道", "≥8", "比对", "11", "第9步和第10步不单独停留"],
    ["泳道", "≥11", "确认或申诉", "12", ""],
    ["泳道", "≥12", "付款", "13", "完成文案出现"],
    ["对账", "无", "比对且差额可忽略", "MATCHED", ""],
    ["对账", "无", "比对且有差额", "DIFFERENCE", "计入首页未对齐"],
    ["对账", "MATCHED或DIFFERENCE", "确认无误", "ACCEPTED", "离开未对齐计数"],
    ["对账", "MATCHED或DIFFERENCE", "申诉", "DISPUTED", "离开未对齐计数。付款仍按系统金额"],
    ["付款", "无", "生成", "PENDING_APPROVAL", "没有审批画面，状态停在这里"],
    ["新签宽限", "月龄 0", "进入次月", "月龄 1", "排行从次月开始纳入；闭店仍排除到月龄 5"],
  ]);

  add(grid(wb, "19_消息", ["编号", "出现位置", "条件", "文案", "级别"], [10, 18, 36, 55, 12]), [
    ["M-01", "泳道完成", "step≥13", "已完成13步泳道", "正常"],
    ["M-02", "泳道未完成", "step<13", "第 N / 13 步", "正常"],
    ["M-03", "泳道红", "有泳道红预警", "红色预警", "红"],
    ["M-04", "红队列空", "该月泳道红=0", "这个月没有未完成的泳道。", "正常"],
    ["M-05", "红队列", "9月或10月三店", "停留在第 10/11/12 步，计入红色预警。", "红"],
    ["M-06", "泳道", "月未到", "还没到这个月。", "正常"],
    ["M-07", "泳道", "已完成", "YYYY年M月这条泳道已经走完。", "正常"],
    ["M-08", "泳道", "step<4 且月已到", "本月泳道还停在合同阶段。已有档案的店，从第 5 步录入活动。", "提示"],
    ["M-09", "角色", "角色不符", "这一步由{部门}操作", "错误"],
    ["M-10", "顺序", "步不够", "请先完成前一步。各步文案见处理详细。", "错误"],
    ["M-11", "合同", "已生效再确认", "合同已经确认", "错误"],
    ["M-12", "合同", "模型不能识别", "租金模式无法识别，请改成七种模型名", "错误"],
    ["M-13", "导入", "正文空", "请先导入合同，看到文字结果后再提取关键字", "错误"],
    ["M-14", "缺销售", "计算时无销售行", "POS/DW 月销售缺失，不能把这条当成经营预警。", "红，但不进首页红数"],
    ["M-15", "保底", "达成率<80%", "距保底还差 X 元，达成率 Y%，低于 80%。", "红"],
    ["M-16", "租售比", "月结>25%", "租售比 Z%，超过 25% 红线。", "红"],
    ["M-17", "每日预警", "红色维度", "标签用绿色显示，文字仍是严重条件", "显示绿"],
    ["M-18", "驾驶舱", "该月无销售", "这个月还没有销售。结账数字看上月。", "提示"],
    ["M-19", "闭店", "剩余月>6", "距到期 N 个月，未进入到期前 6 个月，不自动生成闭店建议。", "正常"],
    ["M-20", "闭店", "剩余月≤6", "已进入到期前 6 个月，可对照估算违约金和继续经营的月利润。", "提示"],
    ["M-21", "付款", "已生成", "付款申请 {金额} 元，状态 PENDING_APPROVAL。", "正常"],
    ["M-22", "电话", "phone 空", "电话未提供", "正常"],
    ["M-23", "加载", "Access 未就绪", "正在打开 Access 数据库", "等待"],
  ]);

  add(grid(wb, "20_初期数据", ["月份", "对象", "库存 step", "画面", "销售与账单", "泳道红预警", "家数"], [14, 22, 16, 28, 28, 28, 16]), [
    ["2026-03至08", "除后滩外全部店", "13", "绿色已完成13步泳道", "有样本销售和账单", "无", "52/53"],
    ["2026-09", "哈希前三家以外", "13", "绿色已完成", "有", "无", "52/53"],
    ["2026-09", "三家未完成店", "9、10、11 各一家", "第10、11、12步，红色预警", "有", "各 1 条，共 3", "52/53"],
    ["2026-10 上月", "同 9 月同一批", "与 9 月相同", "与 9 月相同", "有", "3", "52/53"],
    ["2026-11 当月", "全部 53 家，含后滩", "4", "第 5 / 13 步，无红色预警", "不写销售、不写账单", "无", "53/53"],
    ["2026-11之前", "上海后滩太古里店", "无行", "列表不出现", "无", "无", "计入分母 53"],
    ["启动第二次起", "已有泳道", "不覆盖", "保持使用者提交后的步", "不重铺已有月", "不重复插泳道预警", "—"],
  ]);

  add(grid(wb, "21_接口", ["方法", "路径", "角色", "作用", "写表"], [10, 36, 18, 40, 32]), [
    ["GET", "/api/health", "无", "存活与会计月", "无"],
    ["GET", "/api/snapshot", "无", "首页到泳道的全部行。审计只回最新 40 条。", "无"],
    ["GET", "/api/photos/:id", "无", "输出图片字节", "无"],
    ["GET", "/api/sample-contract", "无", "示例正文", "无"],
    ["GET", "/api/prd/desk?year&month", "无", "预警和驾驶舱", "无"],
    ["POST", "/api/contracts/import", "拓展部", "导入文件", "audit_log"],
    ["POST", "/api/contracts", "拓展部", "抽取", "contracts, contract_fields, audit_log"],
    ["POST", "/api/contracts/:id/confirm", "拓展部", "建档", "stores, contracts, journey, sales_monthly, audit_log"],
    ["POST", "/api/stores/:id/activity", "营运部", "第5步", "monthly_inputs, journey, audit_log"],
    ["POST", "/api/stores/:id/calculate", "营运部、财务部", "第6–7步", "rent_bills, alerts, journey, audit_log"],
    ["POST", "/api/stores/:id/mall-received", "财务部", "第8步", "journey, audit_log"],
    ["POST", "/api/stores/:id/reconcile", "财务部", "第9–11步", "mall_bills, reconciliations, journey, audit_log"],
    ["POST", "/api/stores/:id/resolve", "财务部", "第12步", "reconciliations, journey, audit_log"],
    ["POST", "/api/stores/:id/payment", "财务部", "第13步", "payment_requests, journey, audit_log"],
    ["POST", "/api/stores/:id/decision", "营运部、高管", "续租动作", "stores, audit_log"],
    ["POST", "/api/rent/preview", "全角色", "试算", "无"],
    ["POST", "/api/forecast", "全角色", "预测", "无"],
  ]);

  return wb;
}

function steps(role, rows) {
  return rows.map((row, index) => [role, index + 1, ...row]);
}

function buildManual() {
  const wb = book("MaxMara角色操作手册");
  cover(wb, {
    docId: MAN_ID,
    kind: "操作手册（操作手順書）",
    title: "MaxMara 经营管理操作手册",
    subtitle: "按拓展部、营运部、财务部、高管分别书写的手顺",
    audience: "四个业务角色的操作人员",
    related: SPEC_ID,
    order: "先做 02 共通操作，再只读自己角色的一章。异常看 08。月份含义以 07 为准。字段和公式以式样书为准，本手册不重复公式推导。",
  });
  history(wb, MAN_ID, [
    [VER, DATE, "初版", "按四个身份的实际可执行按钮写成手顺。包含 9 月、10 月红色预警和后滩新签的查看方法。", "全部角色"],
  ]);
  toc(wb, [
    ["02_共通操作", "进入系统、认月份、认家数、认泳道"],
    ["03_拓展部", "导入合同到生成档案"],
    ["04_营运部", "第5步、计算、续租动作"],
    ["05_财务部", "收妥、比对、申诉、付款"],
    ["06_高管", "看驾驶舱和续租动作"],
    ["07_月次日历", "11月这一周该看哪个月"],
    ["08_异常与禁止", "不能跳步、不能改历史红数的副作用"],
    ["09_确认清单", "验收时逐项看"],
  ]);

  add(grid(wb, "02_共通操作", ["步骤", "操作", "看到什么", "判读", "不要做"], [10, 36, 40, 40, 36]), [
    [1, "打开 http://127.0.0.1:5173/ 并强制刷新", "标题零售经营系统，标签 MaxMara经营系统", "数据来自本机 Access", "不要打开别的端口"],
    [2, "看页眉小字", "账期 2026年10月 · 上月", "11月整月的默认月都是 10 月", "不要把 9 月当成系统的上月"],
    [3, "看右上角身份", "默认拓展部", "写操作取决于这里，不取决于登录账号", "换身份后要等按钮恢复"],
    [4, "看「显示 N / 53 家」", "10月及以前 52/53，11月 53/53", "分母是在册。后滩 11 月才进入分子。", "不要把 52 理解成少了一条坏数据"],
    [5, "点历史条", "3月到8月店卡全是绿色「已完成13步泳道」", "红色预警 KPI 为 0", "不要在已完成月找第 5 步表单"],
    [6, "停在上月或点 2026年9月", "红色预警为 3。三亚海棠湾第10步，北京三里屯太古里第11步，广州太古汇第12步。", "其余店绿色完成", "不要把经营类红预警算进这个 3"],
    [7, "点「当月」", "53 张卡都是第 5 / 13 步。能看到上海后滩太古里店。", "当月尚未计算租金，应付为 0", "不要在当月找后滩的历史月"],
    [8, "点「该选中月份泳道」", "页眉变成刚才选中的年月", "4月标签进去就是 2026年4月，并显示已完成", "不再使用上月泳道、当月泳道两个链接"],
  ]);

  add(grid(wb, "03_拓展部", ["角色", "步骤", "画面", "前提", "操作", "系统做什么", "完成标准", "失败时"], [12, 8, 14, 28, 36, 40, 28, 28]), steps("拓展部", [
    ["SCR-03", "身份为拓展部", "点「使用示例合同」或选择 doc、docx、pdf", "只读出文字，不建店", "能看见合同正文", "其他格式会被拒绝"],
    ["SCR-03", "正文非空", "点「提取关键字」", "写入一份 EXTRACTED 合同和 19 行字段", "看到置信度和可改表格", "正文空则提示先导入"],
    ["SCR-03", "逐项看低置信度", "改正文字，尤其是租金模式", "尚未生效", "七种模式名必须能对上", "模式无法识别则不能生成"],
    ["SCR-03", "核对无误", "点「确认并生成店铺」", "新建店铺，合同生效，会计月和当月都停在第 4 步之后的可录入位置", "跳到该店泳道，可开始第 5 步", "同一份已确认合同不能再确认"],
    ["SCR-01", "想看旧月", "只查看，不改已完成泳道", "拓展部不能录入活动和财务步骤", "按钮呈禁用", "换营运或财务身份后再做"],
  ]));

  add(grid(wb, "04_营运部", ["角色", "步骤", "画面", "前提", "操作", "系统做什么", "完成标准", "失败时"], [12, 8, 14, 28, 36, 40, 28, 28]), steps("营运部", [
    ["SCR-00", "需要录入", "右上角改成营运部", "只改变后续请求的身份", "第5步按钮可按", "停留在拓展部会看到禁用说明"],
    ["SCR-04", "选当月，打开任意老店或后滩", "当前步是第 5 步", "表单出现", "看到活动、临时提点、补贴", "已完成月不会出现这个表单"],
    ["SCR-04", "没有活动", "活动留「本月无特殊活动」，提点留空，补贴 0，提交", "写入月输入，步至少为 5", "表单换成第 6–7 步", "未建档会提示先复核合同"],
    ["SCR-04", "有临时扣点", "提点填比率，例如 0.12，不要填 12", "计算时替换合同扣点", "下一步计算使用 0.12", "填 12 会被当成 1200%"],
    ["SCR-04", "第6–7步", "点「计算本月租金」", "读该月销售。没有销售也可算，并写数据异常。", "出现计算过程，步到第 7 步", "没有生效合同会停止"],
    ["SCR-02", "要标续租或关店", "在动作列选择 Keep、装修、搬迁、Close 或待评估", "立即保存", "刷新后仍是所选值", "财务和拓展的下拉是灰的"],
    ["SCR-01", "核对 9月或上月", "不要对那三家红预警店按计算", "重算会删掉该月全部预警再按经营规则重写，泳道红点会丢", "红数保持 3", "若已误算，需由管理员按初期数据规则恢复"],
  ]));

  add(grid(wb, "05_财务部", ["角色", "步骤", "画面", "前提", "操作", "系统做什么", "完成标准", "失败时"], [12, 8, 14, 28, 36, 40, 28, 28]), steps("财务部", [
    ["SCR-00", "接手续做", "身份改成财务部", "第5步仍不可按", "第8步及以后可按", "活动必须等营运提交"],
    ["SCR-04", "营运已算出租金", "点「登记收妥」", "只表示商场账单已到，不录入金额", "进入第 9–11 步", "未计算会提示"],
    ["SCR-04", "手边有商场数", "填写八项金额后点比对", "系统租金对基础租金。商场基础和扣点会加总后再对。刷卡和代垫系统侧为 0。", "看到六行差额。步到第 11 步。", "没有系统账单会停止"],
    ["SCR-04", "差额可接受", "填写原因，点确认无误", "状态变为 ACCEPTED，首页未对齐不再计这一条", "进入第 13 步按钮", "没有对账会停止"],
    ["SCR-04", "差额不接受", "点发起申诉", "状态变为 DISPUTED，差异函已在比对时生成", "同样进入第 13 步", "申诉不阻止付款"],
    ["SCR-04", "要付款", "点按系统金额生成付款申请", "金额是系统应付，不是商场合计。状态 PENDING_APPROVAL。", "绿色已完成13步泳道，并显示金额", "同月重复点击不改已有金额"],
    ["SCR-05", "只想试算", "用租金引擎，不进泳道", "不写 Access，不含税", "看到应付和公式", "这不是正式账单"],
  ]));

  add(grid(wb, "06_高管", ["角色", "步骤", "画面", "前提", "操作", "系统做什么", "完成标准", "失败时"], [12, 8, 14, 28, 36, 40, 28, 28]), steps("高管", [
    ["SCR-00", "查看", "身份改为高管", "不能代做合同、活动、对账、付款", "对应按钮禁用", "需要代做时换对应部门身份"],
    ["SCR-08", "看上月", "打开管理驾驶舱，确认停在上月", "52 家入榜。红榜是前 20% 且分数至少 50。黑榜是后 20%。", "看不到上海后滩太古里店", "11月没有销售，排行表为空，这是预期"],
    ["SCR-08", "看闭店表", "翻到闭店 / 续租决策评估", "新签店开业后的前 6 个月整表排除", "上月表中没有后滩", "不要把后滩的空分数当成黑榜"],
    ["SCR-08", "看区域", "看区域/城市和两条利润", "利润按销售额加权。毛利按销售的 55% 估算。", "筛选后 KPI 跟着变", "商场总销售显示未知"],
    ["SCR-07", "看预警", "打开每日预警", "严重条件的标签是绿色。时间进度固定按 3月20日。", "能看到达成率和租售比", "这里的绿色不是已完成泳道"],
    ["SCR-02", "做决策", "把动作改成 Keep 或 Close 等", "与营运部同一权限", "保存成功", "不能改租金和泳道步"],
    ["SCR-01", "抽查泳道", "选 2026年4月，点该选中月份泳道", "进入 4 月已完成泳道", "页眉为 2026年4月", "不会打开成 10月或 11月"],
  ]));

  add(grid(wb, "07_月次日历", ["日历", "系统上月", "系统当月", "谁主要工作", "看什么", "不要看什么"], [18, 16, 16, 18, 40, 36]), [
    ["2026-11-01至11-30", "2026-10", "2026-11", "营运开始第5步；财务处理尚未算完的 10 月例外店", "10月红预警是否仍为 3。11月是否 53 家都在第5步。", "不要把 9 月叫做上月。9月同样有 3 家红预警，但是历史月。"],
    ["每月1日之后", "刚结束的月", "新的月", "财务收当月商场账单前，先看上月是否走完", "上月 KPI", "当月在第5步之前没有应付"],
    ["新店开业月", "仍是上一个日历月", "开业月", "拓展确认后，营运从第5步录入", "开业月才出现在分子", "开业月不要做闭店评估，不要放进红黑榜"],
    ["开业次月", "开业月成为上月", "新日历月", "财务可对开业月走对账", "排行可以从这一月纳入", "闭店表仍要排除，直到满 6 个月"],
    ["开业第7个月", "—", "—", "高管看闭店表", "新签店开始出现", "前 6 个月的空缺不是漏数"],
  ]);

  add(grid(wb, "08_异常与禁止", ["编号", "现象", "原因", "操作者应做", "禁止"], [10, 36, 40, 40, 36]), [
    ["E-01", "按钮是灰的", "身份不对，或另有提交未结束", "换右上角身份，等按钮恢复", "不要连点"],
    ["E-02", "提示由某部门操作", "接口再次校验身份", "换成提示中的部门", "不要改数据库绕过"],
    ["E-03", "提示先完成上一步", "step 低于该步要求", "回到上一步提交", "不能跳步，也不能在完成月重做"],
    ["E-04", "合同已经确认", "同一合同不能确认两次", "从店览找新店", "不要重复建档"],
    ["E-05", "租金模式无法识别", "复核文字不在七种名称里", "改成两者取高等等", "不要留空"],
    ["E-06", "红预警从 3 变成更少", "对红预警店重新计算租金，删掉了泳道预警", "停止再算。通知管理员按初期数据恢复。", "不要为了看账单去点那三家的计算"],
    ["E-07", "11月排行是空的", "当月没有销售和账单", "等营运、财务走完计算后再看", "不要把空表当成黑榜"],
    ["E-08", "后滩出现在 4 月", "开业月被改早了", "核对 lifecycle_start 是否仍为 2026-11-01", "不要手工补历史销售"],
    ["E-09", "付款金额和商场不一致", "付款故意取系统应付", "以差异函追商场。系统金额不改。", "不要把商场合计写成付款申请"],
    ["E-10", "每日预警的严重是绿色", "该页按式样把红级别画成绿色", "读文字判断严重程度", "不要把它改回红色标签，除非式样修订"],
    ["E-11", "重启后步数被改", "只有第一次「泳道按完成档期」会强制", "第二次起应保持", "不要删除审计行，否则会再次强制"],
    ["E-12", "Access 打不开", "Java 或文件被占用", "关掉 Access 桌面程序后重启 npm run dev", "不要另存一份 accdb 改名使用"],
  ]);

  add(grid(wb, "09_确认清单", ["No", "角色", "月份", "确认项", "合格"], [8, 14, 16, 55, 40]), [
    [1, "全员", "上月", "红色预警 KPI=3，队列正好三家，步为 10、11、12", "其他店绿色已完成13步泳道"],
    [2, "全员", "2026-09", "与上月同一三家、同样步数", "家数 52/53，无后滩"],
    [3, "全员", "2026-03至08", "红色预警 0", "52 家全部绿色已完成，家数 52/53"],
    [4, "全员", "当月", "53 家第 5 / 13 步", "后滩可见，红预警 0，应付 0.00"],
    [5, "全员", "2026-04", "点该选中月份泳道", "页眉 2026年4月，绿色已完成"],
    [6, "高管", "上月", "排行 52 家，无后滩", "红榜分数均≥50，黑榜为末 20%"],
    [7, "高管", "上月", "闭店表无后滩", "有租约的老店仍在"],
    [8, "营运", "当月", "提交无活动", "进入计算按钮"],
    [9, "财务", "当月", "走完收妥、比对、确认、付款", "绿色已完成，金额等于系统应付"],
    [10, "拓展", "新合同", "示例走到生成店铺", "新店从第 5 步可录入，且 listed 逻辑按新签处理需另改主数据"],
  ]);

  return wb;
}

const spec = buildSpec();
const manual = buildManual();
await spec.xlsx.writeFile(OUT_SPEC);
await manual.xlsx.writeFile(OUT_MANUAL);
const specSheets = spec.worksheets.map((ws) => `${ws.name}:${ws.rowCount - 1}`);
const manualSheets = manual.worksheets.map((ws) => `${ws.name}:${ws.rowCount - 1}`);
console.log(OUT_SPEC);
console.log(specSheets.join("\n"));
console.log(OUT_MANUAL);
console.log(manualSheets.join("\n"));
