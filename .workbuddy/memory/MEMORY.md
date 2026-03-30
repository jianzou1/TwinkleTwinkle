# TwinkleTwinkle 项目记忆

> 最近更新: 2026-03-30

## 项目概述

**TwinkleTwinkle** 是 Shelton Chu 的个人网站项目，整体风格为 **Windows 98 复古风** (使用 98.css 框架)，带 CRT 扫描线效果。  
GitHub 仓库: `jianzou1/drunkfrog`  
部署: Netlify / Neocities

## 技术栈

- **构建工具**: Webpack 5 — **多入口** (welcome + main)，webpack-dev-server, HtmlWebpackPlugin
- **3D 引擎**: Three.js (npm) — 仅用于欢迎页，独立 welcome 入口，不污染主站 bundle
- **模板引擎**: EJS — 页面模板在 `ejs/pages/`，公共模板在 `ejs/templates/`
- **页面路由**: PJAX (pjax@0.2.8) — 通过 CDN 多源加载（CDN Loader 有多源 fallback 机制）
- **样式**: 98.css (CDN)，自定义 CSS 在 `css/` 目录（style.css 汇总导入）
- **多语言**: 自研 LangManager v3.1 — 数据来自 `cfg/lang_cfg.json`，支持 cn/en/jp
- **数据管理**: Excel → JSON 管道 (`cfg/excelToJson.js`, xlsx 库)，Excel 源文件在 `cfg/excel/`
- **文章系统**: Markdown → HTML (`post/_src/post.js`, 使用 marked + html-minifier-terser)
- **无后端**: 纯前端静态站点，密码验证使用 SHA-256 哈希前缀匹配静态目录

## 目录结构

```
/
├── ejs/pages/         # 7个EJS页面模板 (index=欢迎页, home, article, game, gallery, about, password)
├── ejs/templates/     # 公共模板 (header.ejs, function.ejs)
├── js/                # 17个JS模块 + welcome/ 子目录
│   ├── index.js       # Webpack 主站入口 (导入 style.css + main.js，配有 HMR)
│   ├── main.js        # 应用主控 (初始化、PJAX、路由分发)
│   ├── welcome/       # Three.js 欢迎页模块
│   │   ├── index.js         # Webpack 欢迎页入口
│   │   ├── WelcomeApp.js    # 主控 (renderer/scene/camera/交互/动画循环)
│   │   ├── SpaceBackground.js # 星空粒子+流星系统
│   │   ├── IslandBuilder.js   # 体素浮空岛 (InstancedMesh)
│   │   └── CabinBuilder.js    # 小屋+门交互+开门动画
│   ├── cdnLoader.js   # CDN 多源加载器 (PJAX + 98.css)
│   ├── langManager.js # 多语言管理器 v3.1
│   ├── tabHandler.js  # 标签页处理
│   ├── crtEffect.js   # CRT 扫描线效果 (Canvas, 单例模式)
│   ├── password.js    # 密码验证 (SHA-256 → 目录匹配)
│   ├── gameList.js    # 游戏列表 (排序: 评级/类型/时长)
│   ├── gameRoll.js    # 游戏随机抽取 (滚动动画)
│   ├── gallery.js     # 画廊 (分页、懒加载、弹窗查看)
│   ├── previewLoader.js # 文章预览链接加载
│   ├── footerLoader.js  # 动态页脚 (含GitHub API获取更新时间)
│   ├── scrollToTop.js   # 回到顶部
│   ├── tips.js          # 悬停提示
│   ├── progressBar.js   # 进度条
│   ├── dailyPopup.js    # 每日弹窗 (已注释)
│   └── logoRandomizer.js # 随机Logo (已注释)
├── css/               # 10个CSS文件 (style.css 为主站汇总入口, welcome.css 为欢迎页独立样式)
├── cfg/               # 配置数据
│   ├── excel/         # Excel 源数据
│   ├── excelToJson.js # Excel→JSON 转换脚本
│   ├── game_time_cfg.json    # 游戏时长数据
│   ├── gallery_cfg.json      # 画廊图片数据
│   ├── article_cfg.json      # 文章配置
│   ├── lang_cfg.json         # 多语言翻译数据 (cn/en/jp)
│   └── system_cfg.json       # 系统配置 (类型名、评级名、图片后缀)
├── post/              # 文章系统
│   ├── _src/          # Markdown 源文件 + post.js 构建脚本 + template.html
│   ├── 8b591cc3/      # 已生成的文章 (SHA-256哈希前缀命名)
│   └── test/          # 测试文章
├── page/              # Webpack 构建输出的HTML页面 (5个)
├── icon/              # PNG 图标 (38个)
├── ui/                # UI素材 (ASCII art、边框图、logo、loading/daily弹窗HTML)
├── index.html         # 构建输出的欢迎页 (加载 welcome.js)
├── welcome.js         # 构建输出的欢迎页打包JS (Three.js + 场景代码)
├── main.js            # 构建输出的主站打包JS
├── styles.css         # 构建输出的主站CSS
├── welcome.css        # 构建输出的欢迎页CSS (生产构建时)
├── 404.html           # 404页面 (Windows BSOD 风格)
└── site.webmanifest   # PWA manifest
```

