# 零售经营系统

按 PRD 泳道和月度租金流程图做成的网站。

- 前端：React
- 后端：Node.js
- 数据库：Microsoft Access 2016 格式，`data/storeops.accdb`，可用 Access 直接打开

财务按上一个自然月结账，页面上这个月叫「上月」。2026 年 11 月 1 日到 30 日仍结 2026 年 10 月，日历上的 11 月还没开始。3 月样本保留。4 月到上月按 3 月的正常水平做了样本浮动，泳道写成完成，卡片只显示绿色「该泳道13步全部完成」。固定有 3 家店的上月泳道未完成，出现在红色预警队列。店卡上是「上月这条泳道」和「当月这条泳道」两个链接；上月走完的店另有绿色「完成上月泳道」。

左侧还有四页 PRD 功能：租金引擎（5.3）、盈利预测（5.4）、每日预警（5.6）、管理驾驶舱（5.8）。租金演示不含增值税。每日预警用 PRD 的 30% / 25% / 20% 租售比，月结账单上的预警仍是 BRD 的 25% 红线。驾驶舱的毛利按销售额的 55% 估算。

店览写入 52 家大陆 Max Mara 主品牌店，分布在 33 个城市。这 52 家已经在 `data/storeops.accdb` 里。每家店的地址、电话、租金和一张门店实景也在这个 Access 文件里：图片在 `store_photos` 表，店铺通过 `photo_id` 指向它。页面左侧会换成当前这家店的照片。浏览器标签图标是深色圆角方块上的白色 MM。经营首页和店览可以按区域、城市、店名、商场、电话筛选。每张店卡在泳道完成时显示绿色「该泳道13步全部完成」，不再逐格列出 1 到 13 步。管理驾驶舱把区域和城市合在一列，并给出按销售额加权的平均利润和加权净利润。附件里已有的店名、地址、电话和旗舰类型按附件保留，其余地址和电话来自品牌门店名录。没有合同原件的租金、面积和月销售是估算。每家店都有一条 2026 年 3 月的样本泳道。本机文件如果还是原来的 3 家，先停掉 `npm run dev` 并关掉 Access，再执行 `git fetch origin` 和 `git checkout origin/cursor/store-ops-web-0eb9 -- store-ops/data/storeops.accdb`。

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
