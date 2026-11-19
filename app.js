/* 微记 · 正式版 P3.18
 * 渲染管线沿用已验证的原型 v0.2（见 _proto/ 快照），在其上完成 P1/P2：
 *   - 数据层重构为 HANDOFF §三 的 v2 模型（version / granularity / duration /
 *     pool + shifts + rotation 占位），遵守五条不变量：
 *     1) item.start = 当日绝对分钟 0–1439   2) 粒度永不写入 item
 *     3) overdue 为派生态不入库             4) "今天"归属按班次日（shiftDateOf）
 *     5) 原日数据永不删；跨天不自动搬运，顺延池只保留手动放回
 *   - CRUD 补全：单事项行内改名（原型只能删了重加）
 *   - 存储健壮性：启动自检 + 写入失败常驻告警条（可重试）
 *   - 原生 confirm() 换自定义确认面板
 *   - P2：顺延池、日期切换打磨、3 步引导、空态
 *   - P2.1：轨道风格（蛇形/大弧/直线/折线），仅改渲染坐标；"现在"每 30 秒跟上并响应切前台
 *   - P2.2：横向模式（时间从左到右，事项按 duration 画泳道条），顶栏 ⇄ 切换，风格保留
 *   - P2.3：连线改用自然样条（Catmull-Rom 切线），蛇形放缓为两个来回，折线拐角圆角
 *   - P2.4：时段按完成比例叠绿（1/2、2/3、3/5…），时间标签旁加状态表情
 *   - P2.5：取消跨天自动搬运，未完成事项不再自动进顺延池；池只保留历史条目的手动放回
 *   - P2.6：顺延池改为纯手动入池（事项「⋯」→「放入顺延池」，固定 id 幂等），无任何自动路径
 *   - P3.1：班次模板（新建/改名/删除/一键套用）+ 轮转（周期 + 锚定日期，按日期取模板）；
 *           查看日的起点改为 startOfKey(viewKey())，事项仍存绝对分钟，不随起点搬家
 *   - P3.2：班次日志（交接 / 异常），按班次日归属，底栏入口，可新增与单条删除
 *   - P3.3：JSON 导出 / 导入（含 days / pool / logs / shifts / rotation / settings），
 *           导入先校验再确认覆盖，走与启动相同的 normalize
 *   - P3.4：PWA —— manifest + 图标 + service worker（外壳预缓存、导航网络优先、离线回落），
 *           设置页「安装到桌面」；仅在 https / localhost 下生效
 *   - P3.5：表情修正 —— 一个时段全部完成就显示 🎉（原先「时段已过」会显示 👍）
 *   - P3.6：班次日志改为「今日小记」——类型 highlight(✨今日高光) / review(🌱今日复盘)，
 *           旧值 handover→highlight、issue→review 在 normalize 迁移
 *   - P3.7：设置页通用化 —— 「日程名称 / 日程模板 / 按天轮换」取代班次说法，起点增加自定义，
 *           模板与轮换收进默认折叠的「进阶」区
 *   - P3.8：品牌改名「微记」—— 标题 / manifest / 桌面名 / 引导 / 备份文件名统一，
 *           图标换成深底「微记」字标 + 轨道折线
 *   - P3.8.1：安装入口常驻 —— 不再依赖 beforeinstallprompt；已装显示「已安装」，
 *           拿不到 prompt 时给浏览器菜单引导；manifest 加版本查询串强制刷新
 *   - P3.8.2：底栏重排 —— 「小记 N」升为 13px 胶囊并移到粒度切换同排，「回到现在」缩为 12px
 *   - P3.9：小记第三个分类「＋ 自定义」—— 单类型，4 字名 + 表情，点已选胶囊改名
 *   - P3.9.1：自定义小记的图标/名字记录时定格 —— 改类型只影响新条目，旧条目不回头改写
 *   - P3.10：小记左滑删除（P3.11 已整体回退为常驻 ✕）
 *   - P3.10.1：图标字标试换楷体（已被 P3.10.2 回退）
 *   - P3.10.2：图标回退为黑体；删除按钮显隐修正
 *   - P3.10.3：左滑手势改用 touch 事件 + 延迟定向
 *   - P3.11：删除回归唯一入口 —— 每行常驻 ✕，点开确认框；去掉全部滑动手势与相关样式
 *   - P3.12：备份提醒（有数据且 7 天未导出时设置页提示）+ 顶栏日期后追加节日名（2026–2028 固定表）
 *   - P3.13：日历选天 —— 点顶栏日期弹出月历，任意跳转，有记录的日子带小点
 *   - P3.13.1：顶栏改不透明纯色，修 iOS 主屏运行日期文字发虚
 *   - P3.14：节日按放假区间显示 —— 顶栏「国庆假期 第3天」，区间为通常长度，不含调休
 *   - P3.15：浅色模式 —— 跟随系统 / 深色 / 浅色三选一，只重设主题变量
 *   - P3.16：进阶区卡片化 —— 默认折叠为一张卡片，展开后分组
 *   - P3.18：iOS 27 主屏 PWA 顶部陈旧模糊自愈（WebKit 324438）；日历加年份层（前后各一年）
 *   - P3.19：顶栏节日只显示节日名（国庆节），去掉「假期 / 第N天」，日期行降到 14px；
 *           顶栏文字去掉 ellipsis / 半像素对齐，修 iOS 主屏日期发虚
 *   - P3.20：iOS 状态栏改 default —— 主屏内容整体退到状态栏下方，从根上离开系统模糊带；
 *           移除 P3.18 的 cover/panel 自愈（已证伪）
 *   - P3.21：iOS 主屏改日期后顶栏文字发虚的定向修复 —— 换日改成先收日历、下一帧再渲染，
 *           日期文字变化后叠一块 1.2% 全屏层做一次透明度过渡，逼系统重栅格化
 *   - P3.22：顶栏两行文字提升为独立合成层 + 每次改写都换新文本节点；
 *           换日后把 .titlewrap 摘下来再接回去，强制重建布局对象与图层（实机仍模糊）
 *   - P3.23：日期两行移出顶栏 —— 顶栏只留图标，日期改作轨道上方的 .dayhead
 *           （滚动内容的第一个块，可点击开日历），彻底离开顶栏那条带
 *   - P3.24：顶栏只剩四个图标，放大到 44px 触达区；‹ › 相邻成对放左边，
 *           ⇄ ⚙ 放右边，不再一左一右拉开
 *   - P3.25：图标条与日期条合成一个视觉块（同底色、中间不画线、上下留白收紧）
 *   - P3.26：发虚诊断实验 B —— .topbar 临时下移 60px，验证「越靠近屏幕顶边越会被
 *           按错比例栅格化」；纯诊断，测完回滚
 *   - P3.27：实验 B 成立（60px 内必虚）→ 顶栏顶部改为 60px 纯色安全垫，图标与日期
 *           合并成安全线下方的一条：‹ › 在左、日期居中、⇄ ⚙ 在右
 *   - P3.28：安全垫里加一条极淡的轨道曲线作品牌带（纯图形、无文字，指针穿透）
 *   - P3.29：演示数据换成大众日常事项（晨跑/早饭/周报/邮件/整理桌面），
 *           不再出现行业场景词
 *   - P3.30：记录页 —— 顶栏右滑（跟手）或底栏「记录」打开；上半是当天长文，
 *           边写边存，下半是当天速记，可直接补记一条
 *   - P3.31：删掉「进阶 · 多套日程」，起点回到设置里手选；小记页签移到输入框
 *           上方并标「记成」；新增文本导出（当天 / 全部，UTF-8 txt，不可导回）
 *   - P3.32：顶部滑条 —— 住进 64px 安全线（发虚区只放图形、不放文字），圆钮
 *           拖过半松手切页，记录页带内镜像滑条返回；P3.30 的隐形滑动手势删除
 *   - P3.33：滑条提示文字常驻轨道内（右滑写日记 / 左滑回轨道），圆钮换去向
 *           图标（铅笔 / 轨道折线），安全线下方的浮动提示删除
 *   - P3.34：滑条整体放大（轨高 44 / 圆钮 40 / 图标 20 / 文字 14px）并缩短
 *           （左右边距 36px，不贴屏幕两边）；iOS 顶部发虚经实机确认放弃处理
 *   - P3.35：记录页长文区至少半屏，速记再多也不压缩写作空间；小记面板加
 *           批量选择（右上「选择」→ 勾选 / 全选 → 底部一次删除）
 *   - P3.36：顶栏重排为 ⇄ ‹ 日期 › ⚙，‹ › 放大加亮、边距 10px；iOS 双指缩放
 *           用 gesture 事件拦掉（Safari 忽略 user-scalable=no）
 *   - P3.37：顶栏四个图标从字符换成内联 SVG（‹ › 28px / ⇄ 22px / ⚙ 22px），
 *           纵横切换改为同一图形旋转 90°，两端渲染一致；#orient 不再写 textContent
 *   - P3.38：横向模式时间从底部标尺挪到每个圆点正上方，和纵向「时间贴圆圈」对齐
 *   - P3.39：直线风格竖向轴心 0.3W → 0.5W，轨道居中；该风格强制时间左、事项右
 *   - P3.40：直线风格横向轴心 0.3H → 0.5H（中线），和竖向居中一致
 *   - P3.41：记录页右上新增「全部记录」页：倒序堆叠每天长文+速记，逐天导出 txt；
 *           导出全部直接复用设置页按钮；纯浏览，不跳日期、不删除
 *   - P3.42：速记类型标签改名（显示层）：高光→「💡 小灯泡」、复盘→「📓 笔记本」，
 *           type 数据字段名不变；记录页「已保存」13px、全部记录入口图标 26px
 */