## npm scripts

- `npm start` — 启动 webpack-dev-server
- `npm run pack` — Webpack 生产构建
- `npm run post` — Markdown 转 HTML (post/_src/post.js)
- `npm run cfg` — Excel 转 JSON (cfg/excelToJson.js)
- `npm run build` — post + cfg + webpack 生产构建 (完整构建)

## 核心业务逻辑

### 页面路由 (main.js)
- `/` → Three.js 3D 欢迎页 (独立入口, 不走 PJAX)
- `/page/home.html` → 密码输入 (initializePassword) — 原首页
- `/page/article.html` → 文章列表 (loadPreviewLinks)
- `/page/game.html` → 游戏列表 + 随机抽取 (gameList + initGameRoll)
- `/page/gallery.html` → 画廊 (initializeGallery)
- `/page/about.html` → 关于页
- `/page/password.html` → 备用密码入口
- PJAX 导航：所有页面切换通过 PJAX 实现无刷新跳转

### 密码系统
- 输入密码 → SHA-256 哈希 → 取前 8 位 → 匹配 `/post/{hash}/` 目录
- 无后端验证，通过 HEAD 请求检查目录是否存在

### 游戏系统
- 游戏数据从 `game_time_cfg.json` 加载 (包含: name, time, type, quality, story, seriesTag, isLoved, spacialAchievements)
- 三种排序: 评级、类型、时长
- 游戏随机抽取: 品质加权随机 + 滚动动画
- 统计: 总时长、等效天数/年

### 画廊系统
- 数据从 `gallery_cfg.json` + `system_cfg.json` 加载
- 图片 URL 后缀统一添加 `additional` 参数 (如 `@50q_1e_1c.webp`)
- 分页浏览、懒加载、模态查看大图

### 多语言
- 支持 cn/en/jp
- DOM 自动绑定 (`data-lang-id`, `data-lang-placeholder`)
- MutationObserver 监听 DOM 变化自动翻译
- 用户语言偏好存储在 localStorage

### CRT 效果
- Canvas 扫描线效果 (RGB 三色线, 正弦波动)
- 单例模式, 可通过复选框 (`#crtToggle`) 开关
- 状态持久化到 localStorage

## 数据管线

1. Excel (`.xlsx` in `cfg/excel/`) → `npm run cfg` → JSON (in `cfg/`)
2. Markdown (in `post/_src/`) → `npm run post` → HTML (in `post/{name}/index.html`)
3. EJS (in `ejs/`) → Webpack → HTML (in `page/` + `index.html`)

## 设计特征

- Windows 98 UI 框架 (98.css)
- 紫色主题 (背景色 `#6b2c5f`)
- CRT 扫描线 overlay
- BSOD 风格 404 (青色背景 `#008689`)
- Pixel 字体 ("Pixelated MS Sans Serif")
- 标签页导航 (Win98 风格)
- 弹窗为 Win98 窗口风格

## 用户偏好 (Shelton)

- 不喜欢 CRT 降频闪烁效果
- CRT 优化不能改变既有画面表现
- 偏好 old web / 个人终端 / 可探索空间方向
- 不要现代模板化博客风格
