# 时间轨 TimeRail · 原型交接与正式版规格（v0.2）

> 本文档是"方案文档 v0.1"之后的决策快照。v0.1 里被推翻的部分以本文为准。
> 原型代码：本目录（index.html / styles.css / app.js / _qa.html），零构建，无依赖。
> 更新日期：2026-11-18

---

## 一、相对 v0.1 方案文档的三处决策变更

| # | v0.1 的做法 | v0.2 定稿 | 理由 |
|---|---|---|---|
| 1 | 长按拖拽交换时段是核心体验 | **砍掉拖拽**，改为：点节点 → 底部面板 → 事项"⋯"菜单 → "移动到其他时段" → 列表选择器 | 用户原始需求只有"标记/打钩/未完成标记"，拖拽是 v0.1 自加的；曲线路径命中判定 + 与滚动冲突 + 本机无真机调试工具，是最大翻车点。功能等价，成本约 1/5 |
| 2 | 30 分钟档 = "聚焦模式"（只渲染 ±2h），120 分钟砍掉 | **三档 = 同一视图的缩放**：30/60/120 只改节点数、行高、节点直径，数据不动 | 粒度是视图参数不是数据结构，切换几乎零成本（原型已验证） |
| 3 | 班次模式是"分支功能"（未排期） | **班次模式是核心差异化**：自定义日起点 + 班次模板 + 轮转规则 + 班次日志（P3） | 效率工具赛道"又是一个记事本"拿不到差异化分；倒班人群的具体场景可以 |

> 定位变更（P3.29 起）：对外改为「普通大众的一天记录」，赛道按**学习生活**报名；上表第 3 行的模板/周期功能已在 P3.31 删除，截图、文案和演示数据里都不再出现。

## 二、原型现状（已跑通并截图验证）

### 文件与运行
```
timerail/
  index.html   结构 + 三个底部面板（时段详情 / 选择器 / 设置）
  styles.css   全部样式（暗色主题，状态色见下）
  app.js       全部逻辑（IIFE，无框架）
  _qa.html     截图辅助页：iframe 固定 390×844 真实手机视口 + 交互脚本
```

运行：`python -m http.server 8017 --bind 0.0.0.0`（在 timerail 目录下）
手机：同一 WiFi 访问 `http://<电脑局域网IP>:8017`

### 调试参数（正式版保留，演示/截图/回归都用得上）
| 参数 | 作用 | 示例 |
|---|---|---|
| `g` | 粒度覆盖（30/60/120） | `?g=30` |
| `start` | 一天的起点（分钟数） | `?start=1200`（夜班 20:00 起） |
| `now` | 把"现在"钉在指定分钟 | `?now=570`（09:30） |
| `name` | 班次名称覆盖 | `?name=夜班` |
| `demo` | 注入演示数据（仅空日注入） | `?demo=1` |

`_qa.html` 交互参数：`act=sheet|menu|done|settings|next`，`i`=节点索引，`j`=菜单行索引。
例：`_qa.html?demo=1&now=570&act=done&i=9` = 打开 09:00 时段并打钩。

