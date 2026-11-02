import assert from "node:assert/strict";
import test from "node:test";
import { extractText } from "./importFile.js";
import { readContractFile } from "./importFile.js";

test("示例 Word 和 PDF 导入后能看到合同正文", async () => {
  for (const sample of ["docx", "pdf"]) {
    const result = await readContractFile({ sample });
    assert.match(result.text, /合同编号：SH-IXT-2026-014/);
    assert.match(result.text, /店铺名称：上海前滩太古里店/);
    assert.match(result.text, /扣点比例：11%/);
    assert.equal(result.cabinet, "data/contracts");
    assert.ok(result.storedAs.endsWith(sample === "docx" ? ".docx" : ".pdf"));
  }
});

test("不支持的格式会拒绝", async () => {
  await assert.rejects(() => extractText("合同.doc", Buffer.from("x")), /Word（\.docx）或 PDF/);
});
