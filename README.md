# Page Performance Analysis

[中文](#中文) | [English](#english)

---

## 中文

一个面向前端开发者的本地优先性能分析工作台。它不只是帮你“跑一次 Lighthouse”，而是把性能分析整理成更适合日常迭代的流程：采样、对比、历史追踪，以及下一步该优化什么。

### 为什么做这个项目

PageSpeed 和 Lighthouse 本身已经很强，但日常优化里常见的痛点并不在“拿到一次分数”，而在这些事情：

- 同一个页面多跑几次，结果会有波动
- 很难把一次分析结果和上一次改动后的结果放在一起看
- 原始 audits 信息多，但真正下一步该做什么并不总是清晰

这个项目的目标，就是把这些体验补齐成一个更适合开发者日常使用的小工作台。

一句话定位：

> 一个本地优先的 PageSpeed / Lighthouse 工作台，用来支持持续的性能迭代。

### 功能

- 单页分析：支持 `mobile` 和 `desktop`
- 双模式来源：公网 URL 用 Google PSI，内网 URL 可切换到本地 Lighthouse
- 三次并行采样：同一 URL 并行发起 3 次分析，请求成功的样本自动求平均
- 指标摘要：Score、LCP、CLS、FCP、TBT、Speed Index、Interactive
- 行动建议：基于 Lighthouse audits 输出优先级更清晰的 action plan
- 历史追踪：每次运行存入本地 SQLite，支持趋势查看与最近一次对比
- 分析取消：分析过程中可以取消，不会保存未完成快照

### 页面与工作流

- `New Analyze`：输入 URL，选择策略与来源模式
- `Analyze Result`：查看关键指标、建议动作和性能机会项
- `History`：追踪同一个 URL 多次运行后的变化趋势
- `Compare`：并排比较两个页面在同一策略下的结果

### 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma + SQLite
- Google PageSpeed Insights API v5
- Lighthouse + chrome-launcher

### 快速开始

1. 安装依赖

```bash
npm install
```

2. 复制环境变量模板并按需修改

```bash
cp .env.example .env
```

3. 运行初始化脚本

```bash
npm run setup
```

4. 启动开发服务器

```bash
npm run dev
```

5. 打开本地页面

```text
http://localhost:3000
```

### 环境变量

`.env.example` 中包含当前需要的变量：

```bash
DATABASE_URL="file:./dev.db"
GOOGLE_API_KEY=""
```

- `DATABASE_URL`：SQLite 数据库文件路径，默认使用项目根目录下的本地数据库文件
- `GOOGLE_API_KEY`：可选，但强烈建议配置。未配置时依然可运行，只是更容易遇到限流或配额不稳定

### 常用脚本

```bash
npm run setup
npm run db:push
npm run db:studio
npm run typecheck
npm run check
```

- `npm run setup`：生成 Prisma Client 并初始化本地数据库
- `npm run db:push`：同步 Prisma schema 到当前数据库
- `npm run db:studio`：打开 Prisma Studio 查看历史数据
- `npm run typecheck`：运行 TypeScript 类型检查
- `npm run check`：依次运行 lint、类型检查和生产构建

### 使用方式

1. 输入一个 `http` 或 `https` 的页面地址
2. 选择 `mobile` 或 `desktop`
3. 公网页面使用 `external`，内网或本地环境使用 `internal`
4. 发起分析并查看平均后的关键指标
5. 回到同一 URL 再次分析，就能在 `History` 里观察趋势

### 项目边界

这个项目当前更适合：

- 前端开发者在本地验证页面优化效果
- 小团队跟踪几个关键页面的性能变化
- 快速把 Lighthouse 输出转成更可操作的建议

它目前还不包含：

- 多用户账号系统
- 云端共享数据库
- 定时巡检或告警
- CI 自动评论或 GitHub 集成

### 开发说明

- `external` 模式要求目标 URL 可被 Google PSI 公开访问
- `internal` 模式依赖本地 Chrome/Lighthouse，适合局域网、测试环境或开发环境页面
- 历史数据默认存储在本地 SQLite，不会自动同步到远端

### CI

仓库包含一个基础 GitHub Actions 工作流，会在 push 和 pull request 时自动执行：

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

### 贡献

欢迎 issue、讨论和 PR。开始贡献前可以先看：

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [SECURITY.md](./SECURITY.md)

### 许可证

本项目使用 [MIT License](./LICENSE)。

[返回顶部](#page-performance-analysis)

---

## English

Page Performance Analysis is a local-first workspace for frontend developers. Instead of only giving you a single Lighthouse run, it helps you turn performance work into an iterative workflow with sampling, comparison, history tracking, and actionable next steps.

### Why this project

PageSpeed and Lighthouse are already powerful, but day-to-day performance work usually breaks down in a few familiar places:

- Running the same page multiple times often produces noisy results
- It is hard to compare the latest result with the previous optimization pass
- Raw audits are useful, but they do not always make the next action obvious

This project is meant to fill in those gaps and make Lighthouse data easier to use as part of normal development work.

One-line positioning:

> A local-first PageSpeed / Lighthouse workspace for iterative performance work.

### Features

- Single-page analysis with `mobile` and `desktop` strategies
- Dual analysis sources: public URLs use Google PSI, internal URLs can use local Lighthouse
- Triple parallel sampling: each URL is analyzed 3 times in parallel, and successful samples are averaged
- Metric summary for Score, LCP, CLS, FCP, TBT, Speed Index, and Interactive
- Action-oriented recommendations derived from Lighthouse audits
- Local history tracking with SQLite for trend review and previous-run comparison
- Request cancellation without saving incomplete snapshots

### Screens and workflow

- `New Analyze`: enter a URL and choose strategy and source mode
- `Analyze Result`: inspect metrics, recommendations, and opportunities
- `History`: track repeated runs for the same URL over time
- `Compare`: compare two pages side by side under the same strategy

### Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma + SQLite
- Google PageSpeed Insights API v5
- Lighthouse + chrome-launcher

### Quick start

1. Install dependencies

```bash
npm install
```

2. Copy the environment template and adjust it if needed

```bash
cp .env.example .env
```

3. Run the setup script

```bash
npm run setup
```

4. Start the development server

```bash
npm run dev
```

5. Open the app

```text
http://localhost:3000
```

### Environment variables

The current required variables are listed in `.env.example`:

```bash
DATABASE_URL="file:./dev.db"
GOOGLE_API_KEY=""
```

- `DATABASE_URL`: SQLite database path, using a local file in the project root by default
- `GOOGLE_API_KEY`: optional, but strongly recommended for more stable quota behavior

### Useful scripts

```bash
npm run setup
npm run db:push
npm run db:studio
npm run typecheck
npm run check
```

- `npm run setup`: generate the Prisma client and initialize the local database
- `npm run db:push`: sync the Prisma schema to the current database
- `npm run db:studio`: open Prisma Studio to inspect stored history data
- `npm run typecheck`: run TypeScript type checking
- `npm run check`: run linting, type checking, and a production build

### How to use

1. Enter an `http` or `https` page URL
2. Choose `mobile` or `desktop`
3. Use `external` for public pages and `internal` for local or private environments
4. Run the analysis and inspect the averaged key metrics
5. Analyze the same URL again later to see changes in `History`

### Project scope

This project is currently best suited for:

- Frontend developers validating optimization work locally
- Small teams tracking performance changes across a few important pages
- Turning Lighthouse output into more actionable next steps

It does not currently include:

- Multi-user accounts
- Shared cloud storage
- Scheduled monitoring or alerting
- CI comment bots or direct GitHub integrations

### Development notes

- `external` mode requires a URL that Google PSI can access publicly
- `internal` mode depends on local Chrome/Lighthouse and is useful for LAN, staging, or local development targets
- History data is stored in local SQLite by default and is not automatically synced anywhere

### CI

The repository includes a basic GitHub Actions workflow that runs on push and pull requests:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

### Contributing

Issues, discussions, and pull requests are all welcome. Before contributing, you may want to check:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [SECURITY.md](./SECURITY.md)

### License

This project is released under the [MIT License](./LICENSE).

[Back to top](#page-performance-analysis)
