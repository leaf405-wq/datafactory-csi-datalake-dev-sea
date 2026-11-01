import { all, insert, update } from "./access.js";
import { calculateRent, saveActivity } from "./workflow.js";

const NOW = "2026-03-01 08:00:00";

export const CATALOG = [
  { id: "st-mixc", code: "SZ-MIXC-008", flow: "keep", name: "深圳万象城店", province: "广东", region: "华南", city: "深圳", mall_name: "深圳万象城", address: "深圳市罗湖区宝安南路1881号深圳万象城一楼157号", phone: "0755-82668037", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "华润万象", floor: "1F", grade: "A", area: 122, selling: 102, gfa: 146, gla: 130, fixed: 114000, rate: 0.12, sales: 964800, mins: 1340000, prop: 18000, promo: 6000, util: 3500, data_note: "店名和地址改为名录中的深圳罗湖万象城。演示对账泳道保留，租金合同不覆盖。" },
  { id: "st-mm-4401063", code: "MM-4401063", flow: "sample", name: "宁波和义大道店", province: "浙江", region: "华东", city: "宁波", mall_name: "和义大道购物中心", address: "海曙区和义路66号和义大道购物中心一楼a区1034-1035号", phone: "0574-87273596", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "和义大道", floor: "1F", grade: "A", area: 92, selling: 77, gfa: 108, gla: 96, fixed: 75000, rate: 0.1, sales: 820000, mins: 770000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401006", code: "MM-4401006", flow: "sample", name: "北京国贸店", province: "北京", region: "华北", city: "北京", mall_name: "国贸商城", address: "北京市朝阳区建国门外大街1号国贸商城一层SL1022、二层SL2029", phone: "010-65055158", hours: "10:00-21:30", store_type: "精品店", listed_from: "名录", landlord: "中国国贸", floor: "1F", grade: "A", area: 130, selling: 108, gfa: 146, gla: 130, fixed: 120000, rate: 0.12, sales: 1500000, mins: 1400000, prop: 18000, promo: 6000, util: 3500, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。附件未写电话，电话用名录 010-65055158。" },
  { id: "st-mm-4401082", code: "MM-4401082", flow: "sample", name: "济南银座商城店", province: "山东", region: "华东", city: "济南", mall_name: "银座商城三期", address: "历下区泺源大街66号银座商城三期一楼", phone: "0531-86065182", hours: "09:30-21:00", store_type: "精品店", listed_from: "名录", landlord: "银座集团", floor: "1F", grade: "B", area: 76, selling: 63, gfa: 84, gla: 72, fixed: 45000, rate: 0.09, sales: 520000, mins: 480000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401112", code: "MM-4401112", flow: "sample", name: "贵阳国贸广场店", province: "贵州", region: "西南", city: "贵阳", mall_name: "国贸广场", address: "云岩区中华北1号国贸广场一层", phone: "0851-86820275", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "贵阳国贸广场（估算）", floor: "1F", grade: "B", area: 80, selling: 66, gfa: 84, gla: 72, fixed: 48000, rate: 0.09, sales: 560000, mins: 510000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401113", code: "MM-4401113", flow: "sample", name: "石家庄先天下店", province: "河北", region: "华北", city: "石家庄", mall_name: "先天下购物广场", address: "长安区中山东路326号先天下购物广场一层", phone: "0311-85936149", hours: "10:00-21:30", store_type: "精品店", listed_from: "名录", landlord: "北国商城", floor: "1F", grade: "B", area: 64, selling: 54, gfa: 84, gla: 72, fixed: 36000, rate: 0.09, sales: 400000, mins: 390000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401240", code: "MM-4401240", flow: "sample", name: "杭州万象城店", province: "浙江", region: "华东", city: "杭州", mall_name: "杭州万象城", address: "杭州市上城区富春路701号万象城购物中心一楼108号", phone: "0571-89705872", hours: "10:00-21:30", store_type: "精品店", listed_from: "名录", landlord: "华润万象", floor: "1F", grade: "A", area: 92, selling: 77, gfa: 108, gla: 96, fixed: 75000, rate: 0.1, sales: 820000, mins: 770000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。附件铺位写 L188，名录现为万象城一楼 108 号。" },
  { id: "st-mm-4401241", code: "MM-4401241", flow: "sample", name: "广州太古汇店", province: "广东", region: "华南", city: "广州", mall_name: "太古汇", address: "广州市天河区天河路383号太古汇商场裙楼L109", phone: "020-38682563", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "太古地产", floor: "1F", grade: "A", area: 130, selling: 108, gfa: 146, gla: 130, fixed: 120000, rate: 0.12, sales: 1500000, mins: 1400000, prop: 18000, promo: 6000, util: 3500, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401369", code: "MM-4401369", flow: "sample", name: "济南贵和购物中心店", province: "山东", region: "华东", city: "济南", mall_name: "济南贵和购物中心", address: "历下区天地坛街1号济南贵和购物中心一层", phone: "0531-80982132", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "贵和集团", floor: "1F", grade: "B", area: 76, selling: 63, gfa: 84, gla: 72, fixed: 45000, rate: 0.09, sales: 520000, mins: 480000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401517", code: "MM-4401517", flow: "sample", name: "三亚海棠湾店", province: "海南", region: "华南", city: "三亚", mall_name: "海棠湾国际购物中心", address: "海棠区海棠北路118号海棠湾国际购物中心", phone: "0898-88816666", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "中免集团（估算）", floor: "1F", grade: "B", area: 80, selling: 66, gfa: 84, gla: 72, fixed: 48000, rate: 0.09, sales: 560000, mins: 510000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401523", code: "MM-4401523", flow: "sample", name: "常州购物中心店", province: "江苏", region: "华东", city: "常州", mall_name: "常州购物中心", address: "天宁区延陵西路1号常州购物中心一层102号", phone: "0519-88162821", hours: "10:00-21:30", store_type: "精品店", listed_from: "名录", landlord: "常州购物中心业主（估算）", floor: "1F", grade: "B", area: 64, selling: 54, gfa: 84, gla: 72, fixed: 36000, rate: 0.09, sales: 400000, mins: 390000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401623", code: "MM-4401623", flow: "sample", name: "郑州丹尼斯大卫城店", province: "河南", region: "华中", city: "郑州", mall_name: "丹尼斯大卫城", address: "金水区二七路150号丹尼斯大卫城一楼1012号", phone: "0371-56558960", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "丹尼斯百货", floor: "1F", grade: "A", area: 92, selling: 77, gfa: 108, gla: 96, fixed: 75000, rate: 0.1, sales: 554400, mins: 770000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401751", code: "MM-4401751", flow: "sample", name: "杭州大厦店", province: "浙江", region: "华东", city: "杭州", mall_name: "杭州大厦购物中心", address: "杭州市拱墅区武林广场1号杭州大厦购物中心B座一楼", phone: "0571-85381719", hours: "10:00-21:30", store_type: "精品店", listed_from: "名录", landlord: "杭州大厦", floor: "1F", grade: "A", area: 96, selling: 80, gfa: 108, gla: 96, fixed: 78000, rate: 0.1, sales: 860000, mins: 800000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401804", code: "MM-4401804", flow: "sample", name: "西安中大国际店", province: "陕西", region: "西北", city: "西安", mall_name: "中大国际商业中心", address: "雁塔区高新路72号中大国际商业中心一楼L125号", phone: "029-88817016", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "中大国际", floor: "1F", grade: "A", area: 100, selling: 83, gfa: 108, gla: 96, fixed: 81000, rate: 0.1, sales: 900000, mins: 830000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401871", code: "MM-4401871", flow: "sample", name: "西安SKP店", province: "陕西", region: "西北", city: "西安", mall_name: "西安SKP", address: "陕西西安长安北路261号 西安SKP二楼A2011号", phone: "029-83698891", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "SKP", floor: "1F", grade: "A", area: 104, selling: 86, gfa: 108, gla: 96, fixed: 84000, rate: 0.1, sales: 940000, mins: 860000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401903", code: "MM-4401903", flow: "sample", name: "哈尔滨松雷商业百货店", province: "黑龙江", region: "东北", city: "哈尔滨", mall_name: "松雷商业百货", address: "南岗区东大直街329号松雷商业百货第一层", phone: "0451-53600246", hours: "09:00-21:30", store_type: "精品店", listed_from: "名录", landlord: "松雷商业", floor: "1F", grade: "B", area: 64, selling: 54, gfa: 84, gla: 72, fixed: 36000, rate: 0.09, sales: 400000, mins: 390000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401920", code: "MM-4401920", flow: "sample", name: "天津万象城店", province: "天津", region: "华北", city: "天津", mall_name: "天津万象城", address: "河西区乐园道9号天津万象城L1-001-3", phone: "022-83887466", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "华润万象", floor: "1F", grade: "A", area: 92, selling: 77, gfa: 108, gla: 96, fixed: 75000, rate: 0.1, sales: 820000, mins: 770000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401020", code: "MM-4401020", flow: "sample", name: "南京德基广场店", province: "江苏", region: "华东", city: "南京", mall_name: "德基广场一期", address: "玄武区中山路18号德基广场一期一层L132号", phone: "025-84764855", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "德基集团", floor: "1F", grade: "A", area: 96, selling: 80, gfa: 108, gla: 96, fixed: 78000, rate: 0.1, sales: 860000, mins: 800000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401056", code: "MM-4401056", flow: "sample", name: "苏州美罗商城店", province: "江苏", region: "华东", city: "苏州", mall_name: "苏州美罗商城南楼", address: "姑苏区观前街245号苏州美罗商城南楼一楼", phone: "0512-69163021", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "美罗集团", floor: "1F", grade: "A", area: 100, selling: 83, gfa: 108, gla: 96, fixed: 81000, rate: 0.1, sales: 900000, mins: 830000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401047", code: "MM-4401047", flow: "sample", name: "乌鲁木齐美美百货店", province: "新疆", region: "西北", city: "乌鲁木齐", mall_name: "友好步行街美美百货", address: "沙依巴克区友好北路689号友好步行街美美百货一层s-112C号", phone: "0991-6999991", hours: "11:00-21:30", store_type: "精品店", listed_from: "名录", landlord: "美美集团", floor: "1F", grade: "B", area: 80, selling: 66, gfa: 84, gla: 72, fixed: 48000, rate: 0.09, sales: 560000, mins: 510000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401059", code: "MM-4401059", flow: "sample", name: "天津海信广场店", province: "天津", region: "华北", city: "天津", mall_name: "天津海信广场", address: "天津市和平区解放北路188号海信广场二层", phone: "022-23198117", hours: "09:00-21:30", store_type: "精品店", listed_from: "名录", landlord: "海信集团", floor: "1F", grade: "A", area: 88, selling: 74, gfa: 108, gla: 96, fixed: 72000, rate: 0.1, sales: 780000, mins: 740000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401150", code: "MM-4401150", flow: "sample", name: "烟台振华商厦店", province: "山东", region: "华东", city: "烟台", mall_name: "振华商厦", address: "芝罘区西大街8号振华商厦一楼", phone: "0535-6589816", hours: "09:30-21:30", store_type: "精品店", listed_from: "名录", landlord: "振华集团", floor: "1F", grade: "B", area: 68, selling: 57, gfa: 84, gla: 72, fixed: 39000, rate: 0.09, sales: 440000, mins: 420000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401177", code: "MM-4401177", flow: "sample", name: "北京金融街店", province: "北京", region: "华北", city: "北京", mall_name: "金融街购物中心", address: "北京市西城区金城坊街2号金融街购物中心一层1006", phone: "010-66290830", hours: "10:00-21:00", store_type: "精品店", listed_from: "名录", landlord: "金融街控股", floor: "1F", grade: "A", area: 130, selling: 108, gfa: 146, gla: 130, fixed: 120000, rate: 0.12, sales: 1008000, mins: 1400000, prop: 18000, promo: 6000, util: 3500, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401179", code: "MM-4401179", flow: "sample", name: "武汉国际广场店", province: "湖北", region: "华中", city: "武汉", mall_name: "武汉国际广场购物中心", address: "江汉区解放大道690号武汉国际广场购物中心一层", phone: "027-85715003", hours: "09:30-21:30", store_type: "精品店", listed_from: "名录", landlord: "武汉国际广场购物中心业主（估算）", floor: "1F", grade: "A", area: 100, selling: 83, gfa: 108, gla: 96, fixed: 81000, rate: 0.1, sales: 900000, mins: 830000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401204", code: "MM-4401204", flow: "sample", name: "呼和浩特维多利国际广场店", province: "内蒙古", region: "华北", city: "呼和浩特", mall_name: "维多利国际广场", address: "新城区新华东街8号维多利国际广场一层", phone: "0471-2823453", hours: "09:00-21:00", store_type: "精品店", listed_from: "名录", landlord: "维多利商业", floor: "1F", grade: "B", area: 80, selling: 66, gfa: 84, gla: 72, fixed: 48000, rate: 0.09, sales: 560000, mins: 510000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401260", code: "MM-4401260", flow: "sample", name: "重庆星光68店", province: "重庆", region: "西南", city: "重庆", mall_name: "重庆星光68广场", address: "重庆市江北区建新北路68号星光68广场一层LA127", phone: "023-63711095", hours: "09:30-22:00", store_type: "精品店", listed_from: "名录", landlord: "协信远创（估算）", floor: "1F", grade: "A", area: 88, selling: 74, gfa: 108, gla: 96, fixed: 72000, rate: 0.1, sales: 780000, mins: 740000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401261", code: "MM-4401261", flow: "sample", name: "太原天美新天地店", province: "山西", region: "华北", city: "太原", mall_name: "山西天美新天地购物广场中心", address: "小店区长风街113号山西天美新天地购物广场中心一层", phone: "0351-8376156", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "天美新天地", floor: "1F", grade: "B", area: 68, selling: 57, gfa: 84, gla: 72, fixed: 39000, rate: 0.09, sales: 440000, mins: 420000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401324", code: "MM-4401324", flow: "sample", name: "沈阳华润万象城店", province: "辽宁", region: "东北", city: "沈阳", mall_name: "沈阳华润万象城", address: "和平区青年大街288号沈阳华润万象城一层139号", phone: "024-31379815", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "华润万象", floor: "1F", grade: "A", area: 100, selling: 83, gfa: 108, gla: 96, fixed: 81000, rate: 0.1, sales: 900000, mins: 830000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401710", code: "MM-4401710", flow: "sample", name: "海口美兰机场店", province: "海南", region: "华南", city: "海口", mall_name: "美兰国际机场候机楼隔离区", address: "美兰区美兰机场路美兰国际机场候机楼隔离区", phone: "400-007-8000", hours: "06:00-23:00", store_type: "机场店", listed_from: "名录", landlord: "机场管理方（估算）", floor: "1F", grade: "B", area: 80, selling: 66, gfa: 84, gla: 72, fixed: 48000, rate: 0.09, sales: 560000, mins: 510000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401822", code: "MM-4401822", flow: "sample", name: "长沙国金中心店", province: "湖南", region: "华中", city: "长沙", mall_name: "长沙国金中心", address: "芙蓉区解放西路270号长沙国金中心商场第一层l123号及第二层l223号", phone: "0731-82272108", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "九龙仓", floor: "1F", grade: "A", area: 88, selling: 74, gfa: 108, gla: 96, fixed: 72000, rate: 0.1, sales: 780000, mins: 740000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401836", code: "MM-4401836", flow: "sample", name: "北京SKP店", province: "北京", region: "华北", city: "北京", mall_name: "北京SKP", address: "北京市朝阳区建国路87号北京SKP三层D3024", phone: "010-85951318", hours: "09:30-22:00", store_type: "精品店", listed_from: "名录", landlord: "SKP", floor: "1F", grade: "A", area: 126, selling: 105, gfa: 146, gla: 130, fixed: 117000, rate: 0.12, sales: 1460000, mins: 1370000, prop: 18000, promo: 6000, util: 3500, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。附件写四层 D4098、电话 010-85959622；铺位和电话以名录的三层 D3024、010-85951318 为准。" },
  { id: "st-mm-4401019", code: "MM-4401019", flow: "sample", name: "长春卓展时代广场店", province: "吉林", region: "东北", city: "长春", mall_name: "长春卓展时代广场C座", address: "朝阳区重庆路1255号长春卓展时代广场C座一楼1103-1104号", phone: "0431-88486785", hours: "10:00-21:30", store_type: "精品店", listed_from: "名录", landlord: "卓展集团", floor: "1F", grade: "B", area: 72, selling: 60, gfa: 84, gla: 72, fixed: 42000, rate: 0.09, sales: 480000, mins: 450000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401026", code: "MM-4401026", flow: "sample", name: "青岛海信广场店", province: "山东", region: "华东", city: "青岛", mall_name: "海信广场", address: "市南区东海西路50号海信广场一层", phone: "0532-66788196", hours: "10:00-21:30", store_type: "精品店", listed_from: "名录", landlord: "海信集团", floor: "1F", grade: "A", area: 100, selling: 83, gfa: 108, gla: 96, fixed: 81000, rate: 0.1, sales: 597600, mins: 830000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401136", code: "MM-4401136", flow: "sample", name: "上海港汇恒隆广场店", province: "上海", region: "华东", city: "上海", mall_name: "港汇恒隆广场", address: "上海市徐汇区虹桥路1号港汇恒隆广场一楼131-133号", phone: "021-54510698", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "恒隆地产", floor: "1F", grade: "A", area: 138, selling: 114, gfa: 146, gla: 130, fixed: 126000, rate: 0.12, sales: 1580000, mins: 1460000, prop: 18000, promo: 6000, util: 3500, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401259", code: "MM-4401259", flow: "sample", name: "哈尔滨卓展购物中心店", province: "黑龙江", region: "东北", city: "哈尔滨", mall_name: "哈尔滨卓展购物中心", address: "道里区安隆街106号哈尔滨卓展购物中心一层l1121号", phone: "0451-87737197", hours: "10:00-21:00", store_type: "精品店", listed_from: "名录", landlord: "卓展集团", floor: "1F", grade: "B", area: 64, selling: 54, gfa: 84, gla: 72, fixed: 36000, rate: 0.09, sales: 400000, mins: 390000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401945", code: "MM-4401945", flow: "sample", name: "合肥银泰百货店", province: "安徽", region: "华东", city: "合肥", mall_name: "合肥银泰百货", address: "庐阳区长江中路98号合肥银泰百货1楼", phone: "0551-62620232", hours: "09:30-22:00", store_type: "精品店", listed_from: "名录", landlord: "银泰商业", floor: "1F", grade: "A", area: 92, selling: 77, gfa: 108, gla: 96, fixed: 75000, rate: 0.1, sales: 820000, mins: 770000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401374", code: "MM-4401374", flow: "sample", name: "上海K11店", province: "上海", region: "华东", city: "上海", mall_name: "上海k11购物艺术中心", address: "黄浦区淮海中路300号上海k11购物艺术中心一层101号", phone: "021-63151237", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "新世界", floor: "1F", grade: "A", area: 130, selling: 108, gfa: 146, gla: 130, fixed: 120000, rate: 0.12, sales: 1500000, mins: 1400000, prop: 18000, promo: 6000, util: 3500, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401416", code: "MM-4401416", flow: "sample", name: "南宁华润万象城店", province: "广西", region: "华南", city: "南宁", mall_name: "南宁华润中心万象城", address: "青秀区民族大道136号南宁华润中心万象城第l1层112号", phone: "0771-5670871", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "华润万象", floor: "1F", grade: "B", area: 76, selling: 63, gfa: 84, gla: 72, fixed: 45000, rate: 0.09, sales: 520000, mins: 480000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401421", code: "MM-4401421", flow: "sample", name: "成都国际金融中心店", province: "四川", region: "西南", city: "成都", mall_name: "国际金融中心", address: "锦江区红星路3段1号国际金融中心二层L215号", phone: "028-86511905", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "九龙仓", floor: "1F", grade: "A", area: 104, selling: 86, gfa: 108, gla: 96, fixed: 84000, rate: 0.1, sales: 940000, mins: 860000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401812", code: "MM-4401812", flow: "sample", name: "重庆国金中心店", province: "重庆", region: "西南", city: "重庆", mall_name: "重庆国金中心", address: "江北区江北城北大街38号重庆国金中心三层l322号", phone: "023-67659353", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "九龙仓", floor: "1F", grade: "A", area: 92, selling: 77, gfa: 108, gla: 96, fixed: 75000, rate: 0.1, sales: 820000, mins: 770000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401891", code: "MM-4401891", flow: "sample", name: "重庆万象城店", province: "重庆", region: "西南", city: "重庆", mall_name: "万象城", address: "九龙坡区谢家湾正街53号万象城一楼l170号", phone: "023-62633686", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "华润万象", floor: "1F", grade: "A", area: 96, selling: 80, gfa: 108, gla: 96, fixed: 78000, rate: 0.1, sales: 860000, mins: 800000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401904", code: "MM-4401904", flow: "sample", name: "厦门万象城店", province: "福建", region: "华东", city: "厦门", mall_name: "厦门万象城", address: "思明区湖滨东路99号厦门万象城L115号", phone: "0592-5888673", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "华润万象", floor: "1F", grade: "A", area: 100, selling: 83, gfa: 108, gla: 96, fixed: 81000, rate: 0.1, sales: 900000, mins: 830000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401930", code: "MM-4401930", flow: "sample", name: "上海环贸iapm店", province: "上海", region: "华东", city: "上海", mall_name: "上海环贸广场", address: "徐汇区淮海中路999号上海环贸广场L1-121号", phone: "021-64161109", hours: "10:00-23:00", store_type: "精品店", listed_from: "名录", landlord: "恒隆地产", floor: "1F", grade: "A", area: 126, selling: 105, gfa: 146, gla: 130, fixed: 117000, rate: 0.12, sales: 1460000, mins: 1370000, prop: 18000, promo: 6000, util: 3500, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401927", code: "MM-4401927", flow: "sample", name: "成都银泰中心店", province: "四川", region: "西南", city: "成都", mall_name: "成都银泰中心", address: "成都市高新区天府大道北段1199号成都银泰中心一层106号", phone: "028-86696090", hours: "09:30-22:00", store_type: "精品店", listed_from: "名录", landlord: "银泰商业", floor: "1F", grade: "A", area: 96, selling: 80, gfa: 108, gla: 96, fixed: 78000, rate: 0.1, sales: 860000, mins: 800000, prop: 10000, promo: 3500, util: 2200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401956", code: "MM-4401956", flow: "sample", name: "上海静安嘉里中心店", province: "上海", region: "华东", city: "上海", mall_name: "静安嘉里中心", address: "上海市静安区南京西路1515号静安嘉里中心1层N1-06", phone: "021-62107725", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "嘉里建设", floor: "1F", grade: "A", area: 134, selling: 111, gfa: 146, gla: 130, fixed: 123000, rate: 0.12, sales: 1540000, mins: 1430000, prop: 18000, promo: 6000, util: 3500, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401966", code: "MM-4401966", flow: "sample", name: "呼和浩特振华广场店", province: "内蒙古", region: "华北", city: "呼和浩特", mall_name: "振华国际广场", address: "呼和浩特市锡林郭勒南路37号振华国际广场一层1-16", phone: "155-9829-8822", hours: "09:30-21:30", store_type: "精品店", listed_from: "名录", landlord: "振华集团", floor: "1F", grade: "B", area: 80, selling: 66, gfa: 84, gla: 72, fixed: 48000, rate: 0.09, sales: 560000, mins: 510000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-mm-4401935", code: "MM-4401935", flow: "sample", name: "无锡恒隆广场店", province: "江苏", region: "华东", city: "无锡", mall_name: "无锡恒隆广场", address: "无锡市梁溪区人民中路139号无锡恒隆广场", phone: "0510-82739954", hours: "09:30-22:00", store_type: "精品店", listed_from: "名录", landlord: "恒隆地产", floor: "1F", grade: "B", area: 64, selling: 54, gfa: 84, gla: 72, fixed: 36000, rate: 0.09, sales: 400000, mins: 390000, prop: 5500, promo: 1800, util: 1200, data_note: "地址和电话来自 Max Mara 门店名录。租金、面积、月销售没有合同原件，按城市级别估算。" },
  { id: "st-taikoo", code: "SH-IXT-001", flow: "keep", name: "上海兴业太古汇店", province: "上海", region: "华东", city: "上海", mall_name: "兴业太古汇", address: "上海市静安区石门一路288号兴业太古汇", phone: "021-62127730", hours: "10:00-22:00", store_type: "精品店", listed_from: "名录", landlord: "太古地产", floor: "1F", grade: "A", area: 126, selling: 108, gfa: 140, gla: 126, fixed: 120000, rate: 0.12, sales: 1500000, mins: 2000000, prop: 20000, promo: 8000, util: 5000, data_note: "地址和电话按门店名录补齐。演示泳道和原来的租金合同保留。" },
  { id: "st-sanlitun", code: "BJ-SLT-001", flow: "sample", name: "北京三里屯太古里精品店", province: "北京", region: "华北", city: "北京", mall_name: "三里屯太古里", address: "北京市朝阳区三里屯太古里北区N3-13、23号", phone: "010-65055158", hours: "10:00-22:00", store_type: "旗舰店", listed_from: "附件", landlord: "太古地产", floor: "1F", grade: "A", area: 325, selling: 280, gfa: 360, gla: 325, fixed: 220000, rate: 0.12, sales: 2600000, mins: 2400000, prop: 26000, promo: 10000, util: 5000, data_note: "店名、地址、电话、营业时间和旗舰类型按附件。计租面积 325 平方米来自 2026 年 4 月公开报道。月销售和租金条款没有合同原件，按旗舰店估算。名录的 52 家里没有单列这一家。" },
  { id: "st-oriental", code: "BJ-DF-001", flow: "sample", name: "北京东方广场店", province: "北京", region: "华北", city: "北京", mall_name: "东方新天地", address: "北京市东城区东长安街1号东方广场东方新天地一层A402", phone: "010-85186841", hours: "10:00-22:00", store_type: "精品店", listed_from: "附件", landlord: "香港置地（估算）", floor: "1F", grade: "A", area: 110, selling: 92, gfa: 124, gla: 110, fixed: 100000, rate: 0.11, sales: 1200000, mins: 1100000, prop: 14000, promo: 4000, util: 2500, data_note: "店名、地址、电话按附件。营业时间附件为空，按 10:00-22:00 估算。名录的 52 家里没有这一家。租金、面积、月销售为估算。" },
  { id: "st-qiantan", code: "SH-QT-001", flow: "sample", name: "上海前滩太古里店", province: "上海", region: "华东", city: "上海", mall_name: "前滩太古里", address: "上海市浦东新区东育路前滩太古里", phone: "", hours: "10:00-22:00", store_type: "精品店", listed_from: "附件", landlord: "太古地产", floor: "1F", grade: "A", area: 98, selling: 86, gfa: 110, gla: 98, fixed: 90000, rate: 0.11, sales: 980000, mins: 900000, prop: 12000, promo: 4000, util: 2500, data_note: "店名、商场、地址按附件。附件没有电话，这里留空，不编造号码。营业时间按 10:00-22:00 估算。租金、面积、月销售为估算。" },
  { id: "st-chengdu", code: "CD-TKL-014", flow: "keep", name: "成都太古里店", province: "四川", region: "西南", city: "成都", mall_name: "成都太古里", address: "成都市锦江区中纱帽街8号成都太古里2栋1111、2111号", phone: "028-86666705", hours: "10:00-22:00", store_type: "旗舰店", listed_from: "附件", landlord: "太古地产", floor: "1F", grade: "A", area: 88, selling: 76, gfa: 96, gla: 88, fixed: 90000, rate: 0.1, sales: 620000, mins: 1000000, prop: 9000, promo: 3000, util: 1800, data_note: "店名、地址、营业时间和旗舰类型按附件。电话 028-86666705 来自成都市太古里官网。演示泳道仍用原来的免租合同，不覆盖。" },
];

export function catalogSummary() {
  return {
    stores: CATALOG.length,
    cities: new Set(CATALOG.map((item) => item.city)).size,
    fromSheet: CATALOG.filter((item) => item.listed_from === "附件").length,
  };
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function floorOf(item) {
  const text = `${item.address || ""} ${item.mall_name || ""}`;
  if (text.includes("三层") || text.includes("三楼")) return "3F";
  if (text.includes("二层") || text.includes("二楼")) return "2F";
  return "1F";
}

function profile(item) {
  return {
    name: item.name,
    brand: "主品牌",
    province: item.province,
    region: item.region,
    city: item.city,
    mall_name: item.mall_name,
    address: item.address,
    phone: item.phone,
    hours: item.hours,
    store_type: item.store_type,
    listed_from: item.listed_from,
    data_note: item.data_note,
    landlord: item.landlord,
    grade: item.grade,
    floor: floorOf(item),
  };
}

/** Insert any catalog store that is not already in Access, and refresh address fields on matches. */
export async function ensureCatalog() {
  const stores = await all("stores");
  const byCode = new Map(stores.map((row) => [row.code, row]));
  const byName = new Map(stores.map((row) => [row.name, row]));
  let added = 0;
  for (let index = 0; index < CATALOG.length; index += 1) {
    const item = CATALOG[index];
    const existing = byCode.get(item.code) || byName.get(item.name);
    if (existing) {
      await update("stores", existing.id, profile(item));
      byCode.set(item.code, existing);
      byName.set(item.name, existing);
      continue;
    }
    const endYear = 2027 + (index % 3);
    const endMonth = (index % 12) + 1;
    const startYear = 2018 + (index % 6);
    await insert("stores", {
      id: item.id,
      code: item.code,
      status: "NORMAL_OPERATION",
      keep_decision: "待评估",
      rank: "LFL",
      action_plan: "",
      area_sqm: item.area,
      selling_area: item.selling,
      gfa: item.gfa,
      gla: item.gla,
      lease_end: `${endYear}-${pad(endMonth)}-28`,
      lifecycle_start: `${startYear}-03-01`,
      ...profile(item),
    });
    await insert("contracts", {
      id: `ct-${item.id}`,
      store_id: item.id,
      contract_no: item.code,
      status: "EFFECTIVE",
      raw_text: "",
      model: "HIGHER_OF_TWO",
      fixed_rent: item.fixed,
      rate: item.rate,
      min_sales: item.mins,
      min_rent: 0,
      overage_rate: item.rate,
      cap_amount: 0,
      tiers_json: "[]",
      rent_free_start: "",
      rent_free_end: "",
      waive_property: 0,
      property_fee: item.prop,
      promo_fee: item.promo,
      utility_fee: item.util,
      vat_rate: 0.09,
      start_date: `${startYear}-03-01`,
      end_date: `${endYear}-${pad(endMonth)}-28`,
      version: 1,
      confidence: 1,
      confirmed_by: "样本名录",
      created_at: NOW,
    });
    await insert("sales_monthly", {
      id: `sa-${item.id}`,
      store_id: item.id,
      year: 2026,
      month: 3,
      sales: item.sales,
      source: "样本估算",
    });
    await insert("journey", {
      id: `${item.id}-2026-3`,
      store_id: item.id,
      year: 2026,
      month: 3,
      step: 4,
      updated_at: NOW,
    });
    if (index % 6 !== 0) {
      await saveActivity({
        role: "admin",
        actor: "系统",
        storeId: item.id,
        activityNote: "样本月，无特殊活动",
        subsidy: 0,
      });
      await calculateRent({ role: "admin", actor: "系统", storeId: item.id });
    }
    added += 1;
    byCode.set(item.code, { id: item.id, code: item.code });
    byName.set(item.name, { id: item.id, name: item.name });
  }
  return { total: CATALOG.length, added };
}