### 已验证（无头 Chrome，390×844 视口）
- 60/30/120 三档缩放，切档后当前时刻自动回中
- 状态系统：done 实心绿 ✓、doing 蓝 ▶、missed 橙 !、overdue 橙虚线（过时未标记）、canceled 灰删除线、empty 空心
- 完成的区段路径着色加粗；doing/missed 区段半透明着色
- 现在时刻：呼吸外圈 + 全宽虚线"现在 HH:MM"
- 夜班 start=1200：轴从 20:00 铺到次日 19:30，跨零点有"次日"分隔线，00:30 时"今天"正确归属前一天
- 底部面板增删改、状态切换、移动时段、设置面板
- 设置页用户可见术语（P3.7 → P3.31）：**日程名称**，不要用「班次 / 轮转 / 轮换」这些行业词（对外定位是普通大众）；起点预设 00:00 / 06:00 / 08:00 + 自定义。P3.31 起「日程模板 / 多套日程」整块已删除，设置页只剩：一天从几点开始 → 日程名称 → 轨道风格 → 外观 → 使用引导 → 安装 → 数据。数据字段仍叫 `shifts / rotation`，保留只为兼容旧备份
- 对外名称自 P3.8 起为 **微记**（标题 / manifest / 桌面名 / 引导 / 备份文件名）；内部仓库名、网址、`timerail.v2` 存储键、SW 缓存前缀、备份 JSON 的 `app:'timerail'` 都保持不变，别跟着改
- 图标（P3.8）：深底 `#0e131f` + 白色「微记」字标 + 轨道折线；`icon-192/512`、`apple-touch-icon`(180)、`icon-maskable-512` 同一母版，maskable 内容缩到 70% 安全区；字标字体自 P3.10.1 起为华文楷体（带轻微描边），生成脚本不入库
- 小记（P3.9）：条目 `type` 为 `highlight / review / custom`；自定义只有一套，名称与表情存在 `settings.logCustom`（名称 ≤4 字、表情限白名单）；不要做「删除类型」。**显示名定稿（P3.43）**：highlight=「💡 灵光一闪」、review=「📝 温故知新」（type 字段名不动，四处显示层：记成按钮/logMeta 徽标/批量删除/导出 txt）；自定义白名单瘦身 `LOG_EMOJIS = ['✨','🌱','🎯','🧩']`（📝💡 让位主类型，旧配置的 📝 在 normalize 回落 ✨、名称保留），点图标自动带出推荐名 `LOG_NAMES`（闪光时刻/日拱一卒/正中靶心/今日拼图，saveLogType 空名也回落推荐名）；**renderDiary 里必须调 renderLogTabs()**——此前 tabs 只在管理面板 renderLog 里重建，记录页第三按钮（custom/＋自定义）从未出现（P3.43 修复，别删）
- 备份提醒（P3.12）：`settings.lastExportAt` 由导出动作写入，normalize 校验；`renderBackupWarn()` 在 renderSettings 末尾调用，有数据且 ≥7 天（或从未导出）才亮，7 天内或无数据必须隐藏
- iOS 顶部发虚（P3.27 已解决，结论生效）：**只有紧贴屏幕顶边的那条约 60px 会被按低比例栅格化，底栏清晰、图标这种非文字内容同样发虚**。所以「整页 / 整个不滚动框架层被低分辨率栅格化」不成立——受影响的就是顶部这条带本身，而且问题在「画在哪个位置」而不是「怎么画」。用户复现：日历里换一天后顶部发虚；开一次小记/设置再返回立刻清晰；双指缩放时缩小变清晰、松开又模糊（典型的栅格化比例不匹配）。P3.17–P3.24 七次网页侧规避全部实机失败（sticky+veil、cover/panel 自愈、状态栏 `default`、ellipsis/整数行高、1.2% 全屏层、重建布局对象、把日期移出顶栏）。**这些手段不要再重复尝试。** P3.26 实验证实：整条头部下移 60px 即清晰；P3.27 据此把顶部 64px 做成纯色安全垫，图标与日期全部排在安全线以下。`.titlewrap` / `.title` / `.paint-nudge` / `setText()` / `isIOSStandalone()` / `rebuildHeaderLayer()` / `scheduleHeaderRebuild()` 已删除。
- 发虚的处置（定案，别再改方向）：顶部安全垫 = `calc(64px + env(safe-area-inset-top))`，**不要为省空间调低**，也不要再写任何自愈补丁；换机型若仍发虚就按同一公式加大。实验 A（`apple-mobile-web-app-status-bar-style` 改 `black`）已取消，不需要做。
- 更新机制：只有改 `apple-mobile-web-app-*` meta / manifest / 图标 才需要删图标重装；只改 JS/CSS 靠 Service Worker 换缓存，彻底退到后台再打开（必要时两次）即可，验收前先看设置页版本号是否为当前版本。
- 顶栏排版（P3.27 / P3.36）：**顶部 64px 纯色安全垫 + 安全线下方一条页头**，整条高 117px（64 + 44 + 8 + 1）。`.topbar` 内边距 `calc(64px + env(safe-area-inset-top)) 10px 8px`（P3.36 从 4px 加到 10px），底部 1px `--line-soft` 分隔线，`display:flex; align-items:center; justify-content:space-between`。顺序固定为 **⇄ ‹ 日期 › ⚙**：左 `.nav-left` = `#orient`(⇄) + `#prev`(‹)，中 `.head-mid`（id 仍是 `dayhead`，整块可点开日历，`flex:1; min-width:0; padding:0 2px; text-align:center`），右 `.nav-right` = `#next`(›) + `#gear`(⚙)；左右组各 90px 等宽，日期在屏幕上真正居中。图标 44×44（iOS 最小触达区）、圆角 12px，**P3.37 起四个按钮内全是内联 SVG，不再用 `‹ › ⇄ ⇅ ⚙` 字符**（字符由系统字体画，iOS / 安卓 粗细大小不一致）：`.icon.chev svg` 28×28（`color:var(--text-2)`，path `M15 4.5L8 12l7 7.5` / 镜像，stroke 2.2）、`.icon.orient svg` 22×22（双向箭头，`stroke-width:2`）、`#gear svg` 22×22（Feather 齿轮，stroke 1.9）。纵横切换不再换字符：`#orient` 上切 `.vert` 类，CSS `rotate(90deg)`，**同一图形所以两端大小必然一致**；`renderOrient` 里只 `classList.toggle('vert', isHoriz())` 和改 `aria-label`，**绝不能再写 `textContent`**（会把 svg 冲掉）。日期 `.head-date` 15px/21px 600、副标题 `.head-sub` 12px/18px + `margin-top:2px`，两者都带 ellipsis 兜底。**安全垫内只允许纯图形（当前是品牌带），不放任何文字**（文字放了就会糊）。节日已从日期行移到副标题行（`国庆节 · 常规日 · 现在 21:58`），因为日期行只有约 198px 宽。
- 页面缩放（P3.36）：`viewport` 已带 `maximum-scale=1, user-scalable=no`，`body` 加 `touch-action: manipulation`；但 iOS Safari / 主屏 PWA 从 iOS 10 起忽略这两个限制，只能在 `app.js` 里拦 Safari 专有的 `gesturestart / gesturechange / gestureend`（`preventDefault`，`passive:false`）。这是尽力而为：换 iOS 大版本要实机复查一次。不要给 `body` 加 `touch-action:none`（会拖死滚动），滑条圆钮自己的 `touch-action:none` 保持不动。
- 横向模式时间标签（P3.38）：**不再有底部标尺**（`.tlabel.ruler` 已删，别加回来）。每个圆点各带一个 `.tlabel.hlabel`：默认贴节点上方（`translate(-50%,-100%)`），节点在上半屏时加 `.below` 贴下方（`translate(-50%,0)`），**始终朝屏幕中线一侧**，避免撞外侧泳道（`H_LANE0=96`）；`rail` 风格固定上方（事项全在轴下）。含整点加粗、`second` 淡化、时段表情，和纵向标签一致。
- 直线风格竖向居中（P3.39）：轴心从 `W*0.3` 改为 **`W*0.5`**（原值太靠左，空日右侧大片空白）。因为轴正好落在 `W/2`，`x < W/2` 会判成右半边，所以 `renderV()` 里该风格**强制 `side='left'`**（时间贴左、事项在右），别再改成按 x 判断。波浪/蛇形/折线不受影响；横向 rail 的轴高见下条。
- 直线风格横向居中（P3.40）：轴高从 `H*0.3` 改为 **`H*0.5`（`Hc`）**，和竖向对齐；时间标签在上、事项条在下，上下空白对称。`renderH()` 里**必须先设 `track.style.width` 再读 `wrap.clientHeight`**（代码里已强制这个顺序）：横向滚动条会压缩 `clientHeight`，先量后撑会让轴心比可视中线偏下约 7px。横向 rail 的事项仍只走下泳道（`order=['down']`），不要改成上下交替。波浪/蛇形/折线横向不变。
- 品牌带（P3.28）：安全垫内是 `.topbar` 的首个子元素 `<svg class="brandband">`（`viewBox="0 0 390 64"`、`preserveAspectRatio="none"`、`pointer-events:none`、`opacity:.22`、`stroke:url(#bb-fade)` + SVG 内 `linearGradient` 两端渐隐，**不用 mask/filter**），只放图形、不放文字和图标；`#bb-fade` 是那支 SVG 内的渐变 id，别改名。
- 全页禁用 `backdrop-filter`：iOS 上它也会把含文字条带栅格化。顶栏、底栏、引导遮罩均为不透明底；新增条带/弹层同样不要用。`.topbar` 自 P3.18 起为 `position: relative`（页面不滚动，别再加 sticky）。
- 日历选天（P3.13 / P3.18 两层）：`#date-label` 点击 `openCal()`，每次把 `calLevel` 重置为 `month`；`renderCal()` 按 `calLevel` 分支——`month` 固定 42 格（dim 非本月、today 按 shiftDateOf 口径、sel=view.date、has 有事项或小记），`year` 只渲染 `calY-1 / calY / calY+1` 三个 `.cal-year`（选中加 `sel`，今年加 `.cal-year-tag`），并隐藏箭头/周标题/42 格/「回到今天」。点 `#cal-ym` 在两层间切换；选年只改 `calY` 后回到 `month`，`calM` 不动。年份层容器 `#cal-years` 是 flex 列，隐藏靠 `[hidden]` 兜底规则（grid/flex 元素不加会被盖住）。跳转日期后先 `closeCal()`，再 `setTimeout(0)` 里 `render()+scrollToNow(true)`（P3.21：不要先渲染再关弹层）。`.head-mid`（id `dayhead`）是普通容器，点击绑在 `#dayhead` 上（整条可点）
- 节日区间（P3.14 / P3.19 / P3.27）：`HOL_RANGES` = [节日名, 起始日, 天数]，启动展开成 `HOLMAP`（`{日期: 节日名}`）；顶栏只在**副标题行最前面**加 `国庆节 · `（P3.27 起从日期行移过来，因为日期行只有约 198px 宽），**不带「假期」也不带「第 N 天」**。名称统一为 元旦 / 春节 / 清明节 / 劳动节 / 端午节 / 中秋节 / 国庆节。区间为通常放假长度（元旦3/春节7/清明3/劳动5/端午3/中秋3/国庆7），**不含调休补班**；重叠时先声明先赢（2028 中秋在国庆内 → 只显示国庆节）。农历节日逐年录入，2029 起续表
- 小记快照（P3.9.1）：`custom` 条目入库时写 `emoji / label` 定格当时的图标与名字，改类型只影响新条目；normalize 校验这两字段，缺失时退回当前配置
- 自定义类型的「还能改」入口（P3.50.2）：`renderLogTabs` 只给**选中态**的自定义标签加 `editable` 类（并补 aria「…，点按可修改」），CSS 用 `::before`（15px 琥珀圆底）+ `::after`（9px 实心铅笔 mask，data URI）挂在描边右上角外。**入口语义仍是「点它 = 改它」**：未选中点一下只是选中，已选中再点才开修改弹窗，别再叠加长按 / 双击，也别把铅笔画到未选中态。角标是负偏移，会让按钮 `scrollWidth` 略大于 `clientWidth`，这不是文案截断。弹窗提示 `#logtype-hint` 在编辑态改为「改名或换图标只影响之后记的条目，已有小记保持原样」
- 顺延池（P3.50.6 定稿）：池项带 `slot`（绝对分钟）与 `date`（YYYY-MM-DD）。入池 `slot` 取原事项 `start`、`date` 取原日期次日（今天入池 = 明天）；老数据由 `normPool` 补 540 / 明天。**`normPool` 在 `loadData()` 里执行，此时全局 `data` 未赋值，不能调用 `todayKey()`/`cfg()`**（会 TypeError），默认日期要用本地 `new Date()` 算。入口是底栏橙色胶囊 `.pool-link`（不要再改回 11px 下划线文字）；池内左侧两行 `.pool-date`（明天）/ `.pool-slot`（07:00?）分别走 `pickPoolDate()` / `pickPoolSlot()`；「放回」直接落在 date+slot，并把 `view.date` 与 `view.block` 定位过去
- 小记类型身份色（P3.50.3）：`--violet-* / --rose-* / --teal-*` 三组新色在 `:root` 与浅色主题各一份；`[data-tone="amber|blue|green|violet|rose|teal"]` 统一映射成 `--tone-bg / --tone-line / --tone-ink`，标签选中态 `.log-tabs button.active[data-tone]` 与列表徽标 `.log-badge[data-tone]` 共用这套映射——**不要再按 `data-type` 写颜色**。配色：💡灵光一闪 amber、📝温故知新 blue、✨闪光时刻 violet、🌱日拱一卒 green、🎯正中靶心 rose、🧩今日拼图 teal；映射在 `TONE_OF_EMOJI` + `toneOf()`，自定义按**条目入库时定格的 emoji** 取色（`logMeta` 返回 `tone`，`logBadge()` 统一生成徽标），改类型不会让历史变色。未选中的标签保持灰色，屏幕上只留一个彩色重点
- 记录页速记区尺寸（P3.50.4）：`#diary-manage` 固定 40px 高（内联 flex，padding 0 18px，13px 字），`.diary-quick .log-type-row` 上下 6/8px，`.diary-quick .log-tabs button` 11px 字、4px 10px 内边距；管理按钮与标签净距 14px。**改这两处尺寸前先量间距**，低于 12px 手指会误触管理；覆盖只写在 `.diary-quick` / `#diary-manage` 作用域，别动 `.ghost` / `.mini` 通用值
- 小记删除（P3.11 定稿）：每行常驻 32×32 ✕，点击弹确认框后按 id 删除；**不再做滑动手势**（P3.10–P3.10.3 已整体回退），行结构保持 `.log-row` = 徽标 + 正文 + ✕，不要再加 `.log-slide` 或 `swiped` 状态。P3.35 加批量删除：面板右上「选择」→ 每行左侧出现勾选圆点（`sel-check`）、点击行切换选中，底部出现「全选 / 已选 N 条 / 删除」，删除走 `confirmBox` 二次确认；关闭面板 / 删除完成后自动退出选择态（入口是可见按钮，不要再做成隐藏手势）。**P3.48 起管理面板只做选择删除**：`#log-type-row` 与 `#log-form` 已从面板删除，类型切换与速记输入统一在记录页速记区
- 记录页（P3.30 / P3.32 / P3.33）：`#diary-page` 整页从左侧滑入，数据 `data.diary[dateKey] = { text, updatedAt }`（单篇 ≤5000 字，空文本在 normalize 里丢弃）。打开：顶部安全带内滑条 `#rail-slider`（圆钮拖过半松手）或底栏「记录 N」；关闭：记录页带内镜像滑条 `#rail-slider-b`（右钮左拖过半）、左上 ‹ / Esc。**页面不跟手**——滑入的页面会盖住拖动中的圆钮，松手才整页动画（关机滑条同款）；`bindRailSlider` 的 move/up 挂在 window 上，手指拖出圆钮也能收到。滑条住在 64px 发虚带里，P3.33 起提示文字**常驻滑轨内**（`.rail-label`：右滑写日记 / 左滑回轨道，14px 居中被圆钮盖过），圆钮画去向图标（铅笔=去写 / 轨道折线=回轨，20px 内联 SVG）；P3.34 滑条放大（轨高 44 / 圆钮 40，左右边距 36px，top=10px 仍在 64px 带内），带内滑条文字 / 图标的发虚经实机确认接受现状（P3.34 定案），别再为此返工，`.rail-hint` 与 `slider-dragging` 机制已删除，别加回来。P3.35 曾把写作区保底 50vh / 46vh；**P3.48 改为定高 34vh（`#diary-input` 必须 `flex:none`，`flex:1` 会覆盖 height 被 min-height 兜住）+ 速记区 flex:1 吃满剩余高度并自己滚动**，`.diary-body` 因此 `overflow:hidden`（分区滚动，不再整页滚）。P3.30 的顶栏隐形滑动手势已删净（swipeState / suppressClick / diarySwipe 都没了），不要再加回来。从记录页点「管理」时 body 加 `sheet-over-diary`（`.sheet` 80 / `#backdrop` 75；`.modal` 自 P3.48.1 起全局 95，已不需要额外抬升）。
- 全部记录页（P3.41）：记录页右上 `#diary-all`（堆叠文档内联 SVG）打开 `#all-page`（z-index 85，从右滑入，Esc 链在 diary 之前）。把 diary ∪ logs 里有内容的日子**倒序**堆成卡片（`.all-card`）：日期+星期、每卡一个「导出」（当天 txt，复用 `dayText()`）、【记录】长文（pre-wrap 全文展示；P3.41 时不做折叠，**P3.47 已改为默认折叠 + 搜索，见下条**）、【速记】复用 log-row 徽标样式。有内容与否与「导出全部文本」同口径（`allDays()`）；「导出全部」按钮直接 `click()` 设置页的 `#export-all-txt`，别抄第二份逻辑。纯浏览：不跳日期、不删除（用户拍板）。空态「还没有任何记录」。
- 写作区底部（P3.44）：只有右下角 `#diary-count`「N / 5000 字」（实时更新、靠右对齐）。「边写边存，不用点保存」引导文案已删——保存状态由右上「已保存」独家承担，**别再加回重复的保存提示**。
- 底栏（P3.8.2）：「小记 N」是 13px 胶囊，位于粒度切换同一排；「回到现在」是 12px 文字按钮，不要再放大回 ghost 主按钮。P3.30 起这个胶囊文案改为「记录 N」，点开的是记录页，小记面板改由记录页里的「管理」进入。
- 空状态、日期切换（含未来/历史日）
- 引导（P2 建 / **P3.45 扩为 5 步**）：OB 数组驱动（步数、dots、「N / 5」、末步「开始使用」全部自动跟随 OB.length，HTML dots 是硬编码 5 个要同步）；文案：① 一天，一条微记 ② 点圈打钩，一步完成 ③ 没做完的，如实记下 ④ 想写就写，自动保存 ⑤ 随时导出，换机不丢。`?onboard=1` 强制显示；设置里「重看 5 步引导」重开
- 记录页顶部图标（P3.45）：`#diary-close` / `#diary-all` / `#all-close` 的 SVG 统一 30px（触达区 44px 不变）；返回箭头已从字符 ‹ 换成与顶栏同款折线 SVG（P3.37 的漏网字符，至此顶栏/记录页无残留字符图标）
- 安卓返回逐层退出（P3.46）：每开一层界面往 history 压一条（`navPush`，pushState `{tr:1}`），popstate = 关最上层（与 Esc 共用 `backOne` 链：小记弹窗→日历→引导→面板→单日阅读页→全部记录→记录页）；程序性关闭（点 X/‹/滑条）走 `navDrop`（`back()` 消费条目）；根页面上按返回自然退出应用。**新开任何整页/弹层界面必须成对埋点 navPush/navDrop**，漏埋会导致该界面按系统返回直接退应用。双标志：`navDropPending`（程序性 back 的待回声数，popstate 里只递减不关层）、`navPopping`（popstate 驱动关闭时 close 内的 navDrop 自动跳过）。**竞态别动**：关闭的 back() 回声 ~80ms 落地，落地前重开界面直接压栈会留幽灵条目——navPush 遇 pending>0 自动排队（navPushQueued），回声归零后带 anyLayerOpen 守卫补压。QA 坑：history.length 只增不减（判基线用 `history.state == null`）；pushState 从回退位置补压复用条目（length 不增长）；popstate 回声异步（断言轮询别固定 sleep）；headless 自测用信标方案（Image 请求→本地服务器落盘，dump-dom 不可靠）
- 系统返回瞬时关闭（P3.46.1）：iOS 侧滑返回时 WebKit 自带页面转场（截图层交换），popstate 再跑 CSS 关闭动画会与截图层重叠留残影——popstate 关闭前给根节点挂 `nav-instant`（CSS 禁全部过渡、直接跳终态），rAF 下一帧摘除；**主动关闭（Esc/‹/X/滑条）不走此路径，动画保留**。新增界面关闭函数必须保持「同步改 class/hidden、不依赖 transitionend/延时清理」的形态，否则瞬时关闭会破坏清理链。
- 全部记录页折叠与搜索（P3.47）：每天一张卡片只留摘要行（`.all-card-toggle` 整块可点，摘要 `约 N 字 · M 条速记`），搜索框 `#all-q` 实时过滤（`allHaystack` = 长文 + 速记正文小写，天级命中）。**渲染高亮必须用 `appendHl`（createTextNode 切段 + mark），严禁 innerHTML**——用户正文里的 `<` `&` 会被当标签解析。**输入必须处理 compositionstart/end**，拼音组合期间不过滤，否则中文输入时列表逐字母乱闪。「导出全部」固定导全部，不随搜索变；`openAll` 每次清空搜索框。
- 单日阅读页（P3.49）：点任意日卡片 → `openDay(k)` 打开 `#day-page`（整页右滑入，z 86），完整渲染当天长文与速记，命中词继续标黄（`appendHl`）。**列表不再原地展开**（搜索态原来会自动展开、点一下反而收起，用户反馈「定死在那里」）。返回按钮 `#day-close` 与系统返回都只关阅读页（`backOne` 里 `dayOpen` 排在 `allOpen` 之前），并且 **`closeDay` 绝不调 `renderAll()`**——列表 DOM 与搜索词、滚动位置原样保留。`closeAll` 里兜底直接收掉阅读页且不动 history。日期标题口径 `YYYY-MM-DD 周X`，右上「导出这天」复用 `downloadText` + `dayText`。
- 记录页版面（P3.48）：`#log-type-row`（「记成」类型行）与 `#dq-form`（速记输入）都挂在记录页 `.diary-quick` 里，和「今日速记」标题同块常驻——**类型切换不需要先点「管理」**。`.diary-quick` 是 `flex:1; min-height:0` 的纵向 flex：标题行、类型行、输入框都 `flex:none`，只有 `#diary-logs` 自己 `overflow-y:auto`。「管理」面板只保留选择删除。类型的当前值仍是 `logType`（`localStorage` 由 settings 侧的 saveLogType 承担），新增 `syncDqHint()` 让 `#dq-input` 的 placeholder 跟随类型（review=哪里可以更好一点… / custom=随手记一句… / highlight=速记一句…）；**renderDiary / 点类型 / saveLogType 之后都要调它**。速记入库统一走 `#dq-form` 的 submit（含 custom 的 emoji/label 快照），旧的 `#log-form` 录入逻辑已删除。
- 弹窗层级（P3.48.1）：`.modal`（`#logtype` 类型弹窗 / `#cal` 日历）`z-index` 必须 **95**，高于记录页 70 / 全部记录 85 / 悬浮面板 80。P3.48 把类型行搬进记录页后，原先 60 的弹窗被记录页盖住（看起来像点了没反应、焦点跳到写作区）；旧的 `body.sheet-over-diary .modal { z-index:90 }` 补丁已删，别再加回来分情况抬高。
- 确认框与历史条目（P3.48）：`confirmBox` 的第 5 参 `backSheet` 表示「关掉后回到哪个面板」，打开时不 push（与下层共用一条 history 条目），并记进 `chooserBack`。选项点击走 `restoreSheet(backSheet)` **原地切回、完全不动 history**——若写成 `hideSheet()`（back）+ 立刻 `showSheet()`（push），两者同一同步栈、落在 Chrome <80ms 合并窗口里，会合并成跨条目遍历并把顶层页卸载（P3.48 实测）。系统返回关确认框时（popstate 已消耗共用条目）必须 `restoreSheet(cb)` 后 `navPush()` 补压一条，否则少一层、下层面板失去遮罩。**新增任何「确认框浮在面板上」的调用都要传 backSheet**，且 onOk 里不要再 showSheet 同一面板。
- 轨道风格（P3.50 / P3.50.1）：`SHAPES` 只有 3 种 —— `wave` 蛇形 / `rail` 直线 / `zigzag` 折线，设置页也是这 3 个按钮。**大弧（arc）与矩形 / 圆形闭环都试过又撤掉了**（大弧与蛇形重复；矩形 / 圆形观感不佳），`snapStyle` 对任何未知值（含旧存档的 `arc` / `rect` / `circle`）一律回落 `wave`，别再恢复。闭环那套 `renderLoop` / `loopGeom` / `LOOP_PAD` / `.tlabel.loop` / `.hint.loop-hint` / `.seg.five` 已全部删除，`render()` 回到 `renderV()` / `renderH()` 二选一。