(function () {
'use strict';

/* ===== 常量 ===== */
var ROW_H  = { 30: 64, 60: 88, 120: 132 };   // 每种粒度的行高
var NODE_D = { 30: 44, 60: 56, 120: 70 };    // 每种粒度的节点直径
var TOP_PAD = 56;
var BOTTOM_PAD = 56;
var GLYPH = { done: '✓', doing: '▶', missed: '!', overdue: '!', canceled: '—', todo: '', empty: '' };

/* ===== 小工具 ===== */
function pad(n) { return (n < 10 ? '0' : '') + n; }
function fmt(min) { min = ((min % 1440) + 1440) % 1440; return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function iso() { return new Date().toISOString(); }
function uid() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function nowMin() {
  if (fakeNow != null) return fakeNow;   // 仅用于截图/自检：?now=570
  var d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}
function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function haptic() {
  try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
}

/* ===== 存储 =====
 * 单一根 key，结构 = HANDOFF §三 v2 模型。旧原型数据只迁一次（映射字段，不删原 key）。
 */
var KEY = 'timerail.v2';
var PROTO_KEY = 'timerail.proto.v2';   // 手感原型旧 key，仅作迁移来源
var fakeNow = null;   // 调试用：把"现在"钉在某个时刻，便于截图复现

function defaultData() {
  return {
    version: 2,
    settings: { granularity: 60, dayStart: 0, shiftName: '常规日', onboarded: false, trackStyle: 'wave', orientation: 'v', logCustom: null, lastExportAt: '', theme: 'auto' },
    shifts: {},                                             // P3：班次模板
    rotation: { cycle: [], anchorDate: '', active: false }, // P3：轮转规则
    days: {},
    pool: [],                                               // P2：顺延池
    logs: {},                                               // P3.6：今日小记（按班次日归属）
    diary: {}                                               // P3.30：记录页长文 { 日期: { text, updatedAt } }
  };
}
function snapG(v) { v = +v; return (v === 30 || v === 60 || v === 120) ? v : 60; }
var LOG_EMOJIS = ['✨', '🌱', '📝', '💡', '🎯', '🧩'];

/* 节日区间（2026–2028）：[节日名, 起始日, 天数]。
 * 按「通常放假长度」铺成区间，只用于顶栏显示节日名，不改变任何数据；不含调休补班。
 * 顶栏只显示「国庆节」这样的节日名，不显示「假期 / 第 N 天」（P3.19）。
 * 区间重叠时先声明的优先（如 2028 中秋落在国庆区间内，只显示国庆节）。
 * 农历节日的公历日期逐年录入，2029 年起需续表。 */
var HOL_RANGES = [
  ['元旦', '2026-01-01', 3], ['春节', '2026-02-16', 7], ['清明节', '2026-04-05', 3],
  ['劳动节', '2026-05-01', 5], ['端午节', '2026-06-19', 3], ['国庆节', '2026-10-01', 7], ['中秋节', '2026-09-25', 3],
  ['元旦', '2027-01-01', 3], ['春节', '2027-02-05', 7], ['清明节', '2027-04-05', 3],
  ['劳动节', '2027-05-01', 5], ['端午节', '2027-06-09', 3], ['国庆节', '2027-10-01', 7], ['中秋节', '2027-09-15', 3],
  ['元旦', '2028-01-01', 3], ['春节', '2028-01-25', 7], ['清明节', '2028-04-04', 3],
  ['劳动节', '2028-05-01', 5], ['端午节', '2028-05-28', 3], ['国庆节', '2028-10-01', 7], ['中秋节', '2028-10-03', 3]
];
/* 展开成 {日期: 节日名}，只做一次 */
var HOLMAP = (function () {
  var m = {};
  HOL_RANGES.forEach(function (r) {
    var p = r[1].split('-');
    for (var i = 0; i < r[2]; i++) {
      var d = new Date(+p[0], +p[1] - 1, +p[2] + i);
      var k = ymd(d);
      if (!m[k]) m[k] = r[0];
    }
  });
  return m;
})();
function snapStart(v) { v = +v; return (v >= 0 && v < 1440) ? v : 0; }
function snapStatus(v) { return ['todo', 'doing', 'done', 'missed', 'canceled'].indexOf(v) >= 0 ? v : 'todo'; }

/* 轨道风格：只决定节点横坐标与连线方式，不碰任何业务数据 */
var SHAPES = {
  wave:   { amp: 0.22, cycles: 2 },      // 蛇形：全天两个来回，坡度更缓
  arc:    { amp: 0.28, cycles: 1 },      // 大弧：全天一个大来回
  rail:   { amp: 0 },                    // 直线：轨道靠左，事项统一向右展开
  zigzag: { amp: 0.21 }                  // 折线：每 2 小时折一次（拐角带圆角）
};
function snapStyle(v) { return SHAPES[v] ? v : 'wave'; }
function snapOrient(v) { return v === 'h' ? 'h' : 'v'; }

/* 单项兜底：钳值 + 补齐缺失字段。存储态只允许五态，overdue 一律折回 todo */
function normItem(it) {
  if (!it || typeof it !== 'object') return null;
  var title = typeof it.title === 'string' ? it.title.trim() : '';
  var start = Math.floor(+it.start);
  start = isFinite(start) ? ((start % 1440) + 1440) % 1440 : 0;
  var dur = Math.round(+it.duration);
  if (!isFinite(dur) || dur <= 0) dur = 60;
  dur = Math.min(1440, Math.max(5, dur));
  var out = {
    id: typeof it.id === 'string' && it.id ? it.id : uid(),
    title: title ? title.slice(0, 40) : '未命名',
    start: start,
    duration: dur,
    status: snapStatus(it.status),
    note: typeof it.note === 'string' ? it.note : '',
    createdAt: typeof it.createdAt === 'string' ? it.createdAt : iso(),
    updatedAt: typeof it.updatedAt === 'string' ? it.updatedAt : iso()
  };
  // 历史兼容：旧版本自动搬运时打的记账标记；P2.5 起不再写入新值
  if (it.carried) out.carried = true;
  return out;
}

/* 顺延池条目兜底 */
function normPool(p) {
  if (!p || typeof p !== 'object') return null;
  var title = typeof p.title === 'string' ? p.title.trim() : '';
  return {
    id: typeof p.id === 'string' && p.id ? p.id : 'pool_' + uid(),
    title: title ? title.slice(0, 40) : '未命名',
    fromDate: /^\d{4}-\d{2}-\d{2}$/.test(p.fromDate) ? p.fromDate : '',
    carriedTimes: Math.max(1, Math.round(+p.carriedTimes) || 1)
  };
}

/* 结构兜底：补齐缺失段、钳住非法值。任何入口（载入/迁移/后续版本升级）都先过这里 */
function normalize(d) {
  var s = d.settings || {};
  d.settings = {
    granularity: snapG(s.granularity),
    dayStart: snapStart(s.dayStart),
    shiftName: typeof s.shiftName === 'string' ? s.shiftName.slice(0, 10) : '常规日',
    onboarded: !!s.onboarded,
    trackStyle: snapStyle(s.trackStyle),
    orientation: snapOrient(s.orientation),
    logCustom: null,
    lastExportAt: '',
    theme: 'auto'
  };
  // P3.15 主题：只认 auto / dark / light，非法值一律回到跟随系统
  if (s.theme === 'dark' || s.theme === 'light') d.settings.theme = s.theme;
  // 备份提醒用的上次导出时间：必须是能被 Date 解析的字符串
  if (typeof s.lastExportAt === 'string' && !isNaN(new Date(s.lastExportAt).getTime())) {
    d.settings.lastExportAt = s.lastExportAt;
  }
  // 自定义小记类型：最多 4 字，表情必须在白名单里；没有名称视为未启用
  var lc = s.logCustom;
  if (lc && typeof lc === 'object') {
    var lname = typeof lc.name === 'string' ? lc.name.trim().slice(0, 4) : '';
    if (lname) {
      d.settings.logCustom = {
        name: lname,
        emoji: LOG_EMOJIS.indexOf(lc.emoji) >= 0 ? lc.emoji : '📝'
      };
    }
  }
  if (!d.shifts || typeof d.shifts !== 'object') d.shifts = {};
  // 班次模板：name 非空、dayStart 0–1439、duration 60–1440
  var shsrc = d.shifts, shifts = {};
  Object.keys(shsrc).forEach(function (id) {
    var t = shsrc[id];
    if (!t || typeof t !== 'object' || !/^[\w-]{1,24}$/.test(id)) return;
    var name = typeof t.name === 'string' ? t.name.trim().slice(0, 10) : '';
    if (!name) return;
    var dur = Math.round(+t.duration);
    shifts[id] = {
      name: name,
      dayStart: snapStart(t.dayStart),
      duration: (isFinite(dur) && dur >= 60 && dur <= 1440) ? dur : 720
    };
  });
  d.shifts = shifts;
  if (!d.rotation || typeof d.rotation !== 'object') d.rotation = { cycle: [], anchorDate: '', active: false };
  var rot = d.rotation;
  rot.anchorDate = /^\d{4}-\d{2}-\d{2}$/.test(rot.anchorDate || '') ? rot.anchorDate : '';
  rot.cycle = Array.isArray(rot.cycle) ? rot.cycle.filter(function (id) {
    return id === 'rest' || Object.prototype.hasOwnProperty.call(shifts, id);
  }).slice(0, 28) : [];
  // P3.31：多套日程已移除。字段留着只为读旧备份，一律关掉，避免"看不见却还生效"
  rot.active = false;
  if (!d.days || typeof d.days !== 'object') d.days = {};
  if (!Array.isArray(d.pool)) d.pool = [];
  var pseen = {};
  d.pool = d.pool.map(normPool).filter(function (p) {
    if (!p) return false;
    if (pseen[p.id]) p.id = p.id + '_' + uid();
    pseen[p.id] = 1;
    return true;
  });
  // 今日小记：按班次日分组，空文本丢弃，单日最多留 100 条
  // P3.6 迁移：旧类型 handover→highlight、issue→review
  if (!d.logs || typeof d.logs !== 'object' || Array.isArray(d.logs)) d.logs = {};
  Object.keys(d.logs).forEach(function (k) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(d.logs[k])) { delete d.logs[k]; return; }
    var lseen = {};
    d.logs[k] = d.logs[k].map(function (l) {
      if (!l || typeof l !== 'object') return null;
      var text = typeof l.text === 'string' ? l.text.trim() : '';
      if (!text) return null;
      var lt = l.type === 'issue' ? 'review' : (l.type === 'handover' ? 'highlight' : l.type);
      if (lt !== 'review' && lt !== 'custom') lt = 'highlight';
      var out = {
        id: typeof l.id === 'string' && l.id ? l.id : 'lg' + uid(),
        type: lt,
        text: text.slice(0, 80),
        createdAt: typeof l.createdAt === 'string' ? l.createdAt : iso()
      };
      // 自定义分类的图标与名字在记录当时定格：之后改类型不回头改写旧条目
      if (lt === 'custom') {
        if (LOG_EMOJIS.indexOf(l.emoji) >= 0) out.emoji = l.emoji;
        if (typeof l.label === 'string' && l.label.trim()) out.label = l.label.trim().slice(0, 4);
      }
      if (lseen[out.id]) out.id = out.id + '_' + uid();
      lseen[out.id] = 1;
      return out;
    }).filter(Boolean).slice(-100);
    if (!d.logs[k].length) delete d.logs[k];
  });
  // 记录页长文（P3.30）：按日期存一篇，空文本丢弃，单篇上限 5000 字
  if (!d.diary || typeof d.diary !== 'object' || Array.isArray(d.diary)) d.diary = {};
  Object.keys(d.diary).forEach(function (k) {
    var r = d.diary[k];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !r || typeof r !== 'object' || typeof r.text !== 'string') {
      delete d.diary[k];
      return;
    }
    var dtxt = r.text.slice(0, 5000);
    if (!dtxt.trim()) { delete d.diary[k]; return; }
    d.diary[k] = {
      text: dtxt,
      updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : iso()
    };
  });
  Object.keys(d.days).forEach(function (k) {
    var day = d.days[k];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !day || !Array.isArray(day.items)) { delete d.days[k]; return; }
    var seen = {};
    day.items = day.items.map(normItem).filter(function (it) {
      if (!it) return false;
      if (seen[it.id]) it.id = uid();   // id 重复会让"改名/删除"误伤同 id 的另一条
      seen[it.id] = 1;
      return true;
    });
  });
  return d;
}

/* 原型数据 → v2：g→granularity、dur→duration，逐项过 normItem；失败则放弃迁移 */
function migrateProto(raw) {
  var d = JSON.parse(raw);
  if (!d || !d.settings || !d.days) return null;
  var out = defaultData();
  out.settings.granularity = snapG(d.settings.g);
  out.settings.dayStart = snapStart(d.settings.dayStart);
  if (typeof d.settings.shiftName === 'string') out.settings.shiftName = d.settings.shiftName.slice(0, 10);
  Object.keys(d.days).forEach(function (k) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
    var items = d.days[k] && Array.isArray(d.days[k].items) ? d.days[k].items : [];
    out.days[k] = { items: items.filter(function (it) {
      return it && typeof it.title === 'string' && it.title.trim() && isFinite(+it.start);
    }).map(function (it) {
      return normItem({
        id: String(it.id || uid()),
        title: it.title,
        start: +it.start,
        duration: typeof it.dur === 'number' ? it.dur : it.duration,   // 原型字段是 dur
        status: it.status,
        note: it.note,
        createdAt: it.createdAt,
        updatedAt: it.updatedAt
      });
    }) };
  });
  return normalize(out);
}

/* v2 数据读不出来时先把原文留档，避免下一次保存直接覆盖掉用户数据 */
var loadNotice = '';
function loadData() {
  var raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) {}
  if (raw) {
    var d = null;
    try { d = JSON.parse(raw); } catch (e) {}
    if (d && d.version === 2) return normalize(d);
    try { localStorage.setItem(KEY + '.bak', raw); } catch (e) {}
    loadNotice = '本地数据读取失败，已备份原文并重新开始';
  }
  try {
    var protoRaw = localStorage.getItem(PROTO_KEY);
    if (protoRaw) {
      var m = migrateProto(protoRaw);
      if (m) return m;   // 先用后存：首次改动时经 saveData 落到新 key
    }
  } catch (e) {}
  return defaultData();
}
var data = loadData();
function cfg() { return data.settings; }

/* 存储健康：一次失败 → 常驻告警条；恢复成功自动收起 */
var storageOk = true;
function saveData() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    if (!storageOk) { storageOk = true; hideStoreBar(); }
  } catch (e) {
    storageOk = false;
    showStoreBar();
  }
}
function probeStorage() {   // 启动自检：隐私模式/存储被禁时，一次写入都不做也要亮灯
  try {
    localStorage.setItem(KEY + '.probe', '1');
    localStorage.removeItem(KEY + '.probe');
  } catch (e) {
    storageOk = false;
    showStoreBar();
  }
}
var storeBar = document.getElementById('storebar');
function showStoreBar() { if (storeBar) storeBar.hidden = false; }
function hideStoreBar() { if (storeBar) storeBar.hidden = true; }

/* ===== 日期与时段 =====
 * item.start 存的是「一天中的绝对分钟数」（0–1439），不是相对起点的偏移。
 * 这样改"一天的起点"时，事项仍钉在真实钟点上。
 * P3.31：起点固定取 settings.dayStart（多套日程已移除）。
 */
function parseKey(k) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
/* 某一天用哪个班次：P3.31 起多套日程已移除，固定用设置里的名称与起点；
 * shifts / rotation 字段仍保留解析，只为读得进旧备份。 */
function shiftOf() {
  return { name: cfg().shiftName || '常规日', dayStart: cfg().dayStart };
}
function startOfKey(key) { return shiftOf(key).dayStart; }
function viewStart() { return startOfKey(viewKey()); }
function shiftDateOf(d) {
  var t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // ?now= 也参与归属判断：夜班 00:30 的截图不再受真实时间影响
  var cur = fakeNow != null ? fakeNow : d.getHours() * 60 + d.getMinutes();
  if (cur < startOfKey(ymd(t))) t.setDate(t.getDate() - 1);
  return t;
}
function todayKey() { return ymd(shiftDateOf(new Date())); }
function viewKey() { return ymd(view.date); }
function isToday() { return viewKey() === todayKey(); }

function dayData(key, create) {
  if (!data.days[key]) {
    if (!create) return null;
    data.days[key] = { items: [] };
  }
  return data.days[key];
}
function itemsOfDay() {
  var d = dayData(viewKey(), false);
  return d ? d.items : [];
}
function blockStartClock(i) { return (viewStart() + i * cfg().granularity) % 1440; }
function blocks() { return 1440 / cfg().granularity; }
function offsetOf(it) { return (((it.start - viewStart()) % 1440) + 1440) % 1440; }
function itemBlock(it) { return Math.floor(offsetOf(it) / cfg().granularity); }
function itemsInBlock(i) {
  return itemsOfDay().filter(function (it) { return itemBlock(it) === i; });
}
function nowOffset() { return (((nowMin() - viewStart()) % 1440) + 1440) % 1440; }
function isPastBlock(i) {
  var k = viewKey(), tk = todayKey();
  if (k < tk) return true;
  if (k > tk) return false;
  return (i + 1) * cfg().granularity <= nowOffset();
}

