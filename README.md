# PageSpeed Workspace

一个面向前端开发者的性能分析工作台：输入公开可访问的 URL，调用 Google PageSpeed Insights（Lighthouse），输出可执行的优化行动清单，并把每次分析记录保存到本地 SQLite，方便反复对比与追踪趋势。

## 功能

- URL 分析：支持 mobile / desktop 两种策略
- 指标摘要：Score、LCP、CLS、FCP、TBT、Speed Index、Interactive（带简单评级）
- Action plan：基于 Lighthouse audits 生成优先级建议
- Opportunities：展示 Top opportunity audits（节省/得分等）
- 历史记录：每次 run 存入 SQLite，右侧 History 展示列表 + 趋势条形图，并提供与上一次 run 的指标对比
- 取消请求：分析中可 Cancel，中止本次请求（不保存快照）

## 技术栈

- Next.js (App Router) / React / TypeScript
- Tailwind CSS
- Prisma + SQLite（本地持久化）
- Google PageSpeed Insights API v5

## 本地运行

1) 安装依赖

```bash
npm install
```

2) 配置环境变量（在项目根目录创建 `.env`）

```bash
DATABASE_URL="file:./dev.db"
GOOGLE_API_KEY=""
```

- `DATABASE_URL`：SQLite 数据库文件路径（例如 `file:./dev.db`）
- `GOOGLE_API_KEY`：可选。不配置也能跑，但可能更容易触发限流或配额不足

3) 初始化数据库（创建表并生成 Prisma Client）

```bash
npx prisma db push
```

4) 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000

## 使用方式

1) 输入 URL（必须是公网可访问的 http/https，不能是 localhost / 内网域名）
2) 选择 mobile / desktop
3) 点击 Analyze 查看结果；重复分析同一 URL 可在 History 里看到变化趋势
