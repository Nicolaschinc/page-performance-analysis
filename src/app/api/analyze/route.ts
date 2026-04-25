import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runLocalLighthouse } from '@/lib/local-lighthouse';
import {
  normalizeUrl,
  parsePageSpeedResponse,
  type AnalyzeMode,
  type AnalysisSource,
  type Strategy,
} from '@/lib/pagespeed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGESPEED_TIMEOUT_MS: Record<Strategy, number> = {
  mobile: 120_000,
  desktop: 240_000,
};

const RETRYABLE_PAGESPEED_ERRORS = [
  'Lighthouse returned error',
  'Something went wrong',
  'ERRORED_DOCUMENT_REQUEST',
  'INTERNAL',
];

function isStrategy(value: unknown): value is Strategy {
  return value === 'mobile' || value === 'desktop';
}

function isAnalyzeMode(value: unknown): value is AnalyzeMode {
  return value === 'external' || value === 'internal';
}

function sourceForMode(mode: AnalyzeMode): AnalysisSource {
  return mode === 'internal' ? 'local-lighthouse' : 'psi';
}

function isRetryablePageSpeedError(message: string): boolean {
  return RETRYABLE_PAGESPEED_ERRORS.some((pattern) => message.includes(pattern));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPageSpeedJson(pageSpeedUrl: URL, strategy: Strategy) {
  const maxAttempts = strategy === 'desktop' ? 2 : 1;
  let lastMessage = '';
  let lastStatus = 502;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutMs = PAGESPEED_TIMEOUT_MS[strategy];
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(pageSpeedUrl, {
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    const data = await response.json();

    if (response.ok && !data.error) {
      return data;
    }

    lastStatus = response.status || 502;
    lastMessage = data.error?.message ?? `PageSpeed 请求失败，状态码 ${response.status}。`;

    if (attempt < maxAttempts && isRetryablePageSpeedError(lastMessage)) {
      await sleep(2_000);
      continue;
    }

    break;
  }

  const hint = isRetryablePageSpeedError(lastMessage)
    ? ' Google Lighthouse 上游执行失败。桌面端模式更容易遇到这个问题，通常重试可以恢复。'
    : '';
  throw new Error(`${lastMessage}${hint}__STATUS__${lastStatus}`);
}

async function analyzeWithPageSpeed(url: string, strategy: Strategy) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const pageSpeedUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  pageSpeedUrl.searchParams.set('url', url);
  pageSpeedUrl.searchParams.set('strategy', strategy);
  pageSpeedUrl.searchParams.append('category', 'performance');
  pageSpeedUrl.searchParams.set('locale', 'zh-CN');
  if (apiKey) pageSpeedUrl.searchParams.set('key', apiKey);

  return fetchPageSpeedJson(pageSpeedUrl, strategy);
}

async function analyzeUrl(url: string, strategy: Strategy, source: AnalysisSource) {
  if (source === 'local-lighthouse') {
    return runLocalLighthouse(url, strategy);
  }

  return analyzeWithPageSpeed(url, strategy);
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = (await req.json()) as { mode?: unknown; url?: string; strategy?: unknown };

    if (!body.url) {
      return NextResponse.json({ error: '请输入 URL。' }, { status: 400 });
    }

    const url = normalizeUrl(body.url);
    const strategy: Strategy = isStrategy(body.strategy) ? body.strategy : 'mobile';
    const mode: AnalyzeMode = isAnalyzeMode(body.mode) ? body.mode : 'external';
    const source = sourceForMode(mode);

    const previousRun = await prisma.run.findFirst({
      where: { url, strategy },
      orderBy: { createdAt: 'desc' },
    });

    const psData = await analyzeUrl(url, strategy, source);

    const summary = parsePageSpeedResponse(psData, url, strategy, source);

    const run = await prisma.run.create({
      data: {
        url,
        finalUrl: summary.finalUrl,
        pageTitle: summary.pageTitle,
        strategy,
        score: summary.metrics.score,
        lcp: summary.metrics.lcp,
        cls: summary.metrics.cls,
        fcp: summary.metrics.fcp,
        tbt: summary.metrics.tbt,
        speedIndex: summary.metrics.speedIndex,
        interactive: summary.metrics.interactive,
        opportunities: JSON.stringify(summary.opportunities),
        diagnostics: JSON.stringify(summary.diagnostics),
      },
    });

    return NextResponse.json({
      run: {
        id: run.id,
        createdAt: run.createdAt.toISOString(),
      },
      durationMs: Date.now() - startedAt,
      summary,
      previous: previousRun
        ? {
            id: previousRun.id,
            createdAt: previousRun.createdAt.toISOString(),
            metrics: {
              score: previousRun.score,
              lcp: previousRun.lcp,
              cls: previousRun.cls,
              fcp: previousRun.fcp,
              tbt: previousRun.tbt,
              speedIndex: previousRun.speedIndex,
              interactive: previousRun.interactive,
            },
          }
        : null,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error:
            'PageSpeed Insights 在本地超时前没有完成。桌面端模式可能更慢，请重试或先测试更轻量的 URL。',
        },
        { status: 504 },
      );
    }

    const rawMessage = error instanceof Error ? error.message : '未知错误';
    const [message, statusMarker] = rawMessage.split('__STATUS__');
    if (statusMarker) {
      const status = Number(statusMarker) || 502;
      return NextResponse.json({ error: message }, { status });
    }
    const status = message.includes('URL') || message.includes('http') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