/* ===== 跨天 =====
 * P2.5 起不再自动搬运：旧日未完成事项原样留在原日期，不自动进顺延池。
 * 原日数据在任何情况下都不会被删改。
 */

/* 一个时段的状态由它下面的事项聚合而来。
 * 这里只返回"基础态"：描述尚未完成的部分；已完成的比例另由 addProgress() 叠加。
 */
function blockStats(list) {
  var s = { n: 0, done: 0, doing: 0, missed: 0, canceled: 0, todo: 0 };
  list.forEach(function (it) {
    s.n++;
    if (it.status === 'done') s.done++;
    else if (it.status === 'doing') s.doing++;
    else if (it.status === 'canceled') s.canceled++;
    else if (it.status === 'missed') s.missed++;
    else s.todo++;
  });
  return s;
}
function blockState(i, list) {
  if (!list.length) return 'empty';
  var s = blockStats(list);
  if (s.doing) return 'doing';                 // 进行中优先级最高
  if (s.missed) return 'missed';
  if (s.done === s.n) return 'done';           // 只有全部完成才整段绿
  if (s.canceled === s.n) return 'canceled';
  if (s.canceled === s.n - s.done) return 'canceled';   // 剩下的都取消了
  return isPastBlock(i) ? 'overdue' : 'todo';  // 部分完成：底色仍按未完成部分
}

/* 时段表情：纯视觉提示，不参与数据与统计 */
function blockMood(i, list) {
  if (!list.length) return '';
  var s = blockStats(list), past = isPastBlock(i);
  if (s.missed) return '😞';                   // 明确没做成
  if (s.todo && past) return '⏰';             // 该做的时间已过，仍未完成
  if (s.doing) return '🚀';
  if (s.todo) return '💪';                     // 还有待办
  if (s.done === s.n) return '🎉';             // 全完成：不管时段过没过，一律庆祝
  return '🤷';                                 // 剩下的都取消了
}

/* ===== DOM ===== */
var wrap = document.getElementById('wrap');
var track = document.getElementById('track');
var svg = document.getElementById('svg');
var layer = document.getElementById('layer');
var backdrop = document.getElementById('backdrop');
var sheet = document.getElementById('sheet');
var chooser = document.getElementById('chooser');
var poolSheet = document.getElementById('pool-sheet');
var settingsSheet = document.getElementById('settings');
var addForm = document.getElementById('add-form');
var addInput = document.getElementById('add-input');
var shiftInput = document.getElementById('shift-name');
var startCustom = document.getElementById('start-custom');
var logSheet = document.getElementById('log-sheet');
var logTabs = document.getElementById('log-tabs');
var logList = document.getElementById('log-list');
var logForm = document.getElementById('log-form');
var logInput = document.getElementById('log-input');
var logSelectBtn = document.getElementById('log-select');
var logSelBar = document.getElementById('log-selbar');
var logSelCount = document.getElementById('log-selcount');
var logSelAllBtn = document.getElementById('log-selall');
var logSelDelBtn = document.getElementById('log-seldel');
var logTypeRow = document.getElementById('log-type-row');
var logLink = document.getElementById('log-link');
var diaryPage = document.getElementById('diary-page');
var diaryInput = document.getElementById('diary-input');
var diaryCount = document.getElementById('diary-count');
var diarySaved = document.getElementById('diary-saved');
var diarySub = document.getElementById('diary-sub');
var diaryLogs = document.getElementById('diary-logs');
var dqForm = document.getElementById('dq-form');
var dqInput = document.getElementById('dq-input');
var importFile = document.getElementById('import-file');
var installBtn = document.getElementById('install');

var view = { date: shiftDateOf(new Date()), block: 0 };
var activeSheet = null;

/* ===== 渲染 ===== */
/* 形状返回 -1..1 的归一化偏移；横向/竖向只是把它乘到不同轴上 */
function shapeUnit(i, B) {
  var st = cfg().trackStyle;
  if (st === 'rail') return 0;
  if (st === 'zigzag') {
    var half = Math.max(1, Math.round(120 / cfg().granularity));   // 每 2 小时一个折点
    var t = (i % (half * 2)) / half;
    var k = t <= 1 ? t : 2 - t;                                    // 0→1→0 三角波
    return k * 2 - 1;
  }
  return Math.sin(i * Math.PI * 2 * SHAPES[st].cycles / B);
}
/* 竖向：节点横坐标；纵坐标永远是第 i 个时段 */
function xAt(i, W, B) {
  /* P3.39：直线风格轴心居屏幕中线（原 0.3W 太靠左，空日右侧留大片空白） */
  if (cfg().trackStyle === 'rail') return W * 0.5;
  return W / 2 + SHAPES[cfg().trackStyle].amp * W * shapeUnit(i, B);
}

function isHoriz() { return cfg().orientation === 'h'; }

/* 一段轨道的路径：
 * - 曲线风格用 Catmull-Rom 切线（取前后邻点求导），比"每段各自 S"更连贯自然
 * - 折线风格保留直线段，但在拐点前后留半径，用二次曲线磨圆角
 */
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) || 1; }
function cornerR(pts, i) {
  if (i <= 0 || i >= pts.length - 1) return 0;
  return Math.min(14, dist(pts[i - 1], pts[i]) * 0.45, dist(pts[i], pts[i + 1]) * 0.45);
}
function pathD(pts, i, smooth) {
  var a = pts[i], b = pts[i + 1];
  if (smooth) {
    var p0 = pts[i - 1] || a, p3 = pts[i + 2] || b;
    return 'M ' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
      ' C ' + (a.x + (b.x - p0.x) / 6).toFixed(1) + ' ' + (a.y + (b.y - p0.y) / 6).toFixed(1) +
      ', ' + (b.x - (p3.x - a.x) / 6).toFixed(1) + ' ' + (b.y - (p3.y - a.y) / 6).toFixed(1) +
      ', ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
  }
  var vx = (b.x - a.x) / dist(a, b), vy = (b.y - a.y) / dist(a, b);   // 出向
  var rA = cornerR(pts, i), rB = cornerR(pts, i + 1);
  var d;
  if (rA) {
    var p = pts[i - 1];
    var ux = (a.x - p.x) / dist(p, a), uy = (a.y - p.y) / dist(p, a); // 入向
    d = 'M ' + (a.x - ux * rA).toFixed(1) + ' ' + (a.y - uy * rA).toFixed(1) +
        ' Q ' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
        ' ' + (a.x + vx * rA).toFixed(1) + ' ' + (a.y + vy * rA).toFixed(1);
  } else {
    d = 'M ' + a.x.toFixed(1) + ' ' + a.y.toFixed(1);
  }
  return d + ' L ' + (b.x - vx * rB).toFixed(1) + ' ' + (b.y - vy * rB).toFixed(1);
}

/* 部分完成：在基础色之上，按 done/总数 的比例叠一段绿色。
 * 用 stroke-dasharray 沿路径长度截取，曲线与圆角折线都能精确按比例填充。
 */
function addProgress(path, list) {
  if (list.length < 2) return;                  // 单项不存在"部分完成"
  var done = 0;
  list.forEach(function (it) { if (it.status === 'done') done++; });
  if (!done || done === list.length) return;
  var L = 0;
  try { L = path.getTotalLength(); } catch (e) {}
  if (!L || !isFinite(L)) return;
  var q = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  q.setAttribute('d', path.getAttribute('d'));
  q.setAttribute('class', 'seg-fill');
  q.setAttribute('stroke-dasharray', (L * done / list.length).toFixed(1) + ' ' + (L + 2).toFixed(1));
  svg.appendChild(q);
}

/* 时间标签 + 时段表情（表情排在时间前面，aria-hidden 不干扰读屏） */
function moodLabel(lb, mood) {
  if (!mood) return lb;
  var em = el('span', 'mood', mood);
  em.setAttribute('aria-hidden', 'true');
  lb.insertBefore(em, lb.firstChild);
  return lb;
}

function render() {
  var h = isHoriz();
  document.body.classList.toggle('horiz', h);
  if (h) renderH(); else renderV();
}

function renderV() {
  track.style.width = '';
  var g = cfg().granularity, rowH = ROW_H[g], nodeD = NODE_D[g], B = blocks();
  var W = track.clientWidth || 360;
  var H = TOP_PAD + B * rowH + BOTTOM_PAD;
  track.style.height = H + 'px';
  svg.innerHTML = '';
  layer.innerHTML = '';
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

  var smooth = cfg().trackStyle === 'wave' || cfg().trackStyle === 'arc';
  var pts = [];
  var idx = [];
  for (var i = 0; i < B; i++) {
    idx.push(i);
    pts.push({
      x: xAt(i, W, B),
      y: TOP_PAD + i * rowH + rowH / 2
    });
  }

  // 路径：第 i 段代表第 i 个时段的流逝
  idx.forEach(function (i) {
    if (i >= B - 1) return;
    var segList = itemsInBlock(i);
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', pathD(pts, i, smooth));
    p.setAttribute('class', 'seg st-' + blockState(i, segList));
    svg.appendChild(p);
    addProgress(p, segList);   // 部分完成：按比例叠绿色，不整段变绿
  });

  var nowBlock = isToday() ? Math.floor(nowOffset() / g) : -1;

  idx.forEach(function (i) {
    var x = pts[i].x, y = pts[i].y;
    var list = itemsInBlock(i);
    var st = blockState(i, list);
    var clock = blockStartClock(i);
    /* 节点靠左 → 时间贴左、分支向右；P3.39 直线风格轴心居中，
       必须强制 side='left'，否则会判成右半边把时间和事项对调 */
    var side = (cfg().trackStyle === 'rail' || x < W / 2) ? 'left' : 'right';

    // 时间标签（带时段表情）
    var lb = moodLabel(el('span', 'tlabel' +
      (clock % 60 === 0 ? ' hour' : '') +
      (clock < viewStart() ? ' second' : ''), fmt(clock)), blockMood(i, list));
    lb.style.top = y + 'px';
    if (side === 'left') lb.style.right = (W - x + nodeD / 2 + 8) + 'px';
    else lb.style.left = (x + nodeD / 2 + 8) + 'px';
    layer.appendChild(lb);

    // 节点
    var nd = el('button', 'node st-' + st + (i === nowBlock ? ' now' : ''));
    nd.type = 'button';
    nd.style.left = x + 'px';
    nd.style.top = y + 'px';
    nd.style.width = nodeD + 'px';
    nd.style.height = nodeD + 'px';

    var txt = '';
    if (list.length > 1) {
      var doneN = list.filter(function (it) { return it.status === 'done'; }).length;
      txt = doneN + '/' + list.length;
      nd.style.fontSize = Math.round(nodeD * 0.23) + 'px';
    } else if (list.length === 1) {
      txt = GLYPH[st] || '';
      nd.style.fontSize = Math.round(nodeD * 0.32) + 'px';
    } else {
      txt = (g === 30 && clock % 60 !== 0) ? '·' : '';
      nd.style.fontSize = '16px';
    }
    nd.textContent = txt;
    nd.setAttribute('aria-label', fmt(clock) + ' 时段' + (list.length ? '，' + list.length + ' 项' : ''));
    nd.addEventListener('click', function () { openBlock(i); });
    layer.appendChild(nd);

    // 事项分支
    if (!list.length) return;
    var box = el('div', 'chips ' + (side === 'left' ? 'on-right' : 'on-left'));
    box.style.top = y + 'px';
    if (side === 'left') {
      box.style.left = (x + nodeD / 2 + 10) + 'px';
      box.style.maxWidth = Math.max(90, W - (x + nodeD / 2 + 10) - 12) + 'px';
    } else {
      box.style.right = (W - x + nodeD / 2 + 10) + 'px';
      box.style.maxWidth = Math.max(90, x - nodeD / 2 - 22) + 'px';
    }
    var maxChips = rowH >= 110 ? 3 : 2;
    list.slice(0, maxChips).forEach(function (it) {
      var chip = el('button', 'chip' + (it.status === 'done' ? ' done' : ''));
      chip.type = 'button';
      chip.appendChild(el('i', 'dot d-' + it.status));
      chip.appendChild(el('span', 't', it.title));
      chip.addEventListener('click', function () { openBlock(i); });
      box.appendChild(chip);
    });
    if (list.length > maxChips) {
      var more = el('button', 'chip more', '+' + (list.length - maxChips));
      more.type = 'button';
      more.addEventListener('click', function () { openBlock(i); });
      box.appendChild(more);
    }
    layer.appendChild(box);
  });

  // 次日分隔线
  if (viewStart() > 0 && (1440 - viewStart()) % g === 0) {
    var di = (1440 - viewStart()) / g;
    if (di < B) {
      var dv = el('div', 'divider');
      dv.style.top = (TOP_PAD + di * rowH) + 'px';
      dv.appendChild(el('span', '', '次日'));
      layer.appendChild(dv);
    }
  }

  // 现在时刻线
  if (isToday()) {
    var nl = el('div', 'nowline');
    nl.style.top = (TOP_PAD + (nowOffset() / g) * rowH) + 'px';
    nl.appendChild(el('span', '', '现在 ' + fmt(nowMin())));
    layer.appendChild(nl);
  }

  // 空状态：今天/过去/未来给不同的话，过去不诱导补录
  if (!itemsOfDay().length) {
    var vk = viewKey(), tk = todayKey();
    var msg = vk === tk ? '今天还空着 · 点任意时段加第一件事'
      : vk < tk ? '这天没有记录 · 过去的日子只做留档'
      : '这天还空着 · 可以先排几件事';
    layer.appendChild(el('div', 'hint', msg));
  }

  updateHeader();
}

