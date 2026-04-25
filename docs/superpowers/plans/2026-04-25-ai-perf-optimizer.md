# AI-Assisted Performance Optimizer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js + Prisma + SQLite full-stack web application that uses Google PageSpeed API and LLMs to generate actionable performance Todo Lists and track iteration history.

**Architecture:** Next.js App Router serves as both the frontend React application and the backend API server. Prisma + SQLite handle local database persistence. The backend securely queries Google PageSpeed and an LLM, streaming the generated Todo List back to the frontend.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, Prisma, SQLite, OpenAI SDK, `react-markdown`.

---

### Task 1: Project Scaffold & Database Setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `.env.example`

- [ ] **Step 1: Initialize Next.js project**
Run: `npx create-next-app@latest . --typescript --tailwind --eslint --app --use-npm --src-dir` (Overwrite existing files if prompted, except `.git` and `docs/`)

- [ ] **Step 2: Install core dependencies**
Run: `npm install @prisma/client openai react-markdown`
Run: `npm install -D prisma`

- [ ] **Step 3: Initialize Prisma & Configure Schema**
Run: `npx prisma init --datasource-provider sqlite`
Modify `prisma/schema.prisma` to include the `Run` model:
```prisma
model Run {
  id        String   @id @default(cuid())
  url       String
  createdAt DateTime @default(now())
  lcp       Float?
  cls       Float?
  fcp       Float?
  tbt       Float?
  score     Int?
  todoList  String
}
```

- [ ] **Step 4: Push database schema**
Run: `npx prisma db push`
Expected: "Your database is now in sync with your schema."

- [ ] **Step 5: Commit**
```bash
git add .
git commit -m "chore: initialize Next.js app and Prisma SQLite schema"
```

### Task 2: Backend API Route - Data Fetching & LLM Integration

**Files:**
- Create: `src/app/api/analyze/route.ts`

- [x] **Step 1: Create the Analyze API Route Skeleton**
Create `src/app/api/analyze/route.ts` and set up the POST handler to receive `{ url }`.

- [x] **Step 2: Implement Google PageSpeed API fetch**
Add logic to call `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={url}&strategy=mobile`.
Extract `lighthouseResult.categories.performance.score`, `lighthouseResult.audits['largest-contentful-paint'].displayValue`, etc.

- [x] **Step 3: Implement OpenAI streaming call**
Integrate `openai` SDK. Create a system prompt asking for a Prioritized Todo List based on the parsed PageSpeed metrics. Stream the response.

- [x] **Step 4: Database Persistence**
At the end of the stream, save the `url`, metrics, and the full `todoList` text into the Prisma database using `prisma.run.create`. Also, query the previous run for this URL to return the diff to the frontend via custom headers or a separate wrapper.
*Note: Since it's a stream, sending the diff requires sending JSON first, then streaming text. Use a custom format or Server-Sent Events with distinct event types.*

- [x] **Step 5: Commit**
```bash
git add src/app/api/analyze/route.ts
git commit -m "feat: backend API for PageSpeed analysis and LLM streaming"
```

### Task 3: Backend API Route - History Fetching

**Files:**
- Create: `src/app/api/history/route.ts`

- [ ] **Step 1: Create History API Route**
Create `src/app/api/history/route.ts` with a GET handler that takes a `url` query param.
Use `prisma.run.findMany` to return all runs for that URL ordered by `createdAt` desc.

- [ ] **Step 2: Commit**
```bash
git add src/app/api/history/route.ts
git commit -m "feat: backend API for fetching iteration history"
```

### Task 4: Frontend UI - Core Layout & Search

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Create: `src/components/SearchForm.tsx`

- [ ] **Step 1: Create Main Layout**
Update `src/app/page.tsx` to include a clean, centered Hero section with a title and description.

- [ ] **Step 2: Implement SearchForm Component**
Create `src/components/SearchForm.tsx` with an input for the URL and an "Analyze" button. Manage loading states (Step 1: "Fetching PageSpeed...", Step 2: "AI Analyzing...").

- [ ] **Step 3: Commit**
```bash
git add src/app/page.tsx src/app/globals.css src/components/SearchForm.tsx
git commit -m "feat: frontend main layout and SearchForm component"
```

### Task 5: Frontend UI - Streaming Results & Todo List

**Files:**
- Create: `src/components/TodoList.tsx`

- [ ] **Step 1: Implement TodoList Markdown Renderer**
Create `src/components/TodoList.tsx` that takes a `markdownText` prop. Use `react-markdown` to render the checkboxes and code blocks cleanly using Tailwind typography (`prose`).

- [ ] **Step 2: Wire up the Streaming API**
In `src/app/page.tsx` (or a dedicated client component), implement the fetch call to `/api/analyze`. Handle the `ReadableStream` to update the `markdownText` state character by character.

- [ ] **Step 3: Commit**
```bash
git add src/components/TodoList.tsx src/app/page.tsx
git commit -m "feat: frontend streaming integration and TodoList Markdown renderer"
```

### Task 6: Frontend UI - History Dashboard & Diffs

**Files:**
- Create: `src/components/HistoryPanel.tsx`

- [ ] **Step 1: Implement HistoryPanel Component**
Create `src/components/HistoryPanel.tsx`. On load (or when a URL is submitted), fetch `/api/history?url=...` and display previous scores (LCP, CLS, etc.) in a timeline or table format.

- [ ] **Step 2: Calculate and Display Diffs**
Show green/red arrows next to current scores by comparing them with the most recent previous run.

- [ ] **Step 3: Commit**
```bash
git add src/components/HistoryPanel.tsx src/app/page.tsx
git commit -m "feat: frontend history dashboard and score diffing"
```
