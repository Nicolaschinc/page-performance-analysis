'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import CodexShell from '@/components/CodexShell';
import KeyResults from '@/components/KeyResults';
import type { AnalyzeMode, MetricSnapshot, PageSpeedSummary, Strategy } from '@/lib/pagespeed';

type AnalyzeResponse = {
  durationMs?: number;
  summary: PageSpeedSummary;
  previous: {
    id: string;
    createdAt: string;
    metrics: MetricSnapshot;
  } | null;
};

type LoadingStep = {
  title: string;
  description: string;
  threshold: number;
};

function timeoutSecondsForStrategy(strategy: Strategy, mode: AnalyzeMode = 'external'): number {
  if (mode === 'internal') return strategy === 'desktop' ? 270 : 150;
  return strategy === 'desktop' ? 240 : 120;
}

function strategyLabel(strategy: Strategy): string {
  return strategy === 'desktop' ? '桌面端' : '移动端';
}

function sourceLabel(source: PageSpeedSummary['source']): string {
  return source === 'local-lighthouse' ? 'Chrome MCP' : 'Google PSI';
}

function sampleLabel(summary: PageSpeedSummary): string {
  if (summary.requestedSampleCount <= 1) return '单次样本';
  if (summary.failedSampleCount === 0) return `${summary.sampleCount} 次平均`;
  return `${summary.sampleCount}/${summary.requestedSampleCount} 次成功样本平均`;
}

function modeLabel(mode: AnalyzeMode): string {
  return mode === 'internal' ? '内网' : '外网';
}

function loadingStepsForStrategy(strategy: Strategy, mode: AnalyzeMode): LoadingStep[] {
  const timeoutSeconds = timeoutSecondsForStrategy(strategy, mode);
  const engineName = mode === 'internal' ? 'Chrome MCP' : 'PageSpeed API';
  return [
    {
      threshold: 0,
      title: '正在发送请求',
      description: `正在准备 ${engineName} 分析任务。`,
    },
    {
      threshold: 2,
      title: '等待性能数据',
      description:
        mode === 'internal'
          ? 'Chrome MCP 正在为这个 URL 运行本地 Lighthouse。'
          : 'PageSpeed API 正在为这个 URL 运行 Lighthouse。',
    },
    {
      threshold: 12,
      title: '仍在等待结果',
      description:
        strategy === 'desktop'
          ? '桌面端模式在 JavaScript 较重的页面上会更慢。'
          : '新的 Lighthouse 任务通常需要 20 到 60 秒。',
    },
    {
      threshold: strategy === 'desktop' ? 90 : 45,
      title: '分析时间较长',
      description: `请求仍然有效。本地超时时间为 ${timeoutSeconds} 秒。`,
    },
  ];
}

function metricDiff(current: number | null, previous: number | null, higherIsBetter = false): string | null {
  if (current === null || previous === null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.001) return '无变化';
  const improved = higherIsBetter ? diff > 0 : diff < 0;
  const prefix = improved ? '提升' : '回退';
  return `${prefix} ${Math.abs(diff) >= 10 ? Math.round(Math.abs(diff)) : Math.abs(diff).toFixed(3)}`;
}

