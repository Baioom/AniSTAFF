# 动画制作人员查询表（AniStaff）

静态版「日本动画制作人员查询表」：以萌娘百科《日本TV动画OP表记》为内容来源，收录 TV 动画 OP 表记中的**动画制作人员**及其作品；作品库读取自 Weblio《日本のテレビアニメ作品一覧》等列表（1963 年至今），作品中文名使用萌娘百科、哔哩哔哩番剧库与人工编辑覆盖。纯静态站点，无后端，可直接部署到 GitHub + EdgeOne Pages。

## 功能

| 板块 | 说明 |
| --- | --- |
| **人员查询** | 展示每人的**职业**标签（监督·演出 / 脚本 / 作画 / 美术·色彩 / 摄影·特效 / 音响 / 音乐 / 制作人 / 编集 / 企划 / 动画制作），支持按职业筛选；A–Z 首字母栏吸顶跟随，**不保留 # 分类**；**排除**作词、作曲、编曲、诗、作诗、演唱、歌、唱、歌手、声优、旁白等职务；人员已做重复合并 |
| **作品库** | 1963 年起的 TV动画 / 剧场版 / OVA / 网络动画；类型标签 + 年份筛选 + 卡片网格；作品名显示中文译名（附日文原名），**同名多期作品会标注「第N期」**；按**年份**或**中文拼音首字母**排序；**点击卡片弹出该作品的制作人员表记**（弹窗可点击 × / 遮罩 / Esc 关闭）；**同系列多期/多版本会在卡片上显示其他期链接**，主要制作人员（企画/监督/系列构成/角色设计/美术监督/色彩设计/摄影监督/音乐/音响监督/执行制作人/总制作人/制作人/动画制作人/动画制作）有变动时提供**对比按钮**，逐期对照并高亮变动 |
| **原作** | 原作 / 原案 / 漫画类表记单独成表，点击展开作品列表 |
| **制作公司** | 仅收录**元请动画制作公司**（参考萌娘百科《动画公司》模板：东映动画、SUNRISE、J.C.STAFF、TMS 等 78 家）；只保留「制作 / 製作 / 动画制作」抬头，**企划、制作委员会、其他抬头不计入**；合作制作会**拆成多家公司**（如 `100studio×Studio Palette` → 100studio、Studio Palette；`J.C.STAFF/NOMAD` → J.C.STAFF、NOMAD），名称中的成立周年前缀会被清除（`60thTMS Entertainment` → TMS Entertainment、`25 quarter century BONES` → BONES） |
| **去世人员** | 时间线样式：日期 + 姓名 + 「去世」标签 + 职务/享年/代表作说明 |
| **未翻译作品** | 列出没有中文名的作品，可在页面直接填写中文名，并**一键上传到 GitHub 仓库**（自动提交 `data/zh-overrides.json`，填一次 Token 即可；也支持导出 / 导入 JSON 备用） |

## 数据来源