/* ===== 横向渲染：时间从左到右，事项走泳道条 ===== */
var HPAD = 56;          // 横向轨道左右留白
var H_LANE0 = 96;       // 第一条泳道离中心线的距离
var H_LANE_STEP = 26;
var H_LANES = 3;

function renderH() {
  var g = cfg().granularity, colW = ROW_H[g], nodeD = NODE_D[g], B = blocks();
  var axisLen = B * colW;
  var W = HPAD * 2 + axisLen;
  var st = cfg().trackStyle;
  /* 先撑开横向宽度并强制回流，再量高度：横向滚动条会让 wrap 的 clientHeight
     变小，先量后撑会让轴心比可视中线偏下（P3.40 修） */
  track.style.width = W + 'px';
  var H = wrap.clientHeight || 560;
  var Hc = H / 2;
  track.style.height = H + 'px';
  svg.innerHTML = '';
  layer.innerHTML = '';
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

  var xOf = function (i) { return HPAD + (i + 0.5) * colW; };
  var axisAmp = SHAPES[st].amp * H * 0.35;   // 横向把风格起伏压扁，给泳道让位
  var axisY = function (i) {
    /* P3.40：rail 轴心从 0.3H 改到正中（与竖向 P3.39 对齐），下方不再留一大片空 */
    if (st === 'rail') return Hc;
    return Hc + axisAmp * shapeUnit(i, B);
  };
  var pts = [];
  for (var i = 0; i < B; i++) pts.push({ x: xOf(i), y: axisY(i) });

  // 轴线：同样走自然样条/圆角折线
  var smooth = st === 'wave' || st === 'arc';
  for (i = 0; i < B - 1; i++) {
    var segList = itemsInBlock(i);
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', pathD(pts, i, smooth));
    p.setAttribute('class', 'seg st-' + blockState(i, segList));
    svg.appendChild(p);
    addProgress(p, segList);
  }

  var nowBlock = isToday() ? Math.floor(nowOffset() / g) : -1;

  // 节点 + 圆点上方时间（P3.38：不再把时间堆在底部标尺）
  for (i = 0; i < B; i++) {
    var list = itemsInBlock(i), s = blockState(i, list), clock = blockStartClock(i);
    var nd = el('button', 'node st-' + s + (i === nowBlock ? ' now' : ''));
    nd.type = 'button';
    nd.style.left = pts[i].x + 'px';
    nd.style.top = pts[i].y + 'px';
    nd.style.width = nodeD + 'px';
    nd.style.height = nodeD + 'px';
    var txt = '';
    if (list.length > 1) {
      var dn = list.filter(function (it) { return it.status === 'done'; }).length;
      txt = dn + '/' + list.length;
      nd.style.fontSize = Math.round(nodeD * 0.23) + 'px';
    } else if (list.length === 1) {
      txt = GLYPH[s] || '';
      nd.style.fontSize = Math.round(nodeD * 0.32) + 'px';
    }
    nd.textContent = txt;
    nd.setAttribute('aria-label', fmt(clock) + ' 时段' + (list.length ? '，' + list.length + ' 项' : ''));
    (function (bi) { nd.addEventListener('click', function () { openBlock(bi); }); })(i);
    layer.appendChild(nd);

    /* 时间贴圆点（P3.38）：默认放上方；节点偏上半屏时改放下方，
       始终朝屏幕中线放，避免撞到外侧泳道里的事项条。rail 风格事项全在轴下，固定上方 */
    var above = st === 'rail' || pts[i].y >= Hc;
    var lb = moodLabel(el('span', 'tlabel hlabel' + (above ? '' : ' below') +
      (clock % 60 === 0 ? ' hour' : '') +
      (clock < viewStart() ? ' second' : ''), fmt(clock)), blockMood(i, list));
    lb.style.left = pts[i].x + 'px';
    lb.style.top = (pts[i].y + (above ? -1 : 1) * (nodeD / 2 + 8)) + 'px';
    layer.appendChild(lb);
  }

  // 事项条：长度 = duration，上下各三条泳道，满了进 +N
  var lanes = { up: [0, 0, 0], down: [0, 0, 0] };
  var more = {};
  itemsOfDay().slice().sort(function (a, b) { return offsetOf(a) - offsetOf(b); }).forEach(function (it) {
    var bi = itemBlock(it);
    var x0 = HPAD + (offsetOf(it) / 1440) * axisLen;
    var bw = Math.min(W - 8 - x0, Math.max(26, (it.duration / 1440) * axisLen));
    var order = st === 'rail' ? ['down'] : (bi % 2 ? ['down', 'up'] : ['up', 'down']);
    var placed = -1, side = 'up';
    for (var k = 0; k < order.length && placed < 0; k++) {
      var arr = lanes[order[k]];
      for (var j = 0; j < H_LANES; j++) {
        if (arr[j] <= x0 - 4) { arr[j] = x0 + bw; placed = j; side = order[k]; break; }
      }
    }
    if (placed < 0) { more[bi] = (more[bi] || 0) + 1; return; }
    var cy = st === 'rail'
      ? axisY(bi) + nodeD / 2 + 12 + placed * H_LANE_STEP
      : Hc + (side === 'up' ? -1 : 1) * (H_LANE0 + placed * H_LANE_STEP);
    var bar = el('button', 'hbar st-' + it.status + (it.status === 'done' ? ' done' : ''));
    bar.type = 'button';
    bar.style.left = x0 + 'px';
    bar.style.top = cy + 'px';
    bar.style.width = bw + 'px';
    bar.appendChild(el('i', 'dot d-' + it.status));
    bar.appendChild(el('span', 't', it.title));
    (function (bi2) { bar.addEventListener('click', function () { openBlock(bi2); }); })(bi);
    layer.appendChild(bar);
  });
  Object.keys(more).forEach(function (k) {
    var bd = el('button', 'hbadge', '+' + more[k]);
    bd.type = 'button';
    bd.style.left = xOf(+k) + 'px';
    bd.style.top = (H - 52) + 'px';
    (function (bi) { bd.addEventListener('click', function () { openBlock(bi); }); })(+k);
    layer.appendChild(bd);
  });

  // 次日竖线
  if (viewStart() > 0) {
    var dv = el('div', 'divider v');
    dv.style.left = (HPAD + ((1440 - viewStart()) / 1440) * axisLen) + 'px';
    dv.appendChild(el('span', '', '次日'));
    layer.appendChild(dv);
  }

  // 现在竖线
  if (isToday()) {
    var nl = el('div', 'nowline v');
    nl.style.left = (HPAD + (nowOffset() / 1440) * axisLen) + 'px';
    nl.appendChild(el('span', '', '现在 ' + fmt(nowMin())));
    layer.appendChild(nl);
  }

  if (!itemsOfDay().length) {
    var vk = viewKey(), tk = todayKey();
    layer.appendChild(el('div', 'hint',
      vk === tk ? '今天还空着 · 点任意时段加第一件事'
        : vk < tk ? '这天没有记录 · 过去的日子只做留档'
        : '这天还空着 · 可以先排几件事'));
  }

  updateHeader();
}

/* ===== 顶栏 / 底栏 ===== */
function doneCount() {
  return itemsOfDay().filter(function (it) { return it.status === 'done'; }).length;
}
function activeCount() {
  return itemsOfDay().filter(function (it) { return it.status !== 'canceled'; }).length;
}
function plannedHours() {
  var m = 0;
  itemsOfDay().forEach(function (it) { if (it.status !== 'canceled') m += it.duration || 0; });
  return (m / 60).toFixed(1).replace(/\.0$/, '');
}

/* 起点四选：00:00 / 06:00 / 08:00 / 自定义（自定义时露出时间输入） */
var startCustomMode = false;
function isPresetStart(v) { return v === 0 || v === 360 || v === 480; }
function syncStartUI() {
  var cur = cfg().dayStart;
  var custom = startCustomMode || !isPresetStart(cur);
  Array.prototype.forEach.call(document.querySelectorAll('#startseg button'), function (b) {
    var key = b.dataset.start;
    b.classList.toggle('active', key === 'custom' ? custom : (!custom && +key === cur));
  });
  startCustom.hidden = !custom;
  startCustom.value = fmt(cur);
  document.getElementById('start-hint').textContent = '睡醒算新的一天；跨零点作息可选 20:00';
}

/* ===== 主题（P3.15）=====
 * 设置只存 auto / dark / light；实际生效值写到 documentElement 的 data-theme，
 * CSS 在 :root[data-theme="light"] 里统一重设语义变量。 */
var THEME_META = { dark: '#0e131f', light: '#f5f8fc' };
function systemPrefersLight() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
  } catch (e) { return false; }
}
function resolveTheme() {
  var t = cfg().theme;
  if (t === 'dark' || t === 'light') return t;
  return systemPrefersLight() ? 'light' : 'dark';
}
function applyTheme() {
  var t = resolveTheme();
  document.documentElement.setAttribute('data-theme', t);
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', THEME_META[t]);
  syncThemeUI();
}
function syncThemeUI() {
  var cur = cfg().theme;
  if (cur !== 'dark' && cur !== 'light') cur = 'auto';
  Array.prototype.forEach.call(document.querySelectorAll('#themeseg button'), function (b) {
    b.classList.toggle('active', b.getAttribute('data-th') === cur);
  });
}
/* auto 时系统外观变化即时生效；手动选深/浅色时忽略系统变化 */
(function watchSystemTheme() {
  var mq = null;
  try { mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)'); } catch (e) {}
  if (!mq) return;
  var onChange = function () { if (cfg().theme === 'auto') applyTheme(); };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
})();

/* ===== 日期标题（P3.27）=====
 * 这两行在顶栏正中，但整条顶栏顶部留了 60px 安全垫（见 styles.css），
 * 文字实际落在安全线以下，iOS 主屏不会再按低比例栅格化。
 * 点日期块开日历；「越靠近顶边越发虚」的实机证据见 PROGRESS P3.26。
 */
function updateHeader() {
  var d = view.date;
  var week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  var dayDiff = Math.round((d.getTime() - shiftDateOf(new Date()).getTime()) / 86400000);
  var rel = dayDiff === 0 ? '今天 · ' : dayDiff === -1 ? '昨天 · ' : dayDiff === 1 ? '明天 · ' : '';
  var hol = HOLMAP[ymd(d)];
  var titleEl = document.getElementById('date-label');
  var titleTxt = rel + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + week;
  if (titleEl.textContent !== titleTxt) titleEl.textContent = titleTxt;

  var sub = (hol ? hol + ' · ' : '') + shiftOf(viewKey()).name;
  if (isToday()) sub += ' · 现在 ' + fmt(nowMin());
  else sub += viewKey() < todayKey() ? ' · 历史' : ' · 未来';
  var subEl = document.getElementById('sub-label');
  if (subEl.textContent !== sub) subEl.textContent = sub;

  document.getElementById('stat-done').textContent = '完成 ' + doneCount() + '/' + activeCount();
  document.getElementById('stat-plan').textContent = '已规划 ' + plannedHours() + 'h';
  var poolLink = document.getElementById('pool-link');
  var pn = data.pool.length;
  poolLink.hidden = !pn;
  poolLink.textContent = '顺延池 ' + pn;
  var ln = logCount(viewKey());
  logLink.textContent = ln ? '记录 ' + ln : '记录';

  Array.prototype.forEach.call(document.querySelectorAll('#gseg button'), function (b) {
    b.classList.toggle('active', +b.dataset.g === cfg().granularity);
  });
  syncStartUI();
  Array.prototype.forEach.call(document.querySelectorAll('#styleseg button'), function (b) {
    b.classList.toggle('active', b.dataset.style === cfg().trackStyle);
  });
  var oi = document.getElementById('orient');
  /* P3.37：图标是内联 SVG，只切旋转 class，别再写 textContent（会把 svg 冲掉） */
  oi.classList.toggle('vert', isHoriz());
  oi.setAttribute('aria-label', isHoriz() ? '切换为竖向' : '切换为横向');
  if (document.activeElement !== shiftInput) shiftInput.value = cfg().shiftName || '';
}

/* ===== 时间锚点 ===== */
function scrollToNow(smooth) {
  if (!isToday()) return;
  if (isHoriz()) {
    var x = HPAD + (nowOffset() / 1440) * blocks() * ROW_H[cfg().granularity];
    var left = Math.max(0, x - wrap.clientWidth * 0.42);
    if (smooth && wrap.scrollTo) wrap.scrollTo({ left: left, behavior: 'smooth' });
    else wrap.scrollLeft = left;
    return;
  }
  var y = TOP_PAD + (nowOffset() / cfg().granularity) * ROW_H[cfg().granularity];
  var top = Math.max(0, y - wrap.clientHeight * 0.42);
  if (smooth && wrap.scrollTo) wrap.scrollTo({ top: top, behavior: 'smooth' });
  else wrap.scrollTop = top;
}

/* ===== 面板 ===== */
function showSheet(s) {
  if (activeSheet && activeSheet !== s) {
    activeSheet.classList.remove('open');
    activeSheet.setAttribute('aria-hidden', 'true');
  }
  activeSheet = s;
  // 选择态在 hideSheet 里会重置，重开小记面板时重建行，避免残留勾选
  if (s === logSheet) renderLog();
  s.classList.add('open');
  s.setAttribute('aria-hidden', 'false');
  backdrop.classList.add('open');
}
function hideSheet() {
  if (logSelMode) { logSelMode = false; logSelIds = {}; }
  if (activeSheet) {
    activeSheet.classList.remove('open');
    activeSheet.setAttribute('aria-hidden', 'true');
  }
  activeSheet = null;
  backdrop.classList.remove('open');
  document.body.classList.remove('sheet-over-diary');
}

