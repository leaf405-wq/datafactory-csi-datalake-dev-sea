# 零售经营系统

按 PRD 泳道和月度租金流程图做成的网站。

- 前端：React
- 后端：Node.js
- 数据库：Microsoft Access 2016 格式，`data/storeops.accdb`，可用 Access 直接打开

账期固定为 2026 年 3 月。预置三家店，分别停在预警、待录入活动、对账差异三步。新合同从「新签合同」走 1–4 步。

## 运行

只开 http://localhost:5173 而没有启动后面的接口时，页面会停在「请求失败 / 正在打开 Access 数据库…」。接口和页面要一起启动。

```bash
cd store-ops
npm install
npm install --prefix client
npm test
npm run dev
```

看到 `store-ops http://127.0.0.1:3780` 和 `Local: http://localhost:5173/` 之后，再打开 http://localhost:5173 。如果 5173 端口已经被旧的前端占用，先关掉那个窗口再执行。本机需要 Node.js，以及 Java（`java` 在 PATH 里）。没有 `javac` 时会使用仓库里已编译的 class。

## 本机目录

和 GitHub 仓库是同一套目录。把仓库放到 `C:\Users\Hennie.Ye\maxmara` 后，Access 文件就在：

```text
C:\Users\Hennie.Ye\maxmara\store-ops\data\storeops.accdb
C:\Users\Hennie.Ye\maxmara\store-ops\client\
C:\Users\Hennie.Ye\maxmara\store-ops\server\
```

第一次放到这台电脑：

```powershell
cd C:\Users\Hennie.Ye
git clone -b cursor/store-ops-web-0eb9 https://github.com/leaf405-wq/datafactory-csi-datalake-dev-sea.git maxmara
```

这个文件夹已经是仓库时，在 `C:\Users\Hennie.Ye\maxmara` 里执行 `git pull`。需要本机安装 Node.js 和 JDK 17 或以上。用 Microsoft Access 打开 `storeops.accdb` 之前，先停掉 `npm run dev`，避免文件正被占用。


右上角切换拓展部、营运部、财务部、高管。每一步只接受泳道上的那个部门。

租金顺序：是否免租 → 判断模型 → 固定租金、销售额、扣点 → 扣点租金 → 两者取高走 MAX，两者取低走 MIN → 物业/推广/水电 → 扣减补贴 → 增值税 → 应付。合同原文只在本机抽取，不外发。