### 已知原型局限（正式版要做的都在这）
无顺延池、无跨天顺延、无班次轮转、无班次日志、无 PWA、无导出导入、`confirm()` 用的是原生弹窗（正式版换自定义面板）、无单事项改名（只能删了重加）。

## 三、正式版数据模型（TRAE 按此实现，不要改语义）

```json
{
  "version": 2,
  "settings": {
    "granularity": 60,          // 视图粒度，仅视图参数
    "dayStart": 0,              // 一天的起点分钟（0/480/1200 或任意）
    "shiftName": "常规日",
    "onboarded": false
  },
  "shifts": {                   // P3：班次模板
    "night": { "name": "夜班", "dayStart": 1200, "duration": 720 }
  },
  "rotation": {                 // P3：轮转规则
    "cycle": ["day", "day", "night", "night", "rest", "rest"],
    "anchorDate": "2026-11-01", // cycle[0] 对应的日期
    "active": false
  },
  "days": {
    "2026-11-12": {
      "items": [{
        "id": "itm_xxx",
        "title": "写巡检脚本",
        "start": 540,           // 绝对分钟 0–1439，与 dayStart 解耦！
        "duration": 30,
        "status": "todo",       // 仅存 todo/doing/done/missed/canceled
        "note": "",
        "createdAt": "ISO",
        "updatedAt": "ISO"
      }]
    }
  },
  "pool": [                     // P2：顺延池
    { "id": "itm_0", "title": "周报", "fromDate": "2026-11-11", "carriedTimes": 1, "slot": 420 }
  ],
  "logs": {                     // P3.6：小记，按班次日归属
    "2026-11-12": [{ "id": "lg_x", "type": "highlight", "text": "…", "createdAt": "ISO" }]
  },
  "diary": {                    // P3.30：记录页长文，一篇 ≤5000 字
    "2026-11-12": { "text": "…", "updatedAt": "ISO" }
  }
}
```