function openBlock(i) {
  view.block = i;
  renderSheet();
  addInput.value = '';
  showSheet(sheet);
}

function renderSheet() {
  var i = view.block, g = cfg().granularity;
  var s = blockStartClock(i), e = (s + g) % 1440;
  var list = itemsInBlock(i);

  document.getElementById('sheet-title').textContent =
    fmt(s) + ' – ' + fmt(e) + (e <= s ? ' 次日' : '');
  document.getElementById('sheet-sub').textContent =
    list.length ? list.length + ' 项 · 点圆圈打钩 · 点名称改名' : '这个时段还空着';

  var ul = document.getElementById('sheet-list');
  ul.innerHTML = '';
  if (!list.length) {
    ul.appendChild(el('li', 'empty-row', '在下面输入框里加第一件事'));
  }
  list.forEach(function (it) {
    var li = el('li', 'row');
    var chkState = (it.status === 'todo' && isPastBlock(i)) ? 'overdue' : it.status;
    var chk = el('button', 'check st-' + chkState, GLYPH[it.status] || '');
    chk.type = 'button';
    chk.setAttribute('aria-label', '切换完成');
    chk.addEventListener('click', function () { toggleDone(it); });

    var t = el('div', 'rowtitle' + (it.status === 'canceled' ? ' struck' : ''), it.title);
    t.setAttribute('role', 'button');
    t.tabIndex = 0;
    t.setAttribute('aria-label', '重命名「' + it.title + '」');
    t.addEventListener('click', function () { startRename(it, t); });

    var more = el('button', 'icon', '⋯');
    more.type = 'button';
    more.setAttribute('aria-label', '更多操作');
    more.addEventListener('click', function () { itemMenu(it); });

    li.appendChild(chk);
    li.appendChild(t);
    li.appendChild(more);
    ul.appendChild(li);
  });
}

/* 行内改名：点事项名称 → 原位变输入框，Enter/失焦保存，Esc 取消 */
function startRename(it, titleEl) {
  if (titleEl.classList.contains('editing')) return;
  var input = document.createElement('input');
  input.className = 'rename';
  input.type = 'text';
  input.maxLength = 40;
  input.value = it.title;
  input.setAttribute('aria-label', '编辑事项名称');
  titleEl.textContent = '';
  titleEl.classList.add('editing');
  titleEl.appendChild(input);
  input.focus();
  input.select();

  var settled = false;
  function commit() {
    if (settled) return;
    settled = true;
    var v = input.value.trim().slice(0, 40);
    if (v && v !== it.title) {
      it.title = v;
      it.updatedAt = iso();
      saveData();
      render();          // 轨道分支上的 chip 标题同步
      haptic();
    }
    // 延后一拍再重建列表：失焦往往是被"⋯"按钮的 mousedown 触发的，
    // 同步重建会把按钮从 DOM 里摘掉，导致那次点击落空
    setTimeout(renderSheet, 0);
  }
  function cancel() {
    if (settled) return;
    settled = true;
    renderSheet();
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();   // 否则会冒泡到 document，把整个面板也关掉
      cancel();
    }
  });
}

function toggleDone(it) {
  it.status = it.status === 'done' ? 'todo' : 'done';
  it.updatedAt = iso();
  saveData();
  renderSheet();
  render();
  haptic();
}

/* 通用选择器 */
var chooserCb = null;
function choose(title, opts, cb) {
  document.getElementById('chooser-title').textContent = title;
  document.getElementById('chooser-msg').hidden = true;   // 选择器与确认框共用一个面板
  var ul = document.getElementById('chooser-list');
  ul.innerHTML = '';
  chooserCb = cb;
  opts.forEach(function (o) {
    var li = document.createElement('li');
    var b = el('button', 'opt' + (o.danger ? ' danger' : ''));
    b.type = 'button';
    b.appendChild(el('span', '', o.t));
    if (o.hint) b.appendChild(el('span', 'hint-text', o.hint));
    b.addEventListener('click', function () {
      var f = chooserCb;
      chooserCb = null;
      hideSheet();
      if (f) f(o.v);
    });
    li.appendChild(b);
    ul.appendChild(li);
  });
  showSheet(chooser);
  ul.scrollTop = 0;
}

/* 确认面板：替代原生 confirm()。backSheet = 点"取消"后回到哪个面板 */
function confirmBox(title, msg, okText, onOk, backSheet, cancelText) {
  chooserCb = null;   // 清掉上一个选择器可能残留的回调
  document.getElementById('chooser-title').textContent = title;
  var msgEl = document.getElementById('chooser-msg');
  msgEl.textContent = msg;
  msgEl.hidden = false;
  var ul = document.getElementById('chooser-list');
  ul.innerHTML = '';
  [{ t: okText, v: 1, danger: true }, { t: cancelText || '取消', v: 0 }].forEach(function (o) {
    var li = document.createElement('li');
    var b = el('button', 'opt' + (o.danger ? ' danger' : ''));
    b.type = 'button';
    b.appendChild(el('span', '', o.t));
    b.addEventListener('click', function () {
      hideSheet();
      msgEl.hidden = true;
      if (o.v && onOk) onOk();
      else if (backSheet) showSheet(backSheet);
    });
    li.appendChild(b);
    ul.appendChild(li);
  });
  showSheet(chooser);
  ul.scrollTop = 0;
}

function itemMenu(it) {
  function hint(v) {
    var cur = v === 'cancel' ? 'canceled' : v;
    return cur === it.status ? '当前' : '';
  }
  var inPool = data.pool.some(function (p) { return p.id === poolIdOf(viewKey(), it.id); });
  choose('「' + it.title + '」', [
    { v: 'doing', t: '标记为进行中', hint: hint('doing') },
    { v: 'missed', t: '标记为未完成', hint: hint('missed') },
    { v: 'cancel', t: '取消此事', hint: hint('cancel') },
    { v: 'pool', t: '放入顺延池', hint: inPool ? '已在池中' : '' },
    { v: 'move', t: '移动到其他时段' },
    { v: 'del', t: '删除', danger: true }
  ], function (v) {
    if (v === 'move') { pickBlock(it); return; }
    if (v === 'pool') { putIntoPool(it); return; }
    if (v === 'del') {
      confirmBox('删除事项', '删除「' + it.title + '」？此操作不可撤销。', '删除', function () {
        var day = dayData(viewKey(), false);
        if (day) {
          day.items = day.items.filter(function (x) { return x.id !== it.id; });
        }
        saveData();
        renderSheet();
        render();
        showSheet(sheet);
        haptic();
      }, sheet);
      return;
    } else if (v === 'cancel') {
      it.status = 'canceled';
    } else {
      it.status = v;
    }
    it.updatedAt = iso();
    saveData();
    renderSheet();
    render();
    showSheet(sheet);
    haptic();
  });
}

function pickBlock(it) {
  var g = cfg().granularity, B = blocks(), cur = itemBlock(it);
  var opts = [];
  for (var i = 0; i < B; i++) {
    if (i === cur) continue;
    opts.push({
      v: i,
      t: fmt(blockStartClock(i)) + ' – ' + fmt((blockStartClock(i) + g) % 1440)
    });
  }
  choose('移动「' + it.title + '」到', opts, function (i) {
    it.start = blockStartClock(i);
    it.updatedAt = iso();
    saveData();
    view.block = i;
    renderSheet();
    render();
    showSheet(sheet);
    haptic();
  });
}

/* ===== 顺延池 ===== */
function fmtDay(k) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
  return m ? (+m[2]) + '月' + (+m[3]) + '日' : '未知日期';
}

/* 池条目 id 固定为 pool_<日期>_<事项id>：同一事项重复点"放入"不会多出一条 */
function poolIdOf(key, itemId) { return 'pool_' + key + '_' + itemId; }

/* 手动入池：只往 pool 追加，原日事项一个字段都不改（不写 carried） */
function putIntoPool(it) {
  var key = viewKey(), pid = poolIdOf(key, it.id);
  if (data.pool.some(function (p) { return p.id === pid; })) {
    toast('「' + it.title + '」已在顺延池中');
    showSheet(sheet);
    return;
  }
  data.pool.push({ id: pid, title: it.title, fromDate: key, carriedTimes: 1 });
  saveData();
  updateHeader();
  showSheet(sheet);
  toast('已放入顺延池 · 原日记录不变');
  haptic();
}

function renderPool() {
  var ul = document.getElementById('pool-list');
  ul.innerHTML = '';
  var list = data.pool;
  document.getElementById('pool-sub').textContent = list.length
    ? list.length + ' 项等着安排 · 放回后原日记录仍保留'
    : '在事项「⋯」里可手动放入顺延池';
  if (!list.length) {
    ul.appendChild(el('li', 'empty-row', '池子空着'));
    return;
  }
  list.forEach(function (p) {
    var li = el('li', 'row pool-row');
    var info = el('div', 'poolinfo');
    info.appendChild(el('div', 'rowtitle', p.title));
    info.appendChild(el('div', 'poolmeta',
      '来自 ' + fmtDay(p.fromDate) + (p.carriedTimes > 1 ? ' · 第 ' + p.carriedTimes + ' 次顺延' : '')));
    var back = el('button', 'ghost mini', '放回');
    back.type = 'button';
    back.addEventListener('click', function () { restoreFromPool(p); });
    var del = el('button', 'icon mini', '✕');
    del.type = 'button';
    del.setAttribute('aria-label', '移出顺延池');
    del.addEventListener('click', function () { dropFromPool(p); });
    li.appendChild(info);
    li.appendChild(back);
    li.appendChild(del);
    ul.appendChild(li);
  });
}

function restoreFromPool(p) {
  var tk = todayKey(), g = cfg().granularity, B = blocks(), start0 = startOfKey(tk), opts = [];
  for (var i = 0; i < B; i++) {
    var s0 = (start0 + i * g) % 1440;
    opts.push({ v: i, t: fmt(s0) + ' – ' + fmt((s0 + g) % 1440) });
  }
  choose('「' + p.title + '」放回今天哪个时段', opts, function (i) {
    dayData(tk, true).items.push({
      id: uid(),
      title: p.title,
      start: (start0 + i * g) % 1440,
      duration: g,
      status: 'todo',
      note: '',
      createdAt: iso(),
      updatedAt: iso()
    });
    data.pool = data.pool.filter(function (x) { return x.id !== p.id; });
    saveData();
    view.date = shiftDateOf(new Date());
    view.block = i;
    render();
    renderSheet();
    showSheet(sheet);
    toast('已放回 ' + fmt((start0 + i * g) % 1440));
    haptic();
  });
}

function dropFromPool(p) {
  confirmBox('移出顺延池', '「' + p.title + '」不再出现在池子里，' + fmtDay(p.fromDate) + ' 的记录仍保留。',
    '移出', function () {
      data.pool = data.pool.filter(function (x) { return x.id !== p.id; });
      saveData();
      renderPool();
      updateHeader();
      showSheet(poolSheet);
      haptic();
    }, poolSheet);
}

/* ===== 今日小记（💡 小灯泡=高光 / 📓 笔记本=复盘 / 自定义分类） =====
 * 归属与事项一致：按班次日（viewKey）分组，夜班 00:30 记的是前一天那一班。
 * logs: { "<dateKey>": [{ id, type: 'highlight'|'review'|'custom', text, createdAt }] }
 * P3.6：旧类型 handover→highlight、issue→review（normalize 内迁移）
 */
var logType = 'highlight';
var logTypeModal = document.getElementById('logtype');
var logTypeTitle = document.getElementById('logtype-title');
var logTypeName = document.getElementById('logtype-name');
var logTypeEmojis = document.getElementById('logtype-emojis');
var logTypeEditing = false;
var logTypeEmoji = '📝';

function logMeta(t, lg) {
  if (t === 'custom') {
    var c = data.settings.logCustom || { name: '随记', emoji: '📝' };
    // 优先用条目里定格的图标/名字；P3.9 之前记的没有快照，退回当前配置
    var em = (lg && lg.emoji) || c.emoji;
    var lb = (lg && lg.label) || c.name;
    return { cls: 'custom', label: em + ' ' + lb };
  }
  return t === 'review'
    ? { cls: 'review', label: '📓 笔记本' }
    : { cls: 'highlight', label: '💡 小灯泡' };
}
function logCount(key) { var a = data.logs[key]; return a ? a.length : 0; }

function renderLogTabs() {
  logTabs.innerHTML = '';
  function add(t, label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.type = t;
    b.textContent = label;
    if (t === logType) b.className = 'active';
    logTabs.appendChild(b);
  }
  add('highlight', '💡 小灯泡');
  add('review', '📓 笔记本');
  if (data.settings.logCustom) {
    add('custom', data.settings.logCustom.emoji + ' ' + data.settings.logCustom.name);
  } else {
    add('custom-new', '＋ 自定义');
  }
}

/* 批量选择（P3.35）：面板右上「选择」进入，行左侧出现勾选点，底部一次删除 */
var logSelMode = false;
var logSelIds = {};

function logSelList() { return data.logs[viewKey()] || []; }

function logSelPicked() {
  var n = 0;
  logSelList().forEach(function (lg) { if (logSelIds[lg.id]) n++; });
  return n;
}

