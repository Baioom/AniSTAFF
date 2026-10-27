# 动画制作人员查询表（AniStaff）

静态版「日本动画制作人员查询表」：以萌娘百科《日本TV动画OP表记》为内容来源，收录 TV 动画 OP 表记中的**动画制作人员**及其作品；作品库读取自 Weblio《日本のテレビアニメ作品一覧》等列表，作品中文名使用萌娘百科与哔哩哔哩番剧库。纯静态站点，无后端，可直接部署到 GitHub + EdgeOne Pages。

## 功能

| 板块 | 说明 |
| --- | --- |
| **人员查询** | 仅收录动画制作相关职务（监督/演出/脚本/作画/美术/摄影/音响/制作人 等）；**排除**作词、作曲、编曲、演唱、歌、声优、旁白等职务。按姓名/拼音搜索，按首字母或作品数排序 |
| **作品库** | 图一风格：类型标签（TV动画 / 剧场版 / OVA / 网络动画）+ 年份筛选 + 卡片网格；作品名显示中文译名（附日文原名）；按**年份**或**中文拼音首字母**排序，可切换升降序 |
| **原作** | 原作 / 原案 / 漫画类表记单独成表（如青山刚昌、手冢治虫），点击展开作品列表 |
| **制作公司** | OP 表记中的动画制作公司单独成表（如东映动画、MBS、TCJ），附参与作品 |
| **去世人员** | 图二风格时间线：日期 + 姓名 + 「去世」标签 + 职务/享年/代表作说明 |

## 数据来源

| 数据 | 来源 |
| --- | --- |
| 制作人员、TV 动画作品与职务、原作、制作公司 | [萌娘百科 · 日本TV动画OP表记](https://mzh.moegirl.org.cn/User:%E9%BB%91%E9%BB%91%E7%9A%84%E7%99%BD%E6%8F%8F/%E6%97%A5%E6%9C%ACTV%E5%8A%A8%E7%94%BBOP%E8%A1%A8%E8%AE%B0)（1963–2026 各年份子页面） |
| TV/剧场版/OVA 作品库（名称与年份） | [Weblio · 日本のテレビアニメ作品一覧](https://www.weblio.jp/content/%E6%97%A5%E6%9C%AC%E3%81%AE%E3%83%86%E3%83%AC%E3%83%93%E3%82%A2%E3%83%8B%E3%83%A1%E4%BD%9C%E5%93%81%E4%B8%80%E8%A6%A7) / [电影](https://www.weblio.jp/content/%E6%97%A5%E6%9C%AC%E3%81%AE%E3%82%A2%E3%83%8B%E3%83%A1%E6%98%A0%E7%94%BB%E4%BD%9C%E5%93%81%E4%B8%80%E8%A6%A7) / [OVA](https://www.weblio.jp/content/%E6%97%A5%E6%9C%AC%E3%81%AEOVA%E4%BD%9C%E5%93%81%E4%B8%80%E8%A6%A7)（维基百科镜像） |
| 作品中文译名 | 萌娘百科作品条目 + 哔哩哔哩番剧库（`api.bilibili.com`） |
| 人员词条（剧场版/OVA 作品、生卒信息） | 萌娘百科人物词条（约 600+ 人已抓取） |

## 目录结构

```
site/
├─ index.html          页面骨架（五个板块）
├─ app.js              交互逻辑（纯原生 JS）
├─ style.css           样式
└─ data/
   ├─ meta.json        元信息（数据量、生成时间、来源）
   ├─ staff-index.json 人员索引
   ├─ staff-A.json …   人员详情分片（按首字母；staff-#.json 为其他字符）
   ├─ works-db.json    作品库（tv/movie/ova/web）
   ├─ authors.json     原作表
   ├─ companies.json   制作公司表
   └─ deceased.json    去世人员
```

## 部署（GitHub + EdgeOne Pages）

1. 把 `site/` 目录内的全部文件提交到你现有的 GitHub 仓库（可直接替换仓库根目录）；
2. 在腾讯云 EdgeOne Pages 控制台绑定该仓库，构建目录设为仓库根目录（纯静态无需构建命令）；
3. 发布后通过你绑定在 EdgeOne 上的自有域名访问。

> EdgeOne 的**预览链接**（`xxx.edgeone.cool`）会过期并返回 401，正式访问请用自有域名。

## 数据更新

`tools/` 目录包含抓取与构建脚本（Node.js ≥ 20）：

```bash
node tools/fetch-moegirl.mjs   # 萌百 OP表记 49 个年份页面 → src/moegirl/
node tools/fetch-weblio.mjs    # Weblio TV 列表 → src/weblio/
node tools/fetch-movie.mjs     # Weblio 电影列表 → src/weblio/
node tools/crawl-staff.mjs     # 人员词条（带链接的）
node tools/crawl-search.mjs    # 人员词条（搜索补充）
node tools/crawl-category.mjs  # 萌百「已故人物」分类
node tools/crawl-bili.mjs      # 哔哩哔哩番剧库中文标题
node tools/parse-op.mjs        # 解析 OP表记 → op-works / op-staff / op-authors / op-companies
node tools/parse-weblio.mjs    # 解析 Weblio 作品库
node tools/parse-staff.mjs     # 解析人员词条作品章节
node tools/parse-deceased.mjs  # 解析已故人员生卒信息
node tools/build-data.mjs      # 生成 site/data/*.json
```

抓取时请放慢并发、控制频率，尊重各站点服务器。

## 已知限制

- 基于 OP 表记，仅含 **TV 动画** 的作品内容；剧场版/OVA/网络动画作品取自人员词条，覆盖有词条的人员；
- 作词、作曲、演唱、声优、旁白等职务已按需求排除，不在人员表中；原作类单独成表；
- 作品中文名的覆盖约为 TV 25% / 剧场版 16%（萌百条目 + B 站番剧库匹配），未匹配的作品显示日文原名；
- 去世人员数据依赖萌百词条的讣告标记与生卒信息框，覆盖约 30+ 人（随人员词条抓取持续增加）；
- 作品库年份来自 Weblio，OVA 列表本身无年份，部分 OVA 显示「年份未定」。