### 五条不变量（这是原型踩过坑换来的，必须遵守）
1. **item.start 存"当日绝对分钟"（0–1439）**，不是相对 dayStart 的偏移。改日起点时事项钉在真实钟点上不动。
2. **粒度永不写入 item**。时段归属 = `floor(((start − dayStart) mod 1440) / granularity)`，随时可重算。
3. **overdue 不入库**。它是派生态：`status === 'todo' && 时段已过`。存储态只有五种。
4. **"今天"归属按班次日**：`now < dayStart` 则归属前一个日历日（夜班 00:30 还算"昨天 20:00 开始的那个班"）。日期 key 全部经 `shiftDateOf()`。
5. **跨天只搬 missed 到 pool，原日数据永不删**（复盘依据）。

## 四、正式版排期（对齐赛事日程）

| 阶段 | 日期 | 内容 | 验收点 |
|---|---|---|---|
| P0 | 已完成 | 链路打通：原型 + 本地服务 + Netlify 首次部署 | 手机 4G 打开公网链接 |
| P1 | 11/12–13 | 数据层按上表重构、CRUD、五态切换、点亮路径、持久化、存储失败告警 | 建 5 条 → 打钩 → 刷新全在 |
| P2 | 11/14–15 | 顺延池、跨天顺延、日期切换打磨、3 步引导、空态 | 造两天数据，missed 正确进池并可放回 |
| P3 | 11/16–17 | 班次模板 + 轮转 + 班次日志（交接/异常） | 夜班 20:00 起跨零点正确，日志可存 |
| P4 | 11/18–19 | Netlify 正式部署、真机走查、PWA（manifest+SW）、导出导入 | 主屏图标可离线打开 |
| P5 | 11/20–21 | 演示视频 1–5min、3 张截图、TRAE 证据整理、填问卷 | 问卷可提交状态 |
| P6 | 11/22–23 | 真实用户试用、修 bug、**11/23 白天提交** | 拿到回执 |