function syncLogSelUI() {
  var list = logSelList();
  var n = logSelPicked();
  logSelectBtn.textContent = logSelMode ? '完成' : '选择';
  logSelectBtn.setAttribute('aria-label', logSelMode ? '退出批量选择' : '批量选择小记');
  logSelectBtn.disabled = !list.length;
  logSelBar.hidden = !logSelMode;
  logTypeRow.hidden = logSelMode;
  logForm.hidden = logSelMode;
  logSelCount.textContent = '已选 ' + n + ' 条';
  logSelDelBtn.disabled = !n;
  logSelAllBtn.textContent = (n > 0 && n === list.length) ? '取消全选' : '全选';
}

function toggleLogPick(id) {
  if (logSelIds[id]) delete logSelIds[id]; else logSelIds[id] = 1;
  renderLog();
  haptic();
}

function renderLog() {
  var key = viewKey();
  if (logType === 'custom' && !data.settings.logCustom) logType = 'highlight';
  renderLogTabs();
  var lcount = logCount(key);
  document.getElementById('log-sub').textContent =
    fmtDay(key) + ' · ' + shiftOf(key).name;
  logInput.placeholder = logType === 'review' ? '哪里可以更好一点…'
    : (logType === 'custom' ? '随手记一句…' : '今天有什么值得记住的…');

  var list = data.logs[key] || [];
  // 列表空了就自动退出选择态；顺手清掉已不存在条目的选中标记
  if (logSelMode) {
    if (!list.length) { logSelMode = false; logSelIds = {}; }
    else {
      var alive = {};
      list.forEach(function (lg) { if (logSelIds[lg.id]) alive[lg.id] = 1; });
      logSelIds = alive;
    }
  }

  logList.innerHTML = '';
  if (!list.length) {
    logList.appendChild(el('li', 'empty-row', '还没有小记，记一句也算数'));
    syncLogSelUI();
    return;
  }
  list.forEach(function (lg) {
    var meta = logMeta(lg.type, lg);
    var li = el('li', 'row log-row');
    if (logSelMode) {
      if (logSelIds[lg.id]) li.className += ' picked';
      li.appendChild(el('span', 'sel-check', '✓'));
    }
    li.appendChild(el('span', 'log-badge ' + meta.cls, meta.label));
    var body = el('div', 'log-body');
    body.appendChild(el('div', 'log-text', lg.text));
    var t = new Date(lg.createdAt);
    var clock = isNaN(t.getTime()) ? '' : pad(t.getHours()) + ':' + pad(t.getMinutes());
    body.appendChild(el('div', 'log-time', clock ? clock + ' 记录' : '记录'));
    li.appendChild(body);

    if (logSelMode) {
      li.addEventListener('click', function () { toggleLogPick(lg.id); });
    } else {
      var x = el('button', 'log-del', '✕');
      x.type = 'button';
      x.setAttribute('aria-label', '删除这条小记');
      x.addEventListener('click', function () {
        confirmBox('删除小记', '删除「' + lg.text.slice(0, 20) + '」？只删这条记录。', '删除', function () {
          data.logs[key] = (data.logs[key] || []).filter(function (o) { return o.id !== lg.id; });
          if (!data.logs[key].length) delete data.logs[key];
          saveData();
          renderLog();
          renderDiaryLogs();
          updateHeader();
          showSheet(logSheet);
          toast('已删除小记');
          haptic();
        }, logSheet);
      });
      li.appendChild(x);
    }
    logList.appendChild(li);
  });
  syncLogSelUI();
}

logSelectBtn.addEventListener('click', function () {
  logSelMode = !logSelMode;
  logSelIds = {};
  renderLog();
  haptic();
});

logSelAllBtn.addEventListener('click', function () {
  var list = logSelList();
  var all = list.length > 0 && logSelPicked() === list.length;
  logSelIds = {};
  if (!all) list.forEach(function (lg) { logSelIds[lg.id] = 1; });
  renderLog();
  haptic();
});

logSelDelBtn.addEventListener('click', function () {
  var ids = Object.keys(logSelIds);
  if (!ids.length) return;
  var n = ids.length;
  confirmBox('删除小记', '删除选中的 ' + n + ' 条小记？此操作不可撤销。', '删除', function () {
    var key = viewKey();
    data.logs[key] = (data.logs[key] || []).filter(function (o) { return ids.indexOf(o.id) < 0; });
    if (!data.logs[key].length) delete data.logs[key];
    logSelMode = false;
    logSelIds = {};
    saveData();
    renderLog();
    renderDiaryLogs();
    updateHeader();
    showSheet(logSheet);
    toast('已删除 ' + n + ' 条小记');
    haptic();
  }, logSheet);
});

function openLog() {
  showSheet(logSheet);
  logList.scrollTop = logList.scrollHeight;
}

function renderEmojiRow() {
  logTypeEmojis.innerHTML = '';
  LOG_EMOJIS.forEach(function (em) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.emoji = em;
    b.textContent = em;
    if (em === logTypeEmoji) b.className = 'on';
    b.setAttribute('aria-label', '表情 ' + em);
    logTypeEmojis.appendChild(b);
  });
}
function openLogTypeDialog(editing) {
  logTypeEditing = !!editing;
  var c = data.settings.logCustom;
  logTypeTitle.textContent = logTypeEditing ? '修改小记类型' : '新建小记类型';
  logTypeName.value = c ? c.name : '随记';
  logTypeEmoji = c ? c.emoji : '📝';
  renderEmojiRow();
  logTypeModal.hidden = false;
  setTimeout(function () { logTypeName.focus(); logTypeName.select(); }, 60);
}
function closeLogTypeDialog() { logTypeModal.hidden = true; }
function saveLogType() {
  var name = logTypeName.value.trim().slice(0, 4) || '随记';
  data.settings.logCustom = { name: name, emoji: logTypeEmoji };
  saveData();
  logType = 'custom';
  closeLogTypeDialog();
  renderLog();
  updateHeader();
  logInput.focus();
  toast(logTypeEditing ? '已更新小记类型' : '已添加「' + name + '」');
  haptic();
}

logTabs.addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b || !b.dataset.type) return;
  if (b.dataset.type === 'custom-new') { openLogTypeDialog(false); return; }
  if (b.dataset.type === 'custom' && logType === 'custom') { openLogTypeDialog(true); return; }
  logType = (b.dataset.type === 'review' || b.dataset.type === 'custom') ? b.dataset.type : 'highlight';
  renderLog();
  logInput.focus();
});

logTypeEmojis.addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b || !b.dataset.emoji) return;
  logTypeEmoji = b.dataset.emoji;
  renderEmojiRow();
});
document.getElementById('logtype-cancel').addEventListener('click', closeLogTypeDialog);
document.getElementById('logtype-save').addEventListener('click', saveLogType);
logTypeModal.addEventListener('click', function (e) {
  if (e.target === logTypeModal) closeLogTypeDialog();
});
logTypeName.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); saveLogType(); }
});

logForm.addEventListener('submit', function (e) {
  e.preventDefault();
  var text = logInput.value.trim().slice(0, 80);
  if (!text) { logInput.focus(); return; }
  var key = viewKey();
  if (!data.logs[key]) data.logs[key] = [];
  if (data.logs[key].length >= 100) { toast('这天的小记已经记满 100 条'); return; }
  var entry = {
    id: 'lg' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
    type: logType,
    text: text,
    createdAt: iso()
  };
  // 自定义分类：把当前的图标和名字写进条目，之后改类型不影响这条
  if (logType === 'custom') {
    var lcNow = data.settings.logCustom || { name: '随记', emoji: '📝' };
    entry.emoji = lcNow.emoji;
    entry.label = lcNow.name;
  }
  data.logs[key].push(entry);
  saveData();
  logInput.value = '';
  renderLog();
  renderDiaryLogs();
  updateHeader();
  logList.scrollTop = logList.scrollHeight;
  haptic();
});

/* ===== 记录页（P3.30 / P3.32 / P3.33）=====
 * 数据：data.diary[dateKey] = { text, updatedAt }，与事项/小记一样按查看日归属。
 * 打开：顶部安全带内滑条（P3.32 起圆钮拖过半松手）或底栏「记录」；关闭：记录页
 * 带内反向滑条、左上 ‹、Esc。页面不跟手——滑入的页面会盖住拖动的圆钮，同关机滑条。
 * 滑条文字常驻轨道内（P3.33）：「右滑写日记」/「左滑回轨道」，圆钮画去向图标。
 * 上半是长文，输入后 0.5 秒自动存；下半是当天速记，末尾可直接补记一条。
 */
var diaryOpen = false;
var diaryTimer = null;

function diaryRec(key) { return data.diary[key]; }

function updateDiaryCount() {
  diaryCount.textContent = diaryInput.value.length + ' / 5000 字';
}

function saveDiary() {
  if (diaryTimer) { clearTimeout(diaryTimer); diaryTimer = null; }
  var key = viewKey();
  var text = diaryInput.value.slice(0, 5000);
  var cur = diaryRec(key);
  if (!text.trim()) {
    if (cur) { delete data.diary[key]; saveData(); }
    diarySaved.textContent = '';
    return;
  }
  if (!cur || cur.text !== text) {
    data.diary[key] = { text: text, updatedAt: iso() };
    saveData();
  }
  diarySaved.textContent = '已保存 ' + fmt(nowMin());
}

function renderDiaryLogs() {
  var key = viewKey();
  var list = data.logs[key] || [];
  diaryLogs.innerHTML = '';
  if (!list.length) {
    diaryLogs.appendChild(el('li', 'empty-row', '今天还没有速记，下面记一句'));
    return;
  }
  list.forEach(function (lg) {
    var meta = logMeta(lg.type, lg);
    var li = el('li', 'row log-row');
    li.appendChild(el('span', 'log-badge ' + meta.cls, meta.label));
    var body = el('div', 'log-body');
    body.appendChild(el('div', 'log-text', lg.text));
    var t = new Date(lg.createdAt);
    var clock = isNaN(t.getTime()) ? '' : pad(t.getHours()) + ':' + pad(t.getMinutes());
    body.appendChild(el('div', 'log-time', clock ? clock + ' 记录' : '记录'));
    li.appendChild(body);
    diaryLogs.appendChild(li);
  });
}

function renderDiary() {
  var key = viewKey();
  var rec = diaryRec(key);
  diaryInput.value = rec ? rec.text : '';
  diarySub.textContent = fmtDay(key) + ' · ' + shiftOf(key).name;
  diarySaved.textContent = rec ? '已保存' : '';
  dqInput.value = '';
  updateDiaryCount();
  renderDiaryLogs();
}

function openDiary() {
  renderDiary();
  diaryPage.classList.add('open');
  diaryPage.setAttribute('aria-hidden', 'false');
  diaryOpen = true;
  haptic();
}

function closeDiary() {
  if (diaryOpen) saveDiary();   // 长文可能还没到 0.5s 自动存，先落盘再走
  diaryPage.classList.remove('open');
  diaryPage.setAttribute('aria-hidden', 'true');
  diaryOpen = false;
}

diaryInput.addEventListener('input', function () {
  updateDiaryCount();
  diarySaved.textContent = '输入中…';
  if (diaryTimer) clearTimeout(diaryTimer);
  diaryTimer = setTimeout(saveDiary, 500);
});
diaryInput.addEventListener('blur', saveDiary);

document.getElementById('diary-close').addEventListener('click', closeDiary);
document.getElementById('diary-manage').addEventListener('click', function () {
  // 小记面板要浮在记录页之上
  document.body.classList.add('sheet-over-diary');
  openLog();
});

dqForm.addEventListener('submit', function (e) {
  e.preventDefault();
  var text = dqInput.value.trim().slice(0, 80);
  if (!text) { dqInput.focus(); return; }
  var key = viewKey();
  if (!data.logs[key]) data.logs[key] = [];
  if (data.logs[key].length >= 100) { toast('这天的小记已经记满 100 条'); return; }
  data.logs[key].push({
    id: 'lg' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
    type: 'highlight',
    text: text,
    createdAt: iso()
  });
  saveData();
  dqInput.value = '';
  renderDiaryLogs();
  updateHeader();
  toast('已记下');
  haptic();
});

/* 顶部滑条（P3.32 / P3.33）：圆钮跟手、页面不跟手，松手过半才切页并震动。
 * 提示文字常驻滑轨内（P3.33），拖动不再点亮任何东西。
 * 圆钮只在 40px 范围内起手，不与轨道滚动 / 横向模式抢手势；
 * 移动与松手监听挂在 window 上，手指拖出圆钮也能收到事件。 */
function bindRailSlider(knob, slider, rev, onCommit) {
  var max = 0, drag = false, sx = 0;
  function measure() { max = slider.clientWidth - knob.offsetWidth - 4; }
  function setX(v) {
    v = Math.max(0, Math.min(max, v));
    knob.style.transform = 'translateX(' + (rev ? -v : v) + 'px)';
    return max > 0 ? v / max : 0;
  }
  knob.addEventListener('pointerdown', function (e) {
    measure();
    drag = true; sx = e.clientX;
    knob.classList.remove('spring');
    e.preventDefault();
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    setX(rev ? sx - e.clientX : e.clientX - sx);
  });
  window.addEventListener('pointerup', function (e) {
    if (!drag) return;
    drag = false;
    var p = setX(rev ? sx - e.clientX : e.clientX - sx);
    knob.classList.add('spring');
    if (p >= 0.5) {
      slider.classList.add('commit');
      setTimeout(function () { slider.classList.remove('commit'); }, 300);
      onCommit();
    }
    setX(0);
  });
  window.addEventListener('pointercancel', function () {
    if (!drag) return;
    drag = false;
    knob.classList.add('spring');
    setX(0);
  });
}

