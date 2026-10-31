import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { SAMPLE_CONTRACT } from "./parser.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "data", "samples");
const lines = SAMPLE_CONTRACT.trim().split("\n");

function textRuns(line) {
  const parts = [];
  let buf = "";
  let latin = null;
  for (const ch of line) {
    const isLatin = ch.charCodeAt(0) < 128;
    if (latin === null || latin === isLatin) {
      buf += ch;
      latin = isLatin;
    } else {
      parts.push({ latin, text: buf });
      buf = ch;
      latin = isLatin;
    }
  }
  if (buf) parts.push({ latin, text: buf });
  return parts;
}

function xml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function writeDocx() {
  const zip = new JSZip();
  const body = lines.map((line) => `<w:p><w:r><w:t xml:space="preserve">${xml(line)}</w:t></w:r></w:p>`).join("");
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`);
  const bytes = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(path.join(outDir, "上海前滩太古里店租赁合同.docx"), bytes);
}

async function writePdf() {
  const fontPath = "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf";
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const cjk = await pdf.embedFont(fs.readFileSync(fontPath), { subset: true });
  const latin = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595, 842]);
  lines.forEach((line, index) => {
    let x = 48;
    const y = 790 - index * 24;
    for (const part of textRuns(line)) {
      const font = part.latin ? latin : cjk;
      page.drawText(part.text, { x, y, size: 12, font });
      x += font.widthOfTextAtSize(part.text, 12);
    }
  });
  fs.writeFileSync(path.join(outDir, "上海前滩太古里店租赁合同.pdf"), await pdf.save());
}

fs.mkdirSync(outDir, { recursive: true });
await writeDocx();
await writePdf();
console.log("samples ready", outDir);
