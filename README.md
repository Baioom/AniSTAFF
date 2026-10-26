# 动画制作人员查询表（AniStaff）

静态版「日本动画制作人员查询表」：以萌娘百科《日本TV动画OP表记》为内容来源，收录 TV 动画 OP 表记中的制作人员及其作品；作品库（名称与年份）读取自 Weblio《日本のテレビアニメ作品一覧》等列表。纯静态站点，无后端，可直接部署到 GitHub + EdgeOne Pages。

- 在线地址（示例）：`https://anistaff-<你的项目>.edgeone.cool/`
- 数据快照生成时间：见页面底部

## 功能

- **人员查询**：按中文名 / 拼音搜索，按首字母（拼音）或作品数排序，A–Z 快速导航
- **人员作品**：点击人员查看其作品列表，按 **时间** / **首字母** 两种方式排序（可切换升序 / 降序），显示年份、日文名、职务
- **作品库**：TV动画 / 剧场版 / OVA 三个分类，支持名称搜索、按时间 / 首字母排序，含年份、制作公司、监督信息
- 作品按类别分组展示：TV动画 / 剧场版 / OVA / 网络动画；TV动画数据来自 OP表记，剧场版 / OVA 数据来自萌百人员词条的作品章节（当前覆盖约 600 个有词条的人员）

## 目录结构

```
site/
├─ index.html          页面骨架
├─ app.js              交互逻辑（纯原生 JS）
├─ style.css           样式
└─ data/
   ├─ meta.json        元信息（数据量、生成时间、来源）
   ├─ staff-index.json 人员索引（列表页用）
   ├─ staff-A.json …   人员详情分片（按首字母，staff-%23.json 为其他字符）
   └─ works-db.json    作品库（TV/剧场版/OVA）
```

## 部署（GitHub + EdgeOne Pages）

1. 把 `site/` 目录内的全部文件提交到你现有的 GitHub 仓库（可以直接替换仓库根目录，与现有 `index.html` 同级）；
2. 在腾讯云 EdgeOne Pages 控制台中，绑定该仓库并设置构建目录为仓库根目录（纯静态无需构建命令）；
3. 发布后即可通过你的阿里云域名（经 EdgeOne 代理）访问。

> 注意：EdgeOne 的**预览链接**（`xxx.edgeone.cool`）会过期并返回 401，正式访问请使用你绑定在 EdgeOne 上的自有域名。

## 数据来源

| 数据 | 来源 |
| --- | --- |
| 制作人员与其 TV 动画作品、职务 | [萌娘百科 · User:黑黑的白描/日本TV动画OP表记](https://mzh.moegirl.org.cn/User:%E9%BB%91%E9%BB%91%E7%9A%84%E7%99%BD%E6%8F%8F/%E6%97%A5%E6%9C%ACTV%E5%8A%A8%E7%94%BBOP%E8%A1%A8%E8%AE%B0)（含 1963–2026 各年份子页面） |
| TV动画作品库（名称/年份/公司） | [Weblio · 日本のテレビアニメ作品一覧](https://www.weblio.jp/content/%E6%97%A5%E6%9C%AC%E3%81%AE%E3%83%86%E3%83%AC%E3%83%93%E3%82%A2%E3%83%8B%E3%83%A1%E4%BD%9C%E5%93%81%E4%B8%80%E8%A6%A7)（年代子页面，内容为维基百科镜像） |
| 剧场版作品库 | [Weblio · 日本のアニメ映画作品一覧](https://www.weblio.jp/content/%E6%97%A5%E6%9C%AC%E3%81%AE%E3%82%A2%E3%83%8B%E3%83%A1%E6%98%A0%E7%94%BB%E4%BD%9C%E5%93%81%E4%B8%80%E8%A6%A7) |
| OVA 作品库 | [Weblio · 日本のOVA作品一覧](https://www.weblio.jp/content/%E6%97%A5%E6%9C%AC%E3%81%AEOVA%E4%BD%9C%E5%93%81%E4%B8%80%E8%A6%A7) |

数据整理为结构化 JSON 后由前端静态加载；版权归原站点所有。

## 数据更新

仓库内的 `tools/` 目录包含抓取与构建脚本（Node.js ≥ 20）：

```bash
node tools/fetch-moegirl.mjs   # 抓取萌百 OP表记 49 个年份页面 → src/moegirl/
node tools/fetch-weblio.mjs    # 抓取 Weblio TV 列表年代页面 → src/weblio/
node tools/fetch-movie.mjs     # 抓取 Weblio 电影列表年代页面 → src/weblio/
node tools/parse-op.mjs        # 解析 OP表记 → data/raw/op-works.json / op-staff.json
node tools/parse-weblio.mjs    # 解析 Weblio 作品库 → data/raw/weblio-db.json
node tools/build-data.mjs      # 汇总并生成 site/data/*.json（含拼音首字母）
```

抓取时请放慢并发、控制频率，尊重萌娘百科与 Weblio 的服务器。

## 已知限制

- 人员名单为 OP 表记中出现过的全体表记人员（含原作、音乐、演唱等职务），已尽量过滤公司 / 团体名；
- 剧场版 / OVA / 网络动画作品来自萌百**人员词条**的作品章节，仅覆盖词条存在且成功抓取的人员（约 600 人），其余人员显示「暂无记录」；可通过 `tools/crawl-staff.mjs` 扩大抓取范围；
- OVA 作品库列表（Weblio）本身不含年份，故 OVA 按时间排序时年份未知的作品会排在末尾；
- 制作人员的剧场版 / OVA 作品与 OP表记 无交集时不会重复计入 TV动画。
