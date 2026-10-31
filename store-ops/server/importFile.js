import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const samplesDir = path.join(root, "data", "samples");
const cabinetDir = path.join(root, "data", "contracts");

const SAMPLES = {
  docx: "上海前滩太古里店租赁合同.docx",
  pdf: "上海前滩太古里店租赁合同.pdf",
};

export async function readContractFile({ filename, contentBase64, sample }) {
  const loaded = loadBytes({ filename, contentBase64, sample });
  const extracted = await extractText(loaded.filename, loaded.bytes);
  const storedAs = storeOriginal(loaded.filename, loaded.bytes);
  return {
    filename: loaded.filename,
    storedAs,
    text: extracted.text,
    reader: extracted.reader,
    cabinet: "data/contracts",
  };
}

export async function extractText(filename, bytes) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".docx") {
    return { text: await docxText(bytes), reader: "Word 文字层" };
  }
  if (ext === ".pdf") {
    const text = await pdfText(bytes);
    return { text, reader: text ? "PDF 文字层" : "没有文字层" };
  }
  if (ext === ".txt") {
    return { text: Buffer.from(bytes).toString("utf8").trim(), reader: "文本" };
  }
  const error = new Error("请导入 Word（.docx）或 PDF。");
  error.status = 400;
  throw error;
}

function loadBytes({ filename, contentBase64, sample }) {
  if (sample) {
    const name = SAMPLES[sample];
    if (!name) {
      const error = new Error("示例只提供 Word 和 PDF。");
      error.status = 400;
      throw error;
    }
    return { filename: name, bytes: fs.readFileSync(path.join(samplesDir, name)) };
  }
  const name = path.basename(String(filename || ""));
  if (!name || !contentBase64) {
    const error = new Error("请选择一份 Word 或 PDF。");
    error.status = 400;
    throw error;
  }
  return { filename: name, bytes: Buffer.from(String(contentBase64), "base64") };
}

function storeOriginal(filename, bytes) {
  fs.mkdirSync(cabinetDir, { recursive: true });
  const safe = filename.replace(/[^\w.\u4e00-\u9fff-]+/g, "_");
  const stored = `${Date.now()}-${safe}`;
  fs.writeFileSync(path.join(cabinetDir, stored), bytes);
  return stored;
}

async function docxText(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const file = zip.file("word/document.xml");
  if (!file) {
    const error = new Error("这份 Word 里没有正文。");
    error.status = 400;
    throw error;
  }
  const xml = await file.async("string");
  const lines = xml.split(/<w:p[\s>]/).slice(1).map((paragraph) => {
    const texts = [...paragraph.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((match) => decodeXml(match[1]));
    return texts.join("");
  }).filter(Boolean);
  return lines.join("\n").trim();
}

async function pdfText(bytes) {
  const doc = await getDocument({
    data: new Uint8Array(bytes),
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: false,
  }).promise;
  const lines = [];
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    let row = "";
    let lastY = null;
    for (const item of content.items) {
      if (!item.str) continue;
      const y = item.transform?.[5];
      if (lastY != null && y != null && Math.abs(y - lastY) > 4 && row.trim()) {
        lines.push(row.trim());
        row = "";
      }
      row += item.str;
      if (y != null) lastY = y;
    }
    if (row.trim()) lines.push(row.trim());
  }
  await doc.destroy();
  return lines.join("\n").trim();
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
