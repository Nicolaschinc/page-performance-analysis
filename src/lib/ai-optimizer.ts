import type { ActionItem, AuditItem, MetricKey, MetricSnapshot, PageSpeedSummary } from '@/lib/pagespeed';

export type BriefFormat = 'codex' | 'cursor' | 'claude-code' | 'chatgpt' | 'github-issue' | 'markdown';

type PreviousRun = {
  id?: string;
  createdAt?: string;
  metrics: MetricSnapshot;
} | null;

export type AiOptimizationBriefInput = {
  summary: PageSpeedSummary;
  previous?: PreviousRun;
  goal?: string;
  format?: BriefFormat;
};

export type AiOptimizationBriefResult = {
  provider: 'openai' | 'deepseek' | 'fallback';
  model: string | null;
  content: string;
  contextPackage: string;
  fallbackReason?: 'missing-api-key' | 'api-error' | 'empty-response';
  error?: string;
};

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-pro';
const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

const metricLabels: Record<MetricKey, string> = {
  score: 'Performance Score',
  lcp: 'LCP',
  cls: 'CLS',
  fcp: 'FCP',
  tbt: 'TBT',
  speedIndex: 'Speed Index',
  interactive: 'Interactive',
};

function metricValue(key: MetricKey, value: number | null): string {
  if (value === null) return 'unknown';
  if (key === 'score') return `${Math.round(value)}/100`;
  if (key === 'cls') return value.toFixed(3);
  if (key === 'tbt') return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

function metricDelta(key: MetricKey, current: number | null, previous: number | null): string {
  if (current === null || previous === null) return 'unknown';
  const diff = current - previous;
  if (Math.abs(diff) < 0.001) return 'no change';
  const higherIsBetter = key === 'score';
  const improved = higherIsBetter ? diff > 0 : diff < 0;
  const direction = improved ? 'improved' : 'regressed';
  const amount = key === 'score' ? Math.abs(Math.round(diff)).toString() : metricValue(key, Math.abs(diff));
  return `${direction} by ${amount}`;
}

function formatAudit(audit: AuditItem): string {
  const parts = [
    `id=${audit.id}`,
    audit.displayValue ? `display=${audit.displayValue}` : null,
    audit.savingsMs !== null ? `savingsMs=${Math.round(audit.savingsMs)}` : null,
    audit.savingsBytes !== null ? `savingsBytes=${Math.round(audit.savingsBytes)}` : null,
    audit.score !== null ? `score=${audit.score}` : null,
  ].filter(Boolean);

  return `- ${audit.title} (${parts.join(', ')})${audit.description ? `: ${audit.description}` : ''}`;
}

function formatAction(action: ActionItem): string {
  return `- [${action.impact}] ${action.title} -> ${action.metric}: ${action.reason}`;
}

function formatBytes(value: number | null): string {
  if (value === null) return 'unknown';
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)}MB`;
  if (value >= 1024) return `${Math.round(value / 1024)}KB`;
  return `${Math.round(value)}B`;
}

function formatMetrics(metrics: MetricSnapshot): string {
  return (Object.keys(metricLabels) as MetricKey[])
    .map((key) => `- ${metricLabels[key]}: ${metricValue(key, metrics[key])}`)
    .join('\n');
}

function formatHistory(summary: PageSpeedSummary, previous: PreviousRun): string {
  if (!previous) return 'No previous run was provided.';

  return (Object.keys(metricLabels) as MetricKey[])
    .map((key) => {
      const current = summary.metrics[key];
      const before = previous.metrics[key];
      return `- ${metricLabels[key]}: previous ${metricValue(key, before)}, current ${metricValue(
        key,
        current,
      )}, ${metricDelta(key, current, before)}`;
    })
    .join('\n');
}

function formatLabel(format: BriefFormat): string {
  if (format === 'claude-code') return 'Claude Code';
  if (format === 'github-issue') return 'GitHub issue';
  return format.charAt(0).toUpperCase() + format.slice(1);
}

function pickFocusMetric(summary: PageSpeedSummary): string {
  const firstHighImpactAction = summary.actions.find((action) => action.impact === 'high');
  if (firstHighImpactAction) return firstHighImpactAction.metric;
  if (summary.metrics.lcp !== null && summary.metrics.lcp > 2500) return 'LCP';
  if (summary.metrics.tbt !== null && summary.metrics.tbt > 200) return 'TBT';
  if (summary.metrics.cls !== null && summary.metrics.cls > 0.1) return 'CLS';
  return 'Performance';
}

function formatResourceSignals(audits: AuditItem[]): string {
  const resourceAudits = audits.filter((audit) => audit.savingsMs !== null || audit.savingsBytes !== null).slice(0, 8);
  if (resourceAudits.length === 0) return '- No resource savings signals were available.';

  return resourceAudits
    .map((audit) => {
      const time = audit.savingsMs === null ? 'unknown time' : `${Math.round(audit.savingsMs)}ms`;
      const bytes = formatBytes(audit.savingsBytes);
      return `- ${audit.id}: ${audit.title}; estimated savings ${time}, ${bytes}`;
    })
    .join('\n');
}

function formatOutputInstructions(format: BriefFormat): string {
  if (format === 'cursor') {
    return 'Format for Cursor: include a short repository investigation prompt, mention likely files to search for without inventing paths, and ask Cursor to propose a small diff before editing.';
  }

  if (format === 'claude-code') {
    return 'Format for Claude Code: include a clear task brief, bounded edit constraints, and verification commands. Ask it to inspect the codebase before changing files.';
  }

  if (format === 'chatgpt') {
    return 'Format for ChatGPT: include the context package and ask for an implementation plan plus code-review checklist, not direct repository edits.';
  }

  if (format === 'github-issue') {
    return 'Format as a GitHub issue: include title, problem statement, evidence, proposed scope, acceptance criteria, and verification steps.';
  }

  if (format === 'markdown') {
    return 'Format as a portable Markdown report with sections that can be pasted into any AI coding assistant.';
  }

  return 'Format for Codex: write a direct coding-agent instruction with evidence, scope, constraints, and verification steps.';
}

export function buildAiContextPackage(input: AiOptimizationBriefInput): string {
  const { summary, previous, goal, format = 'codex' } = input;
  const topAudits = [...summary.opportunities, ...summary.diagnostics].slice(0, 10);
  const focusMetric = pickFocusMetric(summary);

  return [
    '# Lighthouse AI Context Package',
    '',
    `Target output: ${formatLabel(format)} ready brief`,
    `URL: ${summary.finalUrl ?? summary.url}`,
    `Requested URL: ${summary.url}`,
    `Strategy: ${summary.strategy}`,
    `Source: ${summary.source}`,
    `Samples: ${summary.sampleCount}/${summary.requestedSampleCount}`,
    `Fetched at: ${summary.fetchedAt}`,
    `Optimization focus: ${focusMetric}`,
    goal ? `User goal: ${goal}` : `User goal: improve ${focusMetric} first with the smallest measurable code change.`,
    '',
    '## Current Metrics',
    formatMetrics(summary.metrics),
    '',
    '## AI Memory From History',
    formatHistory(summary, previous ?? null),
    '',
    '## Optimization Strategy',
    `- Optimize ${focusMetric} first.`,
    '- Prefer one small code change that can be measured with the same URL, strategy, source, and sample count.',
    '- Do not rewrite unrelated UI or business logic.',
    '- After editing, rerun the same performance analysis and compare the previous metrics.',
    '',
    '## Prioritized Lighthouse Signals',
    summary.actions.slice(0, 8).map(formatAction).join('\n') || '- No action signals were available.',
    '',
    '## Resource And Audit Context',
    formatResourceSignals(topAudits),
    '',
    '## Top Raw Audits',
    topAudits.map(formatAudit).join('\n') || '- No Lighthouse audits were available.',
    '',
    '## Output Format Instruction',
    formatOutputInstructions(format),
  ].join('\n');
}

function buildSystemPrompt(): string {
  return [
    'You write performance optimization briefs for AI coding assistants.',
    'Use the provided Lighthouse and history context as evidence.',
    'Do not invent files, source code, stack details, or measurements that were not provided.',
    'Prioritize the smallest measurable optimization pass, not a broad rewrite.',
    'The output must be directly copyable into an AI coding tool.',
    'Write in Chinese unless the context explicitly asks for another language.',
  ].join(' ');
}

function buildUserPrompt(context: string): string {
  return [
    context,
    '',
    '## Required Output',
    '',
    'Generate a concise AI coding brief with these sections:',
    '1. Optimization objective for this iteration',
    '2. Evidence from metrics and audits',
    '3. Constraints for the coding agent',
    '4. Specific investigation targets',
    '5. Verification steps after code changes',
    '',
    'Also include the compact Lighthouse context in a final appendix so the receiving AI has the raw evidence.',
    'Make it useful for a deep AI-tool user who will paste it into Codex, Cursor, Claude Code, or ChatGPT.',
  ].join('\n');
}

function extractOpenAiText(data: OpenAiResponse): string {
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();

  const fromOutput = data.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => typeof text === 'string' && text.trim().length > 0)
    .join('\n')
    .trim();

  return fromOutput ?? '';
}

function extractDeepSeekText(data: DeepSeekResponse): string {
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

function configuredProvider(): 'openai' | 'deepseek' {
  return process.env.AI_PROVIDER === 'deepseek' ? 'deepseek' : 'openai';
}

function configuredModel(): string {
  if (configuredProvider() === 'deepseek') {
    return process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || DEFAULT_DEEPSEEK_MODEL;
  }

  return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
}

function configuredBaseUrl(): string {
  if (configuredProvider() === 'deepseek') {
    return (process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL).replace(
      /\/+$/,
      '',
    );
  }

  return (process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, '');
}

function configuredApiKey(): string {
  if (configuredProvider() === 'deepseek') {
    return process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
  }

  return process.env.OPENAI_API_KEY || '';
}

async function callOpenAi(context: string): Promise<string> {
  const apiKey = configuredApiKey();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const response = await fetch(`${configuredBaseUrl()}/responses`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: configuredModel(),
      instructions: buildSystemPrompt(),
      input: buildUserPrompt(context),
      max_output_tokens: 1800,
    }),
  });
  const data = (await response.json()) as OpenAiResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `OpenAI request failed with status ${response.status}.`);
  }

  return extractOpenAiText(data);
}

async function callDeepSeek(context: string): Promise<string> {
  const apiKey = configuredApiKey();
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured.');
  }

  const response = await fetch(`${configuredBaseUrl()}/chat/completions`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: configuredModel(),
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(context) },
      ],
      thinking: { type: 'enabled' },
      reasoning_effort: 'high',
      stream: false,
      max_tokens: 1800,
    }),
  });
  const data = (await response.json()) as DeepSeekResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `DeepSeek request failed with status ${response.status}.`);
  }

  return extractDeepSeekText(data);
}

async function callConfiguredProvider(context: string): Promise<string> {
  if (configuredProvider() === 'deepseek') {
    return callDeepSeek(context);
  }

  return callOpenAi(context);
}

function fallbackBrief(input: AiOptimizationBriefInput, reason: AiOptimizationBriefResult['fallbackReason']): string {
  const context = buildAiContextPackage(input);
  const { summary, previous } = input;
  const primaryAction = summary.actions[0];
  const primaryMetric = primaryAction?.metric ?? pickFocusMetric(summary);
  const keyName = configuredProvider() === 'deepseek' ? 'DEEPSEEK_API_KEY' : 'OPENAI_API_KEY';

  return [
    reason === 'missing-api-key'
      ? `> 未配置 \`${keyName}\`，以下是本地规则生成的 AI 优化 Brief。`
      : '> AI 调用暂时不可用，以下是本地规则生成的 AI 优化 Brief。',
    '',
    `# 给 ${formatLabel(input.format ?? 'codex')} 的性能优化指令`,
    '',
    '## 本轮目标',
    `优先优化 ${primaryMetric} 相关瓶颈。不要做大范围重构，先处理 Lighthouse 数据中最可能带来可测量收益的问题。`,
    '',
    '## 证据',
    formatMetrics(summary.metrics),
    '',
    '## 历史信号',
    formatHistory(summary, previous ?? null),
    '',
    '## 优先调查目标',
    summary.actions.slice(0, 5).map(formatAction).join('\n') || '- 暂无明确行动项，先检查 Lighthouse 原始 audits。',
    '',
    '## 约束',
    '- 不要修改业务逻辑。',
    '- 优先改首屏资源、图片、字体、关键 CSS、阻塞 JavaScript 或第三方脚本。',
    '- 每次只做一个可验证的优化方向。',
    '- 修改后重新运行相同 URL、strategy 和 source 的分析。',
    '',
    '## 验证',
    `- 重新测试 ${summary.strategy} 策略下的 ${summary.finalUrl ?? summary.url}。`,
    '- 对比 Score、LCP、CLS、FCP、TBT、Speed Index。',
    '- 如果主要指标改善但其他指标回退，解释 tradeoff 并停止继续扩大修改。',
    '',
    '<details>',
    '<summary>压缩后的 Lighthouse 上下文</summary>',
    '',
    '```markdown',
    context,
    '```',
    '',
    '</details>',
  ].join('\n');
}

export async function generateAiOptimizationBrief(
  input: AiOptimizationBriefInput,
): Promise<AiOptimizationBriefResult> {
  const contextPackage = buildAiContextPackage(input);

  if (!configuredApiKey()) {
    return {
      provider: 'fallback',
      model: null,
      fallbackReason: 'missing-api-key',
      content: fallbackBrief(input, 'missing-api-key'),
      contextPackage,
    };
  }

  try {
    const content = await callConfiguredProvider(contextPackage);

    if (!content) {
      return {
        provider: 'fallback',
        model: null,
        fallbackReason: 'empty-response',
        content: fallbackBrief(input, 'empty-response'),
        contextPackage,
      };
    }

    return {
      provider: configuredProvider(),
      model: configuredModel(),
      content,
      contextPackage,
    };
  } catch (error) {
    return {
      provider: 'fallback',
      model: configuredModel(),
      fallbackReason: 'api-error',
      error: error instanceof Error ? error.message : 'Unknown AI error.',
      content: fallbackBrief(input, 'api-error'),
      contextPackage,
    };
  }
}
