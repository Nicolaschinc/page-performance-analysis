'use client';

import Link from 'next/link';
import { BarChart3, Gauge, SearchCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import CodexShell from '@/components/CodexShell';
import KeyResults from '@/components/KeyResults';
import SearchForm from '@/components/SearchForm';
import type { MetricSnapshot, PageSpeedSummary, Strategy } from '@/lib/pagespeed';

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

const starterItems = [
  {
    Icon: SearchCheck,
    text: '使用 Google PageSpeed Insights 分析公开页面',
  },
  {
    Icon: Gauge,
    text: '首页只聚焦四个关键指标',
  },
  {
    Icon: BarChart3,
    text: '需要趋势图时进入历史页面',
  },
];

function timeoutSecondsForStrategy(strategy: Strategy): number {
  return strategy === 'desktop' ? 240 : 120;
}

function strategyLabel(strategy: Strategy): string {
  return strategy === 'desktop' ? '桌面端' : '移动端';
}

function loadingStepsForStrategy(strategy: Strategy): LoadingStep[] {
  const timeoutSeconds = timeoutSecondsForStrategy(strategy);
  return [
    {
      threshold: 0,
      title: '正在发送请求',
      description: '正在准备本地 API 请求。',
    },
    {
      threshold: 2,
      title: '等待 PageSpeed JSON',
      description: 'Google PageSpeed Insights 正在为这个 URL 运行 Lighthouse。',
    },
    {
      threshold: 12,
      title: '仍在等待 Google',
      description:
        strategy === 'desktop'
          ? '桌面端模式在 JavaScript 较重的页面上会更慢。'
          : '新的 PageSpeed 任务通常需要 20 到 60 秒。',
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

export default function Home() {
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [strategy, setStrategy] = useState<Strategy>('mobile');
  const [isLoading, setIsLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isLoading) return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isLoading]);

  const activeStep = useMemo(() => {
    const loadingSteps = loadingStepsForStrategy(strategy);
    return loadingSteps.reduce((current, step) => (elapsed >= step.threshold ? step : current), loadingSteps[0]);
  }, [elapsed, strategy]);

  function cancelAnalyze() {
    abortRef.current?.abort();
  }

  async function handleAnalyze(url: string, nextStrategy: Strategy) {
    setIsLoading(true);
    setElapsed(0);
    setError('');
    setCurrentUrl(url);
    setStrategy(nextStrategy);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, strategy: nextStrategy }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? '分析失败。');
      setResult(data);
      setCurrentUrl(data.summary.url);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        setError('分析已取消，本次不会保存快照。');
      } else {
        setError(caught instanceof Error ? caught.message : '分析失败。');
      }
    } finally {
      abortRef.current = null;
      setIsLoading(false);
    }
  }

  const scoreDiff = result
    ? metricDiff(result.summary.metrics.score, result.previous?.metrics.score ?? null, true)
    : null;
  const lcpDiff = result ? metricDiff(result.summary.metrics.lcp, result.previous?.metrics.lcp ?? null) : null;
  const historyHref = currentUrl ? `/history?url=${encodeURIComponent(currentUrl)}&strategy=${strategy}` : '/history';
  const timeoutSeconds = timeoutSecondsForStrategy(strategy);

  return (
    <CodexShell active="analyze">
      <main className="min-h-[calc(100vh-4rem)] px-4 pb-12 sm:px-6">
        <div
          className={`mx-auto grid w-full max-w-[980px] gap-6 ${
            result ? 'pt-8' : 'min-h-[calc(100vh-4rem)] content-center pb-20'
          }`}
        >
          <section className="mx-auto max-w-[760px] text-center">
            <h1 className="text-[34px] font-semibold leading-tight tracking-normal text-[#1f1f1f]">
              要分析 page-performance 里的哪个页面？
            </h1>
            <p className="mt-3 text-[15px] leading-6 text-[#8a8a86]">
              粘贴一个公开 URL。工作区只保留 Score、Core Web Vitals 和下一步修复建议。
            </p>
          </section>

          <SearchForm onSubmit={handleAnalyze} isLoading={isLoading} />

          {error && (
            <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-800">
              {error}
            </div>
          )}

          {isLoading && (
            <section className="rounded-[18px] border border-black/10 bg-white p-4 text-[14px] text-[#1f1f1f] shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{activeStep.title}</div>
                  <p className="mt-1 text-[#777773]">{activeStep.description}</p>
                </div>
                <button
                  type="button"
                  onClick={cancelAnalyze}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-[13px] font-medium text-[#666662] hover:bg-black/[0.04]"
                >
                  取消
                </button>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className="h-full rounded-full bg-[#8f8f8b] transition-all"
                  style={{ width: `${Math.min((elapsed / timeoutSeconds) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[12px] text-[#8a8a86]">
                <span>{elapsed}s elapsed</span>
                <span>{timeoutSeconds}s 超时</span>
              </div>
            </section>
          )}

          {result ? (
            <section className="grid gap-5">
              <div className="rounded-[18px] border border-black/10 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-[18px] font-medium text-[#1f1f1f]">
                      {result.summary.finalUrl ?? result.summary.url}
                    </div>
                    <p className="mt-1 text-[13px] capitalize text-[#8a8a86]">
                      {strategyLabel(result.summary.strategy)}运行 · {new Date(result.summary.fetchedAt).toLocaleString('zh-CN')}
                      {typeof result.durationMs === 'number' && ` · ${(result.durationMs / 1000).toFixed(1)}s`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[13px]">
                    {scoreDiff && <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[#666662]">Score {scoreDiff}</span>}
                    {lcpDiff && <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[#666662]">LCP {lcpDiff}</span>}
                    <Link href={historyHref} className="rounded-full bg-[#1f1f1f] px-3 py-1 text-white hover:bg-black">
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
          ) : (
            <section className="mx-auto mt-2 w-full max-w-[820px] divide-y divide-black/[0.06] text-[15px] text-[#8a8a86]">
              {starterItems.map(({ Icon, text }) => (
                <div key={text} className="flex items-center gap-3 px-8 py-4">
                  <Icon className="h-[18px] w-[18px] text-[#9f9f9a]" strokeWidth={1.8} />
                  {text}
                </div>
              ))}
            </section>
          )}
        </div>
      </main>
    </CodexShell>
  );
}