降级顺序（时间不够时从后往前砍）：PWA → 班次日志（只留模板+起点）→ 轮转 → 导出（只留导入）。

## 五、TRAE 会话拆分（对应赛事要求的 3 个 Session ID）

| Session | 任务 | 喂给 TRAE 什么 | 留证截图 |
|---|---|---|---|
| ① 方案设计 | 产出正式版模块拆分、文件结构、渲染管线确认 | 本文档 + 方案文档 v0.1 | 需求拆解对话、目录结构 |
| ② 核心功能开发 | P1 + P2（数据层/渲染/CRUD/状态机/池） | 本文档 §三 §四 | 代码片段、运行效果、打钩点亮画面 |
| ③ 问题修复/体验优化 | 真机问题：键盘遮挡面板、滚动穿透、dayStart 边界、PWA 调试 | 复现步骤 + 截图 | 问题复现 → 修复 → 验证 |

**注意**：①②③ 必须是干净的新会话，各自留 Session ID；截图里不得出现 API Key / 公司信息。

## 六、部署备忘

- 推荐 Netlify（本机实测可达，~1s；vercel.app 与 github.io 国内不稳定）：`app.netlify.com/drop` 拖 timerail 目录即得 https 链接。
- 上线后**用手机 4G（非 WiFi）验证一次**。
- 链接必须保活到 12/6（评审期）。
- 评委大概率用电脑打开：桌面浏览器布局已验证（480px 居中列），保持。