function AnalyzePageContent() {
  const searchParams = useSearchParams();
  const requestedUrl = (searchParams.get('url') ?? '').trim();
  const requestedStrategy: Strategy = searchParams.get('strategy') === 'desktop' ? 'desktop' : 'mobile';
  const requestedMode: AnalyzeMode = searchParams.get('mode') === 'internal' ? 'internal' : 'external';

  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const hasRequestedUrl = requestedUrl.length > 0;
  const effectiveStrategy = result?.summary.strategy ?? requestedStrategy;
  const effectiveUrl = result?.summary.url ?? requestedUrl;

  useEffect(() => {
    if (!isLoading || !hasRequestedUrl) return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [hasRequestedUrl, isLoading]);

  useEffect(() => {
    if (!hasRequestedUrl) {
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    async function runAnalyze() {
      setIsLoading(true);
      setElapsed(0);
      setError('');
      setResult(null);

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: requestedMode, url: requestedUrl, strategy: requestedStrategy }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? '分析失败。');
        setResult(data);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') {
          if (abortRef.current === controller) {
            setError('分析已取消，本次不会保存快照。');
          }
        } else {
          setError(caught instanceof Error ? caught.message : '分析失败。');
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsLoading(false);
        }
      }
    }

    runAnalyze();
    return () => controller.abort();
  }, [hasRequestedUrl, requestedMode, requestedStrategy, requestedUrl]);

  const activeStep = useMemo(() => {
    const loadingSteps = loadingStepsForStrategy(effectiveStrategy, requestedMode);
    return loadingSteps.reduce((current, step) => (elapsed >= step.threshold ? step : current), loadingSteps[0]);
  }, [elapsed, effectiveStrategy, requestedMode]);

  function cancelAnalyze() {
    abortRef.current?.abort();
  }

  const scoreDiff = result
    ? metricDiff(result.summary.metrics.score, result.previous?.metrics.score ?? null, true)
    : null;
  const lcpDiff = result ? metricDiff(result.summary.metrics.lcp, result.previous?.metrics.lcp ?? null) : null;
  const historyHref = effectiveUrl ? `/history?url=${encodeURIComponent(effectiveUrl)}&strategy=${effectiveStrategy}` : '/history';
  const timeoutSeconds = timeoutSecondsForStrategy(effectiveStrategy, requestedMode);

  return (
    <CodexShell active="none">
      <main className="min-h-screen bg-white px-4 py-6 sm:px-6 lg:py-10">
        <div className="mx-auto grid w-full max-w-[1050px] gap-6">
          {!hasRequestedUrl && (
            <section className="mx-auto w-full max-w-[760px] rounded-2xl border border-black/[0.08] bg-white p-4 text-[14px] text-[#6f7378] shadow-sm">
              请先从「新建分析」页面输入可公开访问的 URL 再开始分析。
            </section>
          )}

          {hasRequestedUrl && error && (
            <div className="mx-auto w-full max-w-[760px] rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-800">
              {error}
            </div>
          )}

          {hasRequestedUrl && isLoading && (
            <section className="mx-auto w-full max-w-[760px] rounded-2xl border border-black/[0.08] bg-white p-4 text-[14px] text-[#202123] shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{activeStep.title}</div>
                  <p className="mt-1 text-[#6f7378]">{activeStep.description}</p>
                  <p className="mt-1 text-[13px] text-[#55585d]">
                    正在测试 <span className="font-medium">{strategyLabel(effectiveStrategy)}</span> ·{' '}
                    <span className="font-medium">{modeLabel(requestedMode)}</span> ·{' '}
                    <span className="break-all text-[#202123]">{effectiveUrl}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cancelAnalyze}
                  className="rounded-full border border-black/[0.08] px-3 py-1.5 text-[13px] font-medium text-[#5f6368] transition hover:bg-black/[0.04]"
                >
                  取消
                </button>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className="h-full rounded-full bg-[#202123] transition-all"
                  style={{ width: `${Math.min((elapsed / timeoutSeconds) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[12px] text-[#8a8f95]">
                <span>已用时 {elapsed}s</span>
                <span>{timeoutSeconds}s 超时</span>
              </div>
            </section>
          )}

          {hasRequestedUrl && result ? (
            <section className="grid gap-5">
              <div className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#8a8f95]">分析结果</p>
                    <div className="mt-1 truncate text-[18px] font-semibold text-[#202123]">
                      {result.summary.finalUrl ?? result.summary.url}
                    </div>
                    <p className="mt-1 text-[13px] capitalize text-[#6f7378]">
                      {strategyLabel(result.summary.strategy)} · {sourceLabel(result.summary.source)} ·{' '}
                      {sampleLabel(result.summary)} ·{' '}
                      {new Date(result.summary.fetchedAt).toLocaleString('zh-CN')}
                      {typeof result.durationMs === 'number' && ` · ${(result.durationMs / 1000).toFixed(1)}s`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[13px]">
                    {scoreDiff && <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[#5f6368]">评分 {scoreDiff}</span>}
                    {lcpDiff && <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[#5f6368]">LCP 指标 {lcpDiff}</span>}
                    <Link href={historyHref} className="rounded-full bg-[#202123] px-3 py-1 text-white transition hover:bg-black">
                      查看历史
                    </Link>
                  </div>
                </div>
              </div>
              <KeyResults
                actions={result.summary.actions}
                opportunities={result.summary.opportunities}
                metrics={result.summary.metrics}
              />
            </section>
          ) : null}
        </div>
      </main>
    </CodexShell>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <CodexShell active="none">
          <main className="min-h-screen bg-white px-4 py-6 sm:px-6 lg:py-10">
            <div className="mx-auto grid w-full max-w-[1050px] gap-6">
              <section className="mx-auto w-full max-w-[760px] rounded-2xl border border-black/[0.08] bg-white p-4 text-[14px] text-[#6f7378] shadow-sm">
                正在准备分析页面...
              </section>
            </div>
          </main>
        </CodexShell>
      }
    >
      <AnalyzePageContent />
    </Suspense>
  );
}
