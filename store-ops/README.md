# 零售经营系统

按 PRD 泳道和月度租金流程图做成的网站。

- 前端：React
- 后端：Node.js
- 数据库：Microsoft Access 2016 格式，`data/storeops.accdb`，可用 Access 直接打开

财务按上一个自然月结账，页面默认停在「上月」。2026 年 11 月 1 日到 30 日仍结 2026 年 10 月。3 月到 8 月的泳道全部完成，显示绿色「已完成13步泳道」。9 月和上月各有 3 家店停在第 10、11、12 步，红色预警是 3。当月从第 5 步开始。上海后滩太古里店是 2026 年 11 月新签，之前的月份显示 52 / 53 家，不进红榜、黑榜，开业前 6 个月不做闭店考核。店卡只有「该选中月份泳道」。浏览器标签是「MaxMara经营系统」。每日预警的严重标签是绿色。管理驾驶舱的红榜是综合分前 20% 且不低于 50 分，黑榜是综合分后 20%。

左侧还有四页 PRD 功能：租金引擎（5.3）、盈利预测（5.4）、每日预警（5.6）、管理驾驶舱（5.8）。租金演示不含增值税。每日预警用 PRD 的 30% / 25% / 20% 租售比，月结账单上的预警仍是 BRD 的 25% 红线。驾驶舱的毛利按销售额的 55% 估算。

店览写入 52 家大陆 Max Mara 主品牌店，分布在 33 个城市。这 52 家已经在 `data/storeops.accdb` 里。每家店的地址、电话、租金和一张门店实景也在这个 Access 文件里：图片在 `store_photos` 表，店铺通过 `photo_id` 指向它。页面左侧会换成当前这家店的照片。浏览器标签图标是深色圆角方块上的白色 MM。经营首页和店览可以按区域、城市、店名、商场、电话筛选。每张店卡在泳道完成时显示绿色「已完成13步泳道」。店卡链接是「该选中月份泳道」。管理驾驶舱把区域和城市合在一列，并给出按销售额加权的平均利润和加权净利润。附件里已有的店名、地址、电话和旗舰类型按附件保留，其余地址和电话来自品牌门店名录。没有合同原件的租金、面积和月销售是估算。原有 52 家都有一条 2026 年 3 月的样本泳道。上海后滩太古里店从 2026 年 11 月起才有记录。本机文件如果还是原来的 3 家，先停掉 `npm run dev` 并关掉 Access，再执行 `git fetch origin` 和 `git checkout origin/cursor/store-ops-web-0eb9 -- store-ops/data/storeops.accdb`。

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

看到 `ready lanes` 和 `store-ops http://127.0.0.1:3780` 后再开浏览器。

浏览器地址用 **http://127.0.0.1:3780/** 。开发时这个地址会打开同一套经营页面，接口也在这个端口。`http://127.0.0.1:5173/` 仍然可以直接打开页面。只开页面、不跑 `npm run dev` 时，页面会停在「正在打开 Access 数据库…」。

仓库里的路径是：

```text
store-ops/client/
store-ops/server/
store-ops/data/storeops.accdb
```

已经克隆过时，在仓库根目录执行 `git pull origin cursor/store-ops-web-0eb9`，再进入 `store-ops` 重新 `npm run dev`。3780、5173 或 9091 被占用时，先在原来的终端按 Ctrl+C 停掉上一次的 `npm run dev`。那个终端已经关掉时，在 `store-ops` 目录执行 `lsof -tiTCP:3780 -tiTCP:5173 -tiTCP:9091 | xargs kill`，然后再执行 `npm run dev`。用 Microsoft Access 打开 `storeops.accdb` 之前也要先停掉它，避免文件被占用。


## 微信小程序

`miniprogram/` 是同一套经营功能的微信小程序。页面包括经营首页、新签合同、店览宽表、13 步泳道、租金引擎、盈利预测、每日预警和管理驾驶舱。读写仍走本机 `http://127.0.0.1:3780`，数据还是 `data/storeops.accdb`。手机开发者工具不直接打开 Access。

先在 `store-ops` 目录执行 `npm run dev`，再执行 `npm run wechat`。这条命令把小程序拷进 `~/WeChatProjects/maxmara-store-ops`，并把这台电脑的局域网地址写进那份拷贝。本地预览用测试号，详情里勾选不校验合法域名。`npm run wechat` 不会拿 touristappid 去调开发者工具命令行打开项目；`WECHAT_APPID` 只在正式打开和上传时设置。开发服务监听 `0.0.0.0:3780`，浏览器仍用 `http://127.0.0.1:3780/`。开发者工具连不上 `127.0.0.1` 时，会再试 `localhost` 和局域网地址。红字可以点一下重试。长按标题可以改接口地址。改完监听方式后要重新运行 `npm run dev`。这是本机演示，不要把 3780 暴露到公网。

发布到微信、以后在微信里更新，用正式 AppID，不能用测试号：

1. 管理员微信打开 https://mp.weixin.qq.com 注册小程序，复制 AppID。
2. 在 `store-ops` 执行 `WECHAT_APPID=wx你的AppID npm run wechat:upload`。开发者工具要先用这个小程序的管理员或开发者扫码登录，设置里的服务端口要开着。
3. 打开 https://mp.weixin.qq.com → 管理 → 版本管理，把刚上传的开发版本提交审核，通过后点发布。
4. 下次改完再执行 `npm run wechat:upload`，然后仍在版本管理里提交并发布。用户在微信里打开时会提示重启更新。

手机访问不到 `127.0.0.1`。线上要用已备案的 https 接口域名，填进公众平台的 request 合法域名，并在小程序里长按标题改成这个地址。数据仍是同一套接口背后的 Access 库。

右上角切换拓展部、营运部、财务部、高管。每一步只接受泳道上的那个部门。

租金顺序：是否免租 → 判断模型 → 固定租金、销售额、扣点 → 扣点租金 → 两者取高走 MAX，两者取低走 MIN → 物业/推广/水电 → 扣减补贴 → 增值税 → 应付。合同原文只在本机抽取，不外发。
