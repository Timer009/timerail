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
- 小记（P3.9）：条目 `type` 为 `highlight / review / custom`；自定义只有一套，名称与表情存在 `settings.logCustom`（名称 ≤4 字、表情限白名单）；不要做「删除类型」
- 备份提醒（P3.12）：`settings.lastExportAt` 由导出动作写入，normalize 校验；`renderBackupWarn()` 在 renderSettings 末尾调用，有数据且 ≥7 天（或从未导出）才亮，7 天内或无数据必须隐藏
- iOS 顶部发虚（P3.27 已解决，结论生效）：**只有紧贴屏幕顶边的那条约 60px 会被按低比例栅格化，底栏清晰、图标这种非文字内容同样发虚**。所以「整页 / 整个不滚动框架层被低分辨率栅格化」不成立——受影响的就是顶部这条带本身，而且问题在「画在哪个位置」而不是「怎么画」。用户复现：日历里换一天后顶部发虚；开一次小记/设置再返回立刻清晰；双指缩放时缩小变清晰、松开又模糊（典型的栅格化比例不匹配）。P3.17–P3.24 七次网页侧规避全部实机失败（sticky+veil、cover/panel 自愈、状态栏 `default`、ellipsis/整数行高、1.2% 全屏层、重建布局对象、把日期移出顶栏）。**这些手段不要再重复尝试。** P3.26 实验证实：整条头部下移 60px 即清晰；P3.27 据此把顶部 64px 做成纯色安全垫，图标与日期全部排在安全线以下。`.titlewrap` / `.title` / `.paint-nudge` / `setText()` / `isIOSStandalone()` / `rebuildHeaderLayer()` / `scheduleHeaderRebuild()` 已删除。
- 发虚的处置（定案，别再改方向）：顶部安全垫 = `calc(64px + env(safe-area-inset-top))`，**不要为省空间调低**，也不要再写任何自愈补丁；换机型若仍发虚就按同一公式加大。实验 A（`apple-mobile-web-app-status-bar-style` 改 `black`）已取消，不需要做。
- 更新机制：只有改 `apple-mobile-web-app-*` meta / manifest / 图标 才需要删图标重装；只改 JS/CSS 靠 Service Worker 换缓存，彻底退到后台再打开（必要时两次）即可，验收前先看设置页版本号是否为当前版本。
- 顶栏排版（P3.27）：**顶部 64px 纯色安全垫 + 安全线下方一条页头**，整条高 117px（64 + 44 + 8 + 1）。`.topbar` 内边距 `calc(64px + env(safe-area-inset-top)) 4px 8px`，底部 1px `--line-soft` 分隔线，`display:flex; align-items:center; justify-content:space-between`。左 `.nav-left`（`‹ ›`）、中 `.head-mid`（id 仍是 `dayhead`，整块可点开日历，`flex:1; min-width:0; padding:0 2px; text-align:center`）、右 `.nav-right`（`⇄ ⚙`）；左右组各 90px 等宽，日期在屏幕上真正居中。图标 44×44（iOS 最小触达区）、圆角 12px，`.icon` 21px、`.icon.chev`（‹ ›）28px + `padding-bottom: 3px`。日期 `.head-date` 15px/21px 600、副标题 `.head-sub` 12px/18px + `margin-top:2px`，两者都带 ellipsis 兜底。**安全垫内只允许纯图形（当前是品牌带），不放任何文字**（文字放了就会糊）。节日已从日期行移到副标题行（`国庆节 · 常规日 · 现在 21:58`），因为日期行只有约 198px 宽。
- 品牌带（P3.28）：安全垫内是 `.topbar` 的首个子元素 `<svg class="brandband">`（`viewBox="0 0 390 64"`、`preserveAspectRatio="none"`、`pointer-events:none`、`opacity:.22`、`stroke:url(#bb-fade)` + SVG 内 `linearGradient` 两端渐隐，**不用 mask/filter**），只放图形、不放文字和图标；`#bb-fade` 是那支 SVG 内的渐变 id，别改名。
- 全页禁用 `backdrop-filter`：iOS 上它也会把含文字条带栅格化。顶栏、底栏、引导遮罩均为不透明底；新增条带/弹层同样不要用。`.topbar` 自 P3.18 起为 `position: relative`（页面不滚动，别再加 sticky）。
- 日历选天（P3.13 / P3.18 两层）：`#date-label` 点击 `openCal()`，每次把 `calLevel` 重置为 `month`；`renderCal()` 按 `calLevel` 分支——`month` 固定 42 格（dim 非本月、today 按 shiftDateOf 口径、sel=view.date、has 有事项或小记），`year` 只渲染 `calY-1 / calY / calY+1` 三个 `.cal-year`（选中加 `sel`，今年加 `.cal-year-tag`），并隐藏箭头/周标题/42 格/「回到今天」。点 `#cal-ym` 在两层间切换；选年只改 `calY` 后回到 `month`，`calM` 不动。年份层容器 `#cal-years` 是 flex 列，隐藏靠 `[hidden]` 兜底规则（grid/flex 元素不加会被盖住）。跳转日期后先 `closeCal()`，再 `setTimeout(0)` 里 `render()+scrollToNow(true)`（P3.21：不要先渲染再关弹层）。`.head-mid`（id `dayhead`）是普通容器，点击绑在 `#dayhead` 上（整条可点）
- 节日区间（P3.14 / P3.19 / P3.27）：`HOL_RANGES` = [节日名, 起始日, 天数]，启动展开成 `HOLMAP`（`{日期: 节日名}`）；顶栏只在**副标题行最前面**加 `国庆节 · `（P3.27 起从日期行移过来，因为日期行只有约 198px 宽），**不带「假期」也不带「第 N 天」**。名称统一为 元旦 / 春节 / 清明节 / 劳动节 / 端午节 / 中秋节 / 国庆节。区间为通常放假长度（元旦3/春节7/清明3/劳动5/端午3/中秋3/国庆7），**不含调休补班**；重叠时先声明先赢（2028 中秋在国庆内 → 只显示国庆节）。农历节日逐年录入，2029 起续表
- 小记快照（P3.9.1）：`custom` 条目入库时写 `emoji / label` 定格当时的图标与名字，改类型只影响新条目；normalize 校验这两字段，缺失时退回当前配置
- 小记删除（P3.11 定稿）：每行常驻 32×32 ✕，点击弹确认框后按 id 删除；**不再做滑动手势**（P3.10–P3.10.3 已整体回退），行结构保持 `.log-row` = 徽标 + 正文 + ✕，不要再加 `.log-slide` 或 `swiped` 状态
- 记录页（P3.30）：`#diary-page` 整页从左侧滑入，数据 `data.diary[dateKey] = { text, updatedAt }`（单篇 ≤5000 字，空文本在 normalize 里丢弃）。打开：`.topbar` 向右拖（跟手，首次判断 >10px 且水平占优，起手避开最左 18px）或底栏「记录 N」；关闭：左上 ‹ / `.diary-top` 左滑 / Esc。松手阈值 = 屏宽 30%。手势只在顶栏生效，**不要扩到 `#wrap`**（会与轨道滚动冲突）。从记录页点「分类 / 删除」时 body 加 `sheet-over-diary`（`.sheet` 80 / `#backdrop` 75 / `.modal` 90），否则小记面板会被记录页盖住。
- 底栏（P3.8.2）：「小记 N」是 13px 胶囊，位于粒度切换同一排；「回到现在」是 12px 文字按钮，不要再放大回 ghost 主按钮。P3.30 起这个胶囊文案改为「记录 N」，点开的是记录页，小记面板改由记录页里的「分类 / 删除」进入。
- 空状态、日期切换（含未来/历史日）

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
    { "id": "itm_0", "title": "周报", "fromDate": "2026-11-11", "carriedTimes": 1 }
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
- 浅色验收必须在 390×844 下逐屏看：四种轨道 × 纵横、节点五态与呼吸圈、时间标签、chip、次日分隔与现在线、底栏、时段面板、顺延池、小记与自定义弹窗、设置全部区块、日历（今天/选中/绿点）、引导、存储失败告警条。
- 浅色下原生日期/时间控件需要 `color-scheme: light`（已对 `#start-custom` 覆盖）。
- 版本三处同步照旧：`index.html` 的 `?v=`（manifest / css / js）、`sw.js` 的 CACHE 与 ASSETS、设置页版本注记。

## 八、进阶区（P3.16 起，P3.31 已移除）

- 「进阶 · 多套日程」整块界面（折叠卡片、模板列表、新建模板、按天自动套用、添加一天、启用、从哪天开始）已在 P3.31 删除，相关 JS / CSS 一并清掉，**不要再加回来**。
- `data.shifts`、`data.rotation` 两个字段仍保留在 normalize 与备份里，只为了读得进旧数据；`rotation.active` 一律强制为 `false`，它们不再影响任何视图。
- 起点就是设置里手选的「一天从几点开始」，没有第二种来源。