bindRailSlider(
  document.getElementById('rail-knob'),
  document.getElementById('rail-slider'),
  false,
  openDiary
);
bindRailSlider(
  document.getElementById('rail-knob-b'),
  document.getElementById('rail-slider-b'),
  true,
  function () { haptic(); closeDiary(); }
);

/* ===== 设置面板辅助 ===== */
function timeVal(v) {
  var m = /^(\d{1,2}):(\d{2})$/.exec(v || '');
  if (!m) return null;
  var t = +m[1] * 60 + +m[2];
  return (t >= 0 && t < 1440) ? t : null;
}
function renderSettings() {
  renderBackupWarn();
  syncThemeUI();
}

/* 备份提醒：有数据且从未导出 / 距上次导出超过 7 天时，在设置页数据区亮一条温和提示 */
function renderBackupWarn() {
  var warn = document.getElementById('backup-warn');
  if (!warn) return;
  var c = backupCounts(data);
  var hasData = c.days > 0 || c.items > 0 || c.logs > 0 || c.pool > 0;
  var days = -1;
  if (cfg().lastExportAt) {
    var t = new Date(cfg().lastExportAt);
    if (!isNaN(t.getTime())) days = Math.floor((Date.now() - t.getTime()) / 86400000);
  }
  if (!hasData || (days >= 0 && days < 7)) { warn.hidden = true; return; }
  warn.hidden = false;
  warn.textContent = days < 0
    ? '已有记录但还没导出过备份，建议先导出一份留底'
    : '已 ' + days + ' 天未导出备份，建议再导出一份';
}

/* ===== 导出 / 导入 =====
 * 备份 = { app:'timerail', kind:'backup', exportedAt, data }
 * 导入接受带信封的备份，也接受裸的 v2 数据；先解析校验，再确认覆盖。
 */
function backupCounts(d) {
  var days = 0, items = 0, logs = 0;
  Object.keys(d.days || {}).forEach(function (k) {
    days++;
    items += (d.days[k].items || []).length;
  });
  Object.keys(d.logs || {}).forEach(function (k) { logs += d.logs[k].length; });
  return { days: days, items: items, logs: logs, diary: Object.keys(d.diary || {}).length,
    shifts: Object.keys(d.shifts || {}).length, pool: (d.pool || []).length };
}

function parseBackup(text) {
  var obj = null;
  try { obj = JSON.parse(text); } catch (e) { return null; }
  var raw = (obj && obj.data && typeof obj.data === 'object') ? obj.data : obj;
  if (!raw || raw.version !== 2 || !raw.settings || typeof raw.settings !== 'object' ||
      !raw.days || typeof raw.days !== 'object') return null;
  return normalize(raw);   // 与启动载入走同一套兜底
}

document.getElementById('export').addEventListener('click', function () {
  data.settings.lastExportAt = iso();   // 导出即备份：记录时间，供设置页提醒
  saveData();
  var text = JSON.stringify({ app: 'timerail', kind: 'backup', exportedAt: iso(), data: data }, null, 2);
  var blob = new Blob([text], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '微记备份-' + ymd(new Date()) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  toast('已导出备份');
  haptic();
  renderBackupWarn();
});

/* ===== 文本导出（P3.31）=====
 * 给人看的版本：只导出记录页的内容（长文 + 速记），UTF-8 带 BOM、CRLF 换行，
 * Windows 记事本打开不乱码。不能导回来，导入仍然只认 JSON 备份。
 */
function dayText(key) {
  var d = parseKey(key);
  if (!d) return '';
  var rec = data.diary[key];
  var logs = data.logs[key] || [];
  var hasText = !!(rec && rec.text && rec.text.trim());
  if (!hasText && !logs.length) return '';
  var week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  var out = ['微记 · ' + ymd(d) + ' ' + week + ' · ' + shiftOf(key).name];
  if (hasText) {
    out.push('');
    out.push('【记录】');
    out.push(rec.text);
  }
  if (logs.length) {
    out.push('');
    out.push('【速记】');
    logs.forEach(function (lg) {
      var t = new Date(lg.createdAt);
      var clock = isNaN(t.getTime()) ? '' : pad(t.getHours()) + ':' + pad(t.getMinutes()) + '  ';
      out.push(clock + logMeta(lg.type, lg).label + '  ' + lg.text);
    });
  }
  return out.join('\n');
}

function downloadText(name, text) {
  var blob = new Blob(['\ufeff' + text.replace(/\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

document.getElementById('export-txt').addEventListener('click', function () {
  var key = viewKey();
  var text = dayText(key);
  if (!text) { toast('这一天还没有记录'); return; }
  downloadText('微记-' + key + '.txt', text);
  toast('已导出文本');
  haptic();
});

document.getElementById('export-all-txt').addEventListener('click', function () {
  var seen = {};
  Object.keys(data.diary).forEach(function (k) { seen[k] = 1; });
  Object.keys(data.logs).forEach(function (k) { seen[k] = 1; });
  var keys = Object.keys(seen).filter(function (k) { return !!dayText(k); }).sort();
  if (!keys.length) { toast('还没有任何记录'); return; }
  var parts = keys.map(dayText);
  downloadText('微记-全部记录-' + ymd(new Date()) + '.txt', parts.join('\n\n──────────\n\n'));
  toast('已导出 ' + keys.length + ' 天的记录');
  haptic();
});

/* ===== 全部记录页（P3.41）=====
 * 从记录页右上按钮进入：把所有有内容的日子倒序堆叠，每天一张卡片（长文 + 速记）。
 * 纯浏览 + 导出，不做跳日期和删除（用户拍板）。有内容与否复用 dayText 的取舍，
 * 与「导出全部文本」口径完全一致。
 */
var allPage = document.getElementById('all-page');
var allBody = document.getElementById('all-body');
var allSub = document.getElementById('all-sub');
var allOpen = false;

function allDays() {
  var seen = {};
  Object.keys(data.diary).forEach(function (k) { seen[k] = 1; });
  Object.keys(data.logs).forEach(function (k) { seen[k] = 1; });
  return Object.keys(seen).filter(function (k) { return !!dayText(k); }).sort().reverse();
}

function renderAll() {
  allBody.innerHTML = '';
  var keys = allDays();
  allSub.textContent = keys.length ? '共 ' + keys.length + ' 天' : '';
  if (!keys.length) {
    allBody.appendChild(el('div', 'all-empty', '还没有任何记录'));
    return;
  }
  keys.forEach(function (k) {
    var d = parseKey(k);
    if (!d) return;
    var week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    var card = el('article', 'all-card');
    var head = el('div', 'all-card-head');
    head.appendChild(el('span', 'all-card-date', ymd(d) + ' ' + week));
    var ex = el('button', 'ghost mini');
    ex.type = 'button';
    ex.textContent = '导出';
    ex.addEventListener('click', function () {
      downloadText('微记-' + k + '.txt', dayText(k));
      toast('已导出 ' + ymd(d) + ' 的文本');
      haptic();
    });
    head.appendChild(ex);
    card.appendChild(head);
    var rec = data.diary[k];
    if (rec && rec.text && rec.text.trim()) {
      card.appendChild(el('div', 'all-sec', '【记录】'));
      card.appendChild(el('div', 'all-text', rec.text));
    }
    var logs = data.logs[k] || [];
    if (logs.length) {
      card.appendChild(el('div', 'all-sec', '【速记】'));
      var ul = el('ul', 'all-logs');
      logs.forEach(function (lg) {
        var meta = logMeta(lg.type, lg);
        var li = el('li', 'row log-row');
        li.appendChild(el('span', 'log-badge ' + meta.cls, meta.label));
        var body = el('div', 'log-body');
        body.appendChild(el('div', 'log-text', lg.text));
        var t = new Date(lg.createdAt);
        var clock = isNaN(t.getTime()) ? '' : pad(t.getHours()) + ':' + pad(t.getMinutes());
        body.appendChild(el('div', 'log-time', clock ? clock + ' 记录' : '记录'));
        li.appendChild(body);
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }
    allBody.appendChild(card);
  });
}

function openAll() {
  renderAll();
  allPage.classList.add('open');
  allPage.setAttribute('aria-hidden', 'false');
  allOpen = true;
  haptic();
}

function closeAll() {
  allPage.classList.remove('open');
  allPage.setAttribute('aria-hidden', 'true');
  allOpen = false;
}

document.getElementById('diary-all').addEventListener('click', openAll);
document.getElementById('all-close').addEventListener('click', closeAll);
/* 导出全部 = 设置里那个按钮的原逻辑，直接复用，不抄第二份 */
document.getElementById('all-export').addEventListener('click', function () {
  document.getElementById('export-all-txt').click();
});

document.getElementById('import').addEventListener('click', function () {
  importFile.value = '';   // 允许连续导入同一个文件
  importFile.click();
});

importFile.addEventListener('change', function () {
  var file = importFile.files && importFile.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('文件太大（上限 5MB）'); return; }
  var reader = new FileReader();
  reader.onload = function () {
    var next = parseBackup(String(reader.result || ''));
    if (!next) { toast('不是有效的微记备份'); return; }
    var s = backupCounts(next);
    confirmBox('导入备份',
      '将覆盖本机数据：' + s.days + ' 天 · ' + s.items + ' 条事项 · ' + s.logs + ' 条小记 · ' +
      s.diary + ' 篇长文 · 顺延池 ' + s.pool + ' 条。当前数据会被替换，不可撤销。',
      '覆盖导入', function () {
        data = next;
        saveData();
        applyTheme();
        hideSheet();
        view.date = shiftDateOf(new Date());
        view.block = 0;
        render();
        scrollToNow(false);
        toast(storageOk ? '已导入备份' : '已载入，但写入本地失败');
        haptic();
      }, settingsSheet);
  };
  reader.onerror = function () { toast('读取文件失败'); };
  reader.readAsText(file);
});

/* ===== 事件 ===== */
document.getElementById('prev').addEventListener('click', function () { shiftDay(-1); });
document.getElementById('next').addEventListener('click', function () { shiftDay(1); });

/* ===== 日历选天（P3.13 / P3.18 两层）：点顶栏日期打开，任意跳转 =====
 * 月视图 → 点顶部年月栏进入年份层（查看年的前后各一年）→ 选年回到同一月份的月视图。
 */
var calEl = document.getElementById('cal');
var calY = 0, calM = 0;
var calLevel = 'month';

function openCal() {
  calY = view.date.getFullYear();
  calM = view.date.getMonth();
  calLevel = 'month';
  renderCal();
  calEl.hidden = false;
}
function closeCal() { calEl.hidden = true; }

function renderCal() {
  var ymEl = document.getElementById('cal-ym');
  var prevEl = document.getElementById('cal-prev');
  var nextEl = document.getElementById('cal-next');
  var weekEl = document.getElementById('cal-week');
  var grid = document.getElementById('cal-grid');
  var yearsEl = document.getElementById('cal-years');
  var todayEl = document.getElementById('cal-today');

  if (calLevel === 'year') {
    ymEl.textContent = '选择年份';
    prevEl.hidden = true;
    nextEl.hidden = true;
    weekEl.hidden = true;
    grid.hidden = true;
    todayEl.hidden = true;
    yearsEl.hidden = false;
    yearsEl.innerHTML = '';
    var thisY = shiftDateOf(new Date()).getFullYear();
    for (var k = -1; k <= 1; k++) {
      var y = calY + k;
      var yb = el('button', 'cal-year' + (y === calY ? ' sel' : ''), y + ' 年');
      yb.type = 'button';
      if (y === thisY) yb.appendChild(el('span', 'cal-year-tag', '今年'));
      yb.addEventListener('click', (function (yy) {
        return function () {
          calY = yy;
          calLevel = 'month';
          renderCal();
        };
      })(y));
      yearsEl.appendChild(yb);
    }
    return;
  }

  ymEl.textContent = calY + '年' + (calM + 1) + '月';
  prevEl.hidden = false;
  nextEl.hidden = false;
  weekEl.hidden = false;
  grid.hidden = false;
  todayEl.hidden = false;
  yearsEl.hidden = true;
  grid.innerHTML = '';
  var first = new Date(calY, calM, 1);
  var start = first.getDay();                 // 周日=0
  var todayS = ymd(shiftDateOf(new Date()));  // 按班次口径的"今天"
  var selS = ymd(view.date);
  for (var i = 0; i < 42; i++) {
    var d = new Date(calY, calM, 1 - start + i);
    var ks = ymd(d);
    var dd = data.days[ks];
    var lg = data.logs[ks];
    var b = el('button', 'cal-d');
    b.type = 'button';
    b.textContent = d.getDate();
    if (d.getMonth() !== calM) b.className += ' dim';
    if (ks === todayS) b.className += ' today';
    if (ks === selS) b.className += ' sel';
    if ((dd && dd.items.length) || (lg && lg.length)) b.className += ' has';
    b.addEventListener('click', (function (dd2) {
      return function () {
        /* 先收起日历，再下一拍换日；顶栏文字不在弹层覆盖期间重排（P3.21） */
        view.date = dd2;
        closeCal();
        setTimeout(function () {
          render();
          scrollToNow(true);
        }, 0);
      };
    })(new Date(d.getFullYear(), d.getMonth(), d.getDate())));
    grid.appendChild(b);
  }
}

/* P3.23：日期整块可点，不只点文字 */
document.getElementById('dayhead').addEventListener('click', openCal);
document.getElementById('cal-ym').addEventListener('click', function () {
  calLevel = calLevel === 'year' ? 'month' : 'year';
  renderCal();
});
document.getElementById('cal-prev').addEventListener('click', function () {
  calM--; if (calM < 0) { calM = 11; calY--; }
  renderCal();
});
document.getElementById('cal-next').addEventListener('click', function () {
  calM++; if (calM > 11) { calM = 0; calY++; }
  renderCal();
});
document.getElementById('cal-today').addEventListener('click', function () {
  view.date = shiftDateOf(new Date());
  closeCal();
  setTimeout(function () {
    render();
    scrollToNow(true);
  }, 0);
});
calEl.addEventListener('click', function (e) { if (e.target === calEl) closeCal(); });

document.getElementById('go-now').addEventListener('click', function () {
  hideSheet();
  view.date = shiftDateOf(new Date());
  render();
  scrollToNow(true);
});
document.getElementById('gear').addEventListener('click', function () { renderSettings(); showSheet(settingsSheet); });
document.getElementById('sheet-close').addEventListener('click', hideSheet);
document.getElementById('chooser-close').addEventListener('click', hideSheet);
document.getElementById('set-close').addEventListener('click', hideSheet);
document.getElementById('pool-close').addEventListener('click', hideSheet);
document.getElementById('pool-link').addEventListener('click', function () {
  renderPool();
  showSheet(poolSheet);
});
document.getElementById('log-link').addEventListener('click', openDiary);
document.getElementById('log-close').addEventListener('click', hideSheet);
backdrop.addEventListener('click', hideSheet);
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (!logTypeModal.hidden) { closeLogTypeDialog(); return; }
  if (!calEl.hidden) { closeCal(); return; }
  if (!onboardEl.hidden) { closeOnboarding(true); return; }
  if (activeSheet) { hideSheet(); return; }
  if (allOpen) { closeAll(); return; }
  if (diaryOpen) { closeDiary(); return; }
});
document.getElementById('storebar-retry').addEventListener('click', function () {
  saveData();
  if (storageOk) toast('已恢复保存');
});

function shiftDay(n) {
  var d = new Date(view.date);
  d.setDate(d.getDate() + n);
  view.date = d;
  var keep = isHoriz() ? wrap.scrollLeft : wrap.scrollTop;   // 换日不跳位置，方便对照同一时刻
  hideSheet();
  render();
  if (isHoriz()) wrap.scrollLeft = keep; else wrap.scrollTop = keep;
}

document.getElementById('orient').addEventListener('click', function () {
  cfg().orientation = isHoriz() ? 'v' : 'h';
  saveData();
  hideSheet();
  render();
  scrollToNow(false);
  haptic();
});

/* iOS 双指缩放（P3.36）：Safari 从 iOS 10 起忽略 user-scalable=no，
   只能拦它的专有手势事件；安卓 Chrome 认 viewport 限制，不需要这段。
   不影响 `#wrap` 滚动与滑条圆钮拖动（`.rail-knob` 自己的 touch-action:none 仍在）。 */
['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) {
  document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
});

document.getElementById('gseg').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b || !ROW_H[+b.dataset.g] || +b.dataset.g === cfg().granularity) return;
  cfg().granularity = +b.dataset.g;
  saveData();
  render();
  scrollToNow(true);
});

