# 零售经营系统

按 PRD 泳道和月度租金流程图做成的网站。

- 前端：React
- 后端：Node.js
- 数据库：Microsoft Access 2016 格式，`data/storeops.accdb`，可用 Access 直接打开

账期固定为 2026 年 3 月。预置三家店，分别停在预警、待录入活动、对账差异三步。新合同从「新签合同」走 1–4 步。

## 运行

```bash
cd store-ops
npm install
npm install --prefix client
npm test
npm run dev
```

另开一个终端：

```bash
cd store-ops
npm run client
```

浏览器打开 http://localhost:5173 。接口在 http://127.0.0.1:3780 。

右上角切换拓展部、营运部、财务部、高管。每一步只接受泳道上的那个部门。

租金顺序：是否免租 → 判断模型 → 固定租金、销售额、扣点 → 扣点租金 → 两者取高走 MAX，两者取低走 MIN → 物业/推广/水电 → 扣减补贴 → 增值税 → 应付。合同原文只在本机抽取，不外发。