## 七、主题规则（P3.15 起）

- `settings.theme` 只存 `auto / dark / light`，默认 `auto`；`normalize()` 对缺省和非法值一律回 `auto`，旧备份不带此字段也能正常载入。
- 生效链路：`document.documentElement.dataset.theme` → CSS `:root[data-theme="light"]` 覆盖语义变量；`applyTheme()` 同时更新 `<meta name="theme-color">`（深 `#0e131f` / 浅 `#f5f8fc`）。
- **新增颜色不要写死**：先在 `:root` 加语义变量（参考 `--chip-line / --chip-bg / --chip-text / --scrim / --shadow-lg / --warn-* / --blue-* / --green-* / --orange-* / --amber-* / --node-* / --hint-*`），组件只引用变量，再在 `:root[data-theme="light"]` 里给值。否则浅色下必然漏改。
- `auto` 用 `matchMedia('(prefers-color-scheme: light)')` 监听系统变化；监听器要兼容 `addEventListener` 与旧版 `addListener`。
- 首屏防闪：`index.html` `<head>` 里的内联小脚本先读 `timerail.v2` 定 `data-theme`，`app.js` 启动后以 `normalize()` 结果为准再校正一次。改主题字段名时必须同步这两处。
- **已知差异**：`manifest.webmanifest` 的 `theme_color / background_color` 是静态深色值，不随主题切换。PWA 启动画面/安装卡片仍显示深色底；不为此新建 manifest。
- 浅色验收必须在 390×844 下逐屏看：三种轨道 × 纵横、节点五态与呼吸圈、时间标签、chip、次日分隔与现在线、底栏、时段面板、顺延池、小记与自定义弹窗、设置全部区块、日历（今天/选中/绿点）、引导、存储失败告警条。
- 浅色下原生日期/时间控件需要 `color-scheme: light`（已对 `#start-custom` 覆盖）。
- 版本三处同步照旧：`index.html` 的 `?v=`（manifest / css / js）、`sw.js` 的 CACHE 与 ASSETS、设置页版本注记。