| 数据 | 来源 |
| --- | --- |
| 制作人员、TV 动画作品与职务、原作、制作公司 | [萌娘百科 · 日本TV动画OP表记](https://mzh.moegirl.org.cn/User:%E9%BB%91%E9%BB%91%E7%9A%84%E7%99%BD%E6%8F%8F/%E6%97%A5%E6%9C%ACTV%E5%8A%A8%E7%94%BBOP%E8%A1%A8%E8%AE%B0)（1963–2026 各年份子页面） |
| 职业归类参考 | 萌娘百科 [Template:日本动画制作人员](https://mzh.moegirl.org.cn/Template:%E6%97%A5%E6%9C%AC%E5%8A%A8%E7%94%BB%E5%88%B6%E4%BD%9C%E4%BA%BA%E5%91%98) 及其子模板（动画导演 / 动画制作人 / 日本脚本家 / 日本音响监督） |
| 元请制作公司名单 | 萌娘百科 [Template:动画公司](https://mzh.moegirl.org.cn/Template:%E5%8A%A8%E7%94%BB%E5%85%AC%E5%8F%B8)（对齐 ja/zh 维基百科的动画制作公司列表） |
| TV/剧场版/OVA 作品库（名称与年份） | [Weblio · 日本のテレビアニメ作品一覧](https://www.weblio.jp/content/%E6%97%A5%E6%9C%AC%E3%81%AE%E3%83%86%E3%83%AC%E3%83%93%E3%82%A2%E3%83%8B%E3%83%A1%E4%BD%9C%E5%93%81%E4%B8%80%E8%A6%A7) / [电影](https://www.weblio.jp/content/%E6%97%A5%E6%9C%AC%E3%81%AE%E3%82%A2%E3%83%8B%E3%83%A1%E6%98%A0%E7%94%BB%E4%BD%9C%E5%93%81%E4%B8%80%E8%A6%A7) / [OVA](https://www.weblio.jp/content/%E6%97%A5%E6%9C%AC%E3%81%AEOVA%E4%BD%9C%E5%93%81%E4%B8%80%E8%A6%A7)（维基百科镜像） |
| 作品中文译名 | 萌娘百科作品条目 + 哔哩哔哩番剧库（日期唯一匹配 + 汉字重合度校验）+ **Bangumi 番组计划镜像**（按日文原名检索取中文名）+ 页面内人工编辑 |
| 人员词条（剧场版/OVA 作品、生卒信息） | 萌娘百科人物词条（约 600+ 人已抓取） |

## 目录结构

```
site/
├─ index.html          页面骨架（六个板块 + 作品详情弹窗）
├─ app.js              交互逻辑（纯原生 JS）
├─ style.css           样式
└─ data/
   ├─ meta.json           元信息（数据量、生成时间、来源）
   ├─ staff-index.json    人员索引（含职业标签）
   ├─ staff-A.json …      人员详情分片（staff-#.json 为其他字符）
   ├─ works-db.json       作品库（tv/movie/ova/web，1963 年起）
   ├─ works-credits.json  作品→制作人员表记索引（供卡片弹窗）
   ├─ authors.json        原作表
   ├─ companies.json      元请制作公司表
   ├─ deceased.json       去世人员
   └─ zh-overrides.json   （可选）人工录入的中文名覆盖
```

## 中文名录入流程

1. 打开「未翻译作品」页，逐条填写中文名（自动存到浏览器 localStorage）；
2. 点「导出中文名 JSON」下载 `zh-overrides.json`；
3. 把文件放到仓库 `site/data/zh-overrides.json` 并部署 —— 站点加载时会自动应用，重新构建时也会合并进数据。

## 部署（GitHub + EdgeOne Pages）

1. 把 `site/` 目录内的全部文件提交到你现有的 GitHub 仓库（可直接替换仓库根目录）；
2. 在腾讯云 EdgeOne Pages 控制台绑定该仓库，构建目录设为仓库根目录（纯静态无需构建命令）；
3. 发布后通过你绑定在 EdgeOne 上的自有域名访问。

> EdgeOne 的**预览链接**（`xxx.edgeone.cool`）会过期并返回 401，正式访问请用自有域名。

## 数据更新

`tools/` 目录包含抓取与构建脚本（Node.js ≥ 20）：

```bash
node tools/fetch-moegirl.mjs          # 萌百 OP表记 49 个年份页面
node tools/fetch-weblio.mjs           # Weblio TV 列表（含 1963 年前数据，构建时过滤）
node tools/fetch-movie.mjs            # Weblio 电影列表
node tools/fetch-prof-templates.mjs   # 萌百职业分类模板（导演/制作人/脚本/音响监督）
node tools/crawl-bili.mjs             # 哔哩哔哩番剧库（中文标题、开播日期）
node tools/parse-op.mjs               # 解析 OP表记 → 人员/原作/公司/作品表记（含去重）
node tools/parse-weblio.mjs           # 解析 Weblio 作品库
node tools/parse-staff.mjs            # 解析人员词条作品章节
node tools/parse-deceased.mjs         # 解析已故人员生卒信息
node tools/build-data.mjs             # 生成 site/data/*.json
```

抓取时请放慢并发、控制频率，尊重各站点服务器。

## 已知限制

- 基于 OP 表记，人员/原作/作品表记以 **TV 动画** 为主；剧场版/OVA/网络动画取自人员词条，覆盖有词条的人员；
- **多期作品按「标题+年份」分别建档**：同名的不同期不再共用一份 STAFF；作品页 STAFF 表格（`tools/crawl-workpages.mjs` + `tools/parse-workstaff.mjs`）会按期数并入对应年份，缺失时显示「暂无表记」而不是套用其他期数据；
- 作词、作曲、编曲、诗、作诗、演唱、歌、唱、歌手、声优、旁白等职务已全部排除；原作/原案/漫画单独成表；元请制作公司单独成表（企划公司与制作委员会不计入）；
- 作品中文名覆盖约 **TV 62%（3,921/6,299）· 剧场版 48%（1,090/2,269）· OVA 33%（341/1,024）**，其余可在「未翻译作品」页手工录入；
- 作品页 STAFF 抓取受萌娘百科限流（403）影响，当前仅完成部分系列页，脚本可反复续跑（已抓页面自动跳过）；
- 去世人员 33 人（含代表作/享年），扩充受限于萌娘百科「已故人物」分类规模；
- 萌娘百科的「模板链入页面」（WhatLinksHere）对未登录访问返回权限错误，因此无法批量抓取所有使用《日本动画制作人员》模板的页面，仅使用了其职业子模板做职业校正。
