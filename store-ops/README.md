# 零售经营系统

按 PRD 泳道和月度租金流程图做成的网站。

- 前端：React
- 后端：Node.js
- 数据库：Microsoft Access 2016 格式，`data/storeops.accdb`，可用 Access 直接打开

账期固定为 2026 年 3 月。预置三家店，分别停在预警、待录入活动、对账差异三步。新合同从「新签合同」走 1–4 步。

## 在 Mac 上从 GitHub 运行

先确认终端里这两条都有版本号：

```bash
node --version
java -version
```

需要 Node.js，以及 JDK 17 或以上（Temurin 或系统自带的 Java 都可以）。`java` 必须在 PATH 里。没有 `javac` 时会使用仓库里已经编译好的 class。

目录跟 GitHub 上一样，克隆到任意文件夹即可：

```bash
git clone -b cursor/store-ops-web-0eb9 https://github.com/leaf405-wq/datafactory-csi-datalake-dev-sea.git
cd datafactory-csi-datalake-dev-sea/store-ops
npm install
npm install --prefix client
npm run dev
```

看到下面两行后再开浏览器：

```text
store-ops http://127.0.0.1:3780
打开 http://127.0.0.1:5173/
```

浏览器地址用 **http://127.0.0.1:5173/** 。`npm run dev` 会同时启动接口和页面。只打开页面、不跑这条命令时，页面会停在「正在打开 Access 数据库…」。

仓库里的路径是：

```text
store-ops/client/
store-ops/server/
store-ops/data/storeops.accdb
```

已经克隆过时，在仓库根目录执行 `git pull origin cursor/store-ops-web-0eb9`，再进入 `store-ops` 重新 `npm run dev`。5173 或 3780 被占用时，先在原来的终端按 Ctrl+C 停掉上一次的 `npm run dev`。用 Microsoft Access 打开 `storeops.accdb` 之前也要先停掉它，避免文件被占用。


右上角切换拓展部、营运部、财务部、高管。每一步只接受泳道上的那个部门。

租金顺序：是否免租 → 判断模型 → 固定租金、销售额、扣点 → 扣点租金 → 两者取高走 MAX，两者取低走 MIN → 物业/推广/水电 → 扣减补贴 → 增值税 → 应付。合同原文只在本机抽取，不外发。
