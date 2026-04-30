import { NextRequest, NextResponse } from 'next/server';
import { generateAiOptimizationBrief } from '@/lib/ai-optimizer';
import type { MetricSnapshot, PageSpeedSummary } from '@/lib/pagespeed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BriefRequestBody = {
  summary?: unknown;
  previous?: unknown;
  goal?: unknown;
  format?: unknown;
};

type PreviousRun = {
  id?: string;
  createdAt?: string;
  metrics: MetricSnapshot;
} | null;

const formats = ['codex', 'cursor', 'claude-code', 'chatgpt', 'github-issue', 'markdown'] as const;
type BriefFormat = (typeof formats)[number];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBriefFormat(value: unknown): value is BriefFormat {
  return typeof value === 'string' && formats.includes(value as BriefFormat);
}

function isMetricSnapshot(value: unknown): value is MetricSnapshot {
  if (!isObject(value)) return false;
  return ['score', 'lcp', 'cls', 'fcp', 'tbt', 'speedIndex', 'interactive'].every((key) => {
    const metric = value[key];
    return metric === null || typeof metric === 'number';
  });
}

function isPageSpeedSummary(value: unknown): value is PageSpeedSummary {
  if (!isObject(value)) return false;
  return (
    typeof value.url === 'string' &&
    (value.finalUrl === null || typeof value.finalUrl === 'string') &&
    (value.pageTitle === null || typeof value.pageTitle === 'string') &&
    (value.strategy === 'mobile' || value.strategy === 'desktop') &&
    (value.source === 'psi' || value.source === 'local-lighthouse') &&
    typeof value.fetchedAt === 'string' &&
    typeof value.sampleCount === 'number' &&
    typeof value.requestedSampleCount === 'number' &&
    typeof value.failedSampleCount === 'number' &&
    isMetricSnapshot(value.metrics) &&
    Array.isArray(value.opportunities) &&
    Array.isArray(value.diagnostics) &&
    Array.isArray(value.actions)
  );
}

function parsePrevious(value: unknown): PreviousRun {
  if (value === null || typeof value === 'undefined') return null;
  if (!isObject(value) || !isMetricSnapshot(value.metrics)) return null;

  return {
    id: typeof value.id === 'string' ? value.id : undefined,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined,
    metrics: value.metrics,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BriefRequestBody;

    if (!isPageSpeedSummary(body.summary)) {
      return NextResponse.json({ error: '请提供有效的 PageSpeed summary。' }, { status: 400 });
    }

    const result = await generateAiOptimizationBrief({
      summary: body.summary,
      previous: parsePrevious(body.previous),
      goal: typeof body.goal === 'string' ? body.goal : undefined,
      format: isBriefFormat(body.format) ? body.format : 'codex',
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成 AI 优化 Brief 失败。';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
