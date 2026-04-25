# AI-Assisted Performance Optimizer - Design Spec

## 1. Context & Goals
A web performance optimization assistant tool that uses the Google PageSpeed Insights API and LLMs to help frontend developers quickly identify and fix performance bottlenecks. The core philosophy is to abstract away complex JSON metrics and present the user with a highly actionable, prioritized "Todo List". It also tracks optimization iterations over time using a local database to show progress.

## 2. Target Audience
- **Primary**: Frontend Developers / Engineers.
- **Needs**: Actionable code-level suggestions rather than just high-level metric overviews. The ability to track whether their code changes actually improved the metrics across iterations.

## 3. Product Form & User Experience (UX)
- **Product Form**: A full-stack web application running locally or deployable.
- **UI/UX Pattern (AI-Driven Action Plan)**: 
  - Instead of a traditional dashboard filled with charts and raw numbers, the primary interface is a **Prioritized Todo List**.
  - **History Dashboard**: A side panel or dedicated view showing the iteration history of a specific URL, allowing developers to see the "Diff" (e.g., LCP improved by 0.5s) between the current run and the previous run.
- **Workflow**:
  1. User enters a URL to analyze.
  2. Loading State 1: Fetching Google PageSpeed Insights.
  3. Loading State 2: LLM analyzing the data.
  4. Result View: Displays the current scores, a diff comparing to the last run, and the AI-generated Todo List rendered as Markdown with checkboxes.

## 4. Architecture & Tech Stack
- **Framework**: Next.js (App Router) for both frontend React components and backend API routes.
- **Styling**: Tailwind CSS.
- **Database**: SQLite. Zero configuration required, creates a local `.db` file, making it perfect for a local developer tool.
- **ORM**: Prisma, for easy database schema management and type-safe queries.
- **External APIs**:
  - Google PageSpeed Insights API.
  - LLM API (OpenAI / DeepSeek / etc., configured via environment variables).

## 5. Data Flow & Backend Responsibilities
1. **Frontend Request**: User submits a URL. Frontend calls the Next.js backend API route `/api/analyze`.
2. **Fetch Metrics**: Backend calls Google PageSpeed Insights API.
3. **Data Cleaning**: Backend strips unnecessary data from the heavy JSON payload to fit within the LLM context window (retaining only key metrics like LCP, CLS, FCP, TBT, and relevant `audits`).
4. **LLM Prompting**: Backend sends the cleaned JSON and a structured system prompt to the LLM. The prompt enforces a "Prioritized Todo List" output format.
5. **Database Persistence**: Backend saves the iteration record (URL, timestamp, core scores, and the generated Todo List text) into the SQLite database.
6. **Streaming Response**: Backend streams the LLM response (Server-Sent Events) back to the frontend for a typewriter-like UX.
7. **Diff Calculation**: Backend queries the last recorded run for the same URL and calculates the score diffs to send to the frontend.

## 6. Database Schema (Prisma)
```prisma
model Run {
  id        String   @id @default(cuid())
  url       String
  createdAt DateTime @default(now())
  
  // Core Web Vitals & Metrics
  lcp       Float?   // Largest Contentful Paint (ms)
  cls       Float?   // Cumulative Layout Shift
  fcp       Float?   // First Contentful Paint (ms)
  tbt       Float?   // Total Blocking Time (ms)
  score     Int?     // Overall Performance Score (0-100)
  
  // AI Output
  todoList  String   // Markdown formatted AI suggestions
}
```

## 7. Error Handling & Edge Cases
- **Missing API Keys**: If the LLM API key is missing in the `.env` file, the backend returns a clear error message prompting the user to configure it.
- **Google API Rate Limits (429)**: Graceful error handling instructing the user to provide a Google API key if the free tier limit is exceeded.
- **LLM Hallucinations**: The system prompt will heavily constrain the output format. The frontend will use robust Markdown parsing (`react-markdown`) to ensure UI stability even if the LLM output is slightly malformed.
- **Invalid URLs**: Frontend and backend validation to ensure valid `http/https` protocols before making external requests.