## 八、进阶区（P3.16 起，P3.31 已移除）

- 「进阶 · 多套日程」整块界面（折叠卡片、模板列表、新建模板、按天自动套用、添加一天、启用、从哪天开始）已在 P3.31 删除，相关 JS / CSS 一并清掉，**不要再加回来**。
- `data.shifts`、`data.rotation` 两个字段仍保留在 normalize 与备份里，只为了读得进旧数据；`rotation.active` 一律强制为 `false`，它们不再影响任何视图。
- 起点就是设置里手选的「一天从几点开始」，没有第二种来源。

## 九、P3.51 约定：状态与时段（2026-11-21）

- **圈只管显示，不再兼作完成开关**。节点圈内只出现「已完成」的 ✓（一个时段多项时仍显示 `done/total`）；进行中 / 未完成 / 已取消只用圈的颜色与描边区分（蓝环 / 橙环 / 虚线圈）。任何「点圈直接打钩」的写法都不要再加回来。
- 改状态唯一入口：详情面板行首的 `.status-chip` → `statusMenu()` 五选一（`todo / doing / done / missed / canceled`）。状态名统一走 `STATUS_NAME`，不要另写别名。
- 改时段唯一入口：详情面板的 `.when-chip` → `#when-sheet`（`openWhen`）。两个原生 `type=time`（`step=900`），`snap15()` 取整到 15 分钟；结束早于开始按次日算（`d += 1440`），最短 15 分钟。
- 保存时段后必须同时 `view.block = itemBlock(whenItem)`，否则事项换了时段就从当前面板里消失。
- 跨时段可见性：竖向由 `.spanbar` 沿轨道采样绘制（只画 `duration > granularity` 的事项）；段线配色与完成比例用 `itemsCovering(i)`，不要退回 `itemBlock` 只看起点。
- `backOne()` 里 `whenSheet` 必须排在通用 `activeSheet` 之前：先退回详情面板，避免系统返回把两层一起关。
- 版本串三处同步：`index.html` 的 `?v=` ×3 + 设置页注记、`sw.js` 的 `CACHE` 与 `ASSETS`。

### P3.51.1 补充

- 改时段的入口必须保持「双通道」：行内 `.when-chip`（虚线下划线 + ›）与「⋯」菜单「改时段 / 自定义时长」。只留其中任何一个都会被认为找不到。

### P3.51.2 补充

- `choose()` 的第 4 个参数 `backSheet` 是从面板拉起选择器时的**必填项**：传了它，系统返回才会切回原面板；漏传就会直接掉回主页。新增任何「面板 → 选择器」的调用都要带上来源面板。