document.getElementById('styleseg').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b || !SHAPES[b.dataset.style] || b.dataset.style === cfg().trackStyle) return;
  cfg().trackStyle = b.dataset.style;
  saveData();
  render();
  haptic();
});

document.getElementById('startseg').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.start === 'custom') {
    startCustomMode = true;
    syncStartUI();
    startCustom.focus();
    return;
  }
  startCustomMode = false;
  cfg().dayStart = +b.dataset.start;
  saveData();
  view.date = shiftDateOf(new Date());
  render();
  scrollToNow(true);
  renderSheet();
});

startCustom.addEventListener('change', function () {
  var t = timeVal(startCustom.value);
  if (t == null) { toast('时间格式不对'); return; }
  startCustomMode = false;
  cfg().dayStart = t;
  saveData();
  view.date = shiftDateOf(new Date());
  render();
  scrollToNow(true);
  renderSheet();
});

document.getElementById('themeseg').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  var t = b.getAttribute('data-th');
  if (t !== 'auto' && t !== 'dark' && t !== 'light') return;
  if (cfg().theme === t) return;
  cfg().theme = t;
  saveData();
  applyTheme();
  haptic();
});

shiftInput.addEventListener('input', function () {
  cfg().shiftName = shiftInput.value.trim();
  saveData();
  document.getElementById('sub-label').textContent =
    (cfg().shiftName || '常规日') + (isToday() ? ' · 现在 ' + fmt(nowMin()) : '');
});

document.getElementById('reset').addEventListener('click', function () {
  confirmBox('清空全部数据', '将删除所有日期的事项、小记、长文与全部设置，且不可恢复。', '全部清空', function () {
    data = defaultData();
    saveData();
    applyTheme();
    view.date = shiftDateOf(new Date());
    hideSheet();
    render();
    scrollToNow(false);
  }, settingsSheet);
});

addForm.addEventListener('submit', function (e) {
  e.preventDefault();
  var t = addInput.value.trim().slice(0, 40);
  if (!t) { addInput.focus(); return; }
  dayData(viewKey(), true).items.push({
    id: uid(),
    title: t,
    start: blockStartClock(view.block),
    duration: cfg().granularity,
    status: 'todo',
    note: '',
    createdAt: iso(),
    updatedAt: iso()
  });
  saveData();
  addInput.value = '';
  renderSheet();
  render();
  addInput.focus();
  haptic();
});

window.addEventListener('resize', function () { render(); });

/* ===== Toast ===== */
var toastEl = document.getElementById('toast');
var toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
}

/* ===== 3 步引导 ===== */
var onboardEl = document.getElementById('onboard');
var OB = [
  { t: '一天，一条微记',
    b: '曲线从这一天的起点铺开，每个节点是一段时间。点空白时段，就能加一件事。' },
  { t: '点圈打钩，一步完成',
    b: '点圆圈直接打钩；点事项右侧的「⋯」可以标为进行中、未完成、取消，还能改名和挪时段。' },
  { t: '没做完的，如实记下',
    b: '没做完就在「⋯」里标为未完成，旧日期的记录会完整保留，不会自动挪到第二天。想接着做，就在「⋯」里手动放入顺延池。' }
];
var obIdx = 0;
function obRender() {
  document.getElementById('ob-step').textContent = (obIdx + 1) + ' / ' + OB.length;
  document.getElementById('ob-title').textContent = OB[obIdx].t;
  document.getElementById('ob-body').textContent = OB[obIdx].b;
  var dots = document.getElementById('ob-dots').children;
  for (var i = 0; i < dots.length; i++) dots[i].className = i === obIdx ? 'on' : '';
  document.getElementById('ob-back').hidden = obIdx === 0;
  document.getElementById('ob-next').textContent = obIdx === OB.length - 1 ? '开始使用' : '下一步';
}
function showOnboarding() {
  obIdx = 0;
  onboardEl.hidden = false;
  obRender();
  document.getElementById('ob-next').focus();
}
function closeOnboarding(remember) {
  onboardEl.hidden = true;
  if (remember && !data.settings.onboarded) {
    data.settings.onboarded = true;
    saveData();
  }
}
document.getElementById('ob-next').addEventListener('click', function () {
  if (obIdx < OB.length - 1) { obIdx++; obRender(); return; }
  closeOnboarding(true);
  toast('开始记录你的第一天');
});
document.getElementById('ob-back').addEventListener('click', function () {
  if (obIdx > 0) { obIdx--; obRender(); }
});
document.getElementById('ob-skip').addEventListener('click', function () { closeOnboarding(true); });
document.getElementById('show-onboard').addEventListener('click', showOnboarding);

/* ===== 调试参数（?g=30&start=1200&demo=1 / demo=2） ===== */
function seedItems(key, rows) {
  var day = dayData(key, true);
  if (day.items.length) return;
  rows.forEach(function (r) {
    day.items.push({
      id: uid(),
      title: r[0],
      start: (((r[1] % 1440) + 1440) % 1440),
      duration: 30,
      status: r[2],
      note: '',
      createdAt: iso(),
      updatedAt: iso()
    });
  });
  saveData();
}
function seedDemo() {
  seedItems(todayKey(), [
    ['晨跑 5 公里', 450, 'missed'],
    ['吃早饭', 480, 'done'],
    ['写周报', 540, 'doing'],
    ['回复邮件', 630, 'todo'],
    ['整理桌面', 660, 'todo']
  ]);
}
/* 两天演示：昨天留两条未完成，并把它们直接预置进顺延池（不再自动搬运） */
function seedDemo2() {
  var base = shiftDateOf(new Date());
  var y = new Date(base);
  y.setDate(y.getDate() - 1);
  seedItems(ymd(y), [
    ['晨跑 5 公里', 450, 'missed'],
    ['写周报', 540, 'missed'],
    ['洗衣服', 630, 'done'],
    ['读 30 页书', 660, 'todo']
  ]);
  seedItems(todayKey(), [
    ['写周报（续）', 540, 'todo'],
    ['回复邮件', 480, 'doing']
  ]);
  [
    { id: 'pool_demo_1', title: '晨跑 5 公里' },
    { id: 'pool_demo_2', title: '写周报' }
  ].forEach(function (p) {
    var exists = data.pool.some(function (x) { return x.id === p.id; });
    if (!exists) data.pool.push({ id: p.id, title: p.title, fromDate: ymd(y), carriedTimes: 1 });
  });
  saveData();
}

var isDemo = false, forceOnboard = false;
(function devOverrides() {
  try {
    var q = new URLSearchParams(location.search);
    if (q.has('g') && ROW_H[+q.get('g')]) cfg().granularity = +q.get('g');
    if (q.has('start')) {
      var s = +q.get('start');
      if (s >= 0 && s < 1440) cfg().dayStart = s;
    }
    if (q.has('now')) {
      var n = +q.get('now');
      if (n >= 0 && n < 1440) fakeNow = n;
    }
    if (q.get('name')) cfg().shiftName = q.get('name').slice(0, 10);
    if (SHAPES[q.get('style')]) cfg().trackStyle = q.get('style');
    if (q.get('o') === 'h' || q.get('o') === 'v') cfg().orientation = q.get('o');
    if (q.get('onboard') === '1') forceOnboard = true;
    if (q.get('demo') === '1') { isDemo = true; seedDemo(); }
    else if (q.get('demo') === '2') { isDemo = true; seedDemo2(); }
  } catch (e) {}
})();

/* ===== 启动 ===== */
probeStorage();
applyTheme();          // 先按设置落主题，再渲染轨道
view.date = shiftDateOf(new Date());
render();
scrollToNow(false);   // 先同步定位一次，rAF 在后台标签/离屏 iframe 里可能被节流
requestAnimationFrame(function () { scrollToNow(false); });
if (loadNotice) setTimeout(function () { toast(loadNotice); }, 300);
/* 首访自动引导；?demo 会挡住截图，?onboard=1 可强制看 */
if (forceOnboard || (!data.settings.onboarded && !isDemo)) {
  setTimeout(showOnboarding, forceOnboard ? 400 : 700);
}
/* 30 秒重绘：紧跟"现在"线；切回前台立即重绘，不等计时器 */
setInterval(render, 30000);
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) render();
});
/* 转屏/改窗宽后横向量宽会变，重算一次（防抖） */
var rzTimer = null;
window.addEventListener('resize', function () {
  clearTimeout(rzTimer);
  rzTimer = setTimeout(function () {
    render();
    scrollToNow(false);
  }, 120);
});

/* ===== PWA =====
 * Service Worker 只在 https / localhost 生效；用局域网 IP（http）打开时注册会失败，忽略即可。
 * 安装入口常驻：不依赖 beforeinstallprompt；拿不到 prompt 时给浏览器菜单引导，已装则显示「已安装」。
 */
var deferredInstall = null;
var installHint = document.getElementById('install-hint');

function isStandalone() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
}
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
function renderInstall() {
  if (isStandalone()) {
    installBtn.textContent = '已安装';
    installBtn.disabled = true;
    installHint.textContent = '已在桌面独立运行，数据和浏览器里是同一份。';
    return;
  }
  installBtn.textContent = '安装到桌面';
  installBtn.disabled = false;
  if (deferredInstall) {
    installHint.textContent = '点上面的按钮，确认后就会创建桌面图标，名称是「微记」。';
  } else if (isIOS()) {
    installHint.textContent = 'Safari 底部「分享」→「添加到主屏幕」，名称会自动用「微记」；旧图标要先删掉。';
  } else {
    installHint.textContent = 'Chrome 点右上角 ⋮ →「安装应用」；没有这一项时选「添加到主屏幕」。旧图标要先删掉再装。';
  }
}

window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  deferredInstall = e;
  renderInstall();
});
window.addEventListener('appinstalled', function () {
  deferredInstall = null;
  renderInstall();
  toast('已安装到桌面');
});
installBtn.addEventListener('click', function () {
  if (isStandalone()) return;
  if (!deferredInstall) {
    renderInstall();
    toast(isIOS() ? '请用 Safari 分享 → 添加到主屏幕' : '请点浏览器右上角 ⋮ → 安装应用');
    return;
  }
  var p = deferredInstall;
  deferredInstall = null;
  p.prompt();
  if (p.userChoice) {
    p.userChoice.then(function () { renderInstall(); }, function () { renderInstall(); });
  } else {
    renderInstall();
  }
});
if (window.matchMedia) {
  var mqStandalone = window.matchMedia('(display-mode: standalone)');
  if (mqStandalone.addEventListener) mqStandalone.addEventListener('change', renderInstall);
  else if (mqStandalone.addListener) mqStandalone.addListener(renderInstall);
}
renderInstall();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}

})();
