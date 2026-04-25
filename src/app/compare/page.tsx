'use client';

import {
  ArrowUp,
  Bot,
  CheckCircle2,
  GitCompare,
  Link2,
  LoaderCircle,
  Monitor,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import CodexShell from '@/components/CodexShell';
import PerformanceCompareChart from '@/components/PerformanceCompareChart';
import type { MetricKey, MetricSnapshot, PageSpeedSummary, Strategy } from '@/lib/pagespeed';

type AnalyzeResponse = {
  durationMs?: number;
  summary: PageSpeedSummary;
};

type CompareResult = {
  left: AnalyzeResponse;
  right: AnalyzeResponse;
};

type CompareMetric = {
  key: MetricKey;
  label: string;
  unit: string;
  higherIsBetter: boolean;
};

const compareMetrics: CompareMetric[] = [
  { key: 'score', label: 'Score', unit: '', higherIsBetter: true },
  { key: 'lcp', label: 'LCP', unit: 's', higherIsBetter: false },
  { key: 'cls', label: 'CLS', unit: '', higherIsBetter: false },
  { key: 'fcp', label: 'FCP', unit: 's', higherIsBetter: false },
  { key: 'tbt', label: 'TBT', unit: 'ms', higherIsBetter: false },
  { key: 'speedIndex', label: 'Speed Index', unit: 's', higherIsBetter: false },
];

const examples = [
  {
    label: '当前应用',
    left: 'http://localhost:3000/',
    right: 'http://localhost:3000/compare',
  },
  {
    label: '公开页面',
    left: 'https://example.com',
    right: 'https://example.org',
  },
];

function strategyLabel(strategy: Strategy): string {
  return strategy === 'desktop' ? '桌面端' : '移动端';
}

function sourceLabel(source: PageSpeedSummary['source']): string {
  return source === 'local-lighthouse' ? '本地 Lighthouse' : 'Google PSI';
}

function displayUrl(summary: PageSpeedSummary): string {
  return summary.finalUrl ?? summary.url;
}

function shortUrl(value: string): string {
  try {
    const parsed = new URL(value);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return value.replace(/^https?:\/\//, '').replace(/^www\./, '');
  }
}

function formatMetric(key: MetricKey, value: number | null, unit: string): string {
  if (value === null) return '-';
  if (unit === 's') return `${(value / 1000).toFixed(2)}s`;
  if (unit === 'ms') return `${Math.round(value)}ms`;
  if (key === 'cls') return value.toFixed(3);
  return String(Math.round(value));
}

function metricWinner(metric: CompareMetric, left: MetricSnapshot, right: MetricSnapshot): 'left' | 'right' | 'tie' | 'unknown' {
  const leftValue = left[metric.key];
  const rightValue = right[metric.key];
  if (leftValue === null || rightValue === null) return 'unknown';
  if (Math.abs(leftValue - rightValue) < 0.001) return 'tie';
  const leftWins = metric.higherIsBetter ? leftValue > rightValue : leftValue < rightValue;
  return leftWins ? 'left' : 'right';
}

function winnerLabel(winner: ReturnType<typeof metricWinner>): string {
  if (winner === 'left') return 'A 更好';
  if (winner === 'right') return 'B 更好';
  if (winner === 'tie') return '持平';
  return '无数据';
}

function scoreSummary(result: CompareResult): string {
  const leftScore = result.left.summary.metrics.score;
  const rightScore = result.right.summary.metrics.score;
  if (leftScore === null || rightScore === null) return '两边至少有一个页面没有返回 Score。';
  if (leftScore === rightScore) return `两个页面 Score 都是 ${leftScore}，继续看 LCP、TBT 和 CLS 的差异。`;
  const winner = leftScore > rightScore ? '链接 A' : '链接 B';
  return `${winner} 的 Lighthouse Score 高 ${Math.abs(leftScore - rightScore)} 分。`;
}

async function analyzeUrl(label: string, url: string, strategy: Strategy, signal: AbortSignal): Promise<AnalyzeResponse> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, strategy }),
    signal,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${label}：${data.error ?? '分析失败。'}`);
  return data;
}

export default function ComparePage() {
  const [leftUrl, setLeftUrl] = useState('');
  const [rightUrl, setRightUrl] = useState('');
  const [strategy, setStrategy] = useState<Strategy>('mobile');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CompareResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!leftUrl.trim() || !rightUrl.trim() || isLoading) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const [left, right] = await Promise.all([
        analyzeUrl('链接 A', leftUrl.trim(), strategy, controller.signal),
        analyzeUrl('链接 B', rightUrl.trim(), strategy, controller.signal),
      ]);
      setResult({ left, right });
    } catch (caught) {
      controller.abort();
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        setError('性能对比已取消，本次不会生成对比图。');
      } else {
        setError(caught instanceof Error ? caught.message : '性能对比失败。');
      }
    } finally {
      abortRef.current = null;
      setIsLoading(false);
    }
  }

  function cancelCompare() {
    abortRef.current?.abort();
  }

  function applyExample(left: string, right: string) {
    setLeftUrl(left);
    setRightUrl(right);
    setError('');
  }

  const canSubmit = leftUrl.trim().length > 0 && rightUrl.trim().length > 0 && !isLoading;
  const leftLabel = result ? shortUrl(displayUrl(result.left.summary)) : '链接 A';
  const rightLabel = result ? shortUrl(displayUrl(result.right.summary)) : '链接 B';

  return (
    <CodexShell active="compare">
      <main className="min-h-[calc(100vh-4rem)] bg-[#f7f7f4] px-3 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4">
          <section className="flex items-start gap-3">
            <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#202123] text-white sm:flex">
              <Bot className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-[15px] leading-6 text-[#353740] shadow-sm">
              <div className="flex items-center gap-2 font-medium text-[#202123]">
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                性能对比
              </div>
              <p className="mt-2">
                发给我两个 URL，我会用同一个 {strategyLabel(strategy)} 环境并行跑 Lighthouse，然后把差异整理成图表和可读结论。
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-[#6b6f76]">
                <span className="rounded-full bg-[#f0f0f0] px-2.5 py-1">公网使用 Google PSI</span>
                <span className="rounded-full bg-[#f0f0f0] px-2.5 py-1">内网使用本地 Lighthouse</span>
              </div>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="rounded-lg border border-black/10 bg-white shadow-sm">
            <div className="grid gap-px bg-black/[0.06] md:grid-cols-2">
              <label className="grid gap-2 bg-white p-4">
                <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6b6f76]">
                  <Link2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  链接 A
                </span>
                <input
                  type="url"
                  required
                  placeholder="https://example.com 或 http://10.0.0.12"
                  value={leftUrl}
                  onChange={(event) => setLeftUrl(event.target.value)}
                  disabled={isLoading}
                  className="h-11 w-full border-0 bg-transparent text-[15px] text-[#202123] outline-none placeholder:text-[#b8b8b8] disabled:cursor-not-allowed disabled:text-[#8e8ea0]"
                />
              </label>
              <label className="grid gap-2 bg-white p-4">
                <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[#6b6f76]">
                  <Link2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  链接 B
                </span>
                <input
                  type="url"
                  required
                  placeholder="https://example.org 或 http://localhost:3000"
                  value={rightUrl}
                  onChange={(event) => setRightUrl(event.target.value)}
                  disabled={isLoading}
                  className="h-11 w-full border-0 bg-transparent text-[15px] text-[#202123] outline-none placeholder:text-[#b8b8b8] disabled:cursor-not-allowed disabled:text-[#8e8ea0]"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-black/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="grid h-9 grid-cols-2 rounded-full bg-[#f0f0f0] p-0.5">
                  {(['mobile', 'desktop'] as const).map((item) => {
                    const Icon = item === 'mobile' ? Smartphone : Monitor;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setStrategy(item)}
                        disabled={isLoading}
                        className={`inline-flex min-w-[88px] items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition ${
                          strategy === item ? 'bg-white text-[#202123] shadow-sm' : 'text-[#6b6f76] hover:text-[#202123]'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                        {strategyLabel(item)}
                      </button>
                    );
                  })}
                </div>

                {examples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => applyExample(example.left, example.right)}
                    disabled={isLoading}
                    className="rounded-full border border-black/10 px-3 py-1.5 text-[13px] text-[#5f6368] transition hover:bg-[#f7f7f4] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {example.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2">
                {isLoading && (
                  <button
                    type="button"
                    onClick={cancelCompare}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 px-4 text-[14px] font-medium text-[#5f6368] hover:bg-[#f7f7f4]"
                  >
                    <X className="h-4 w-4" strokeWidth={1.8} />
                    取消
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#202123] px-4 text-[14px] font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#d8d8d8]"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={1.9} />
                  {isLoading ? '分析中' : '发送'}
                </button>
              </div>
            </div>
          </form>

          {isLoading && (
            <section className="flex items-start gap-3">
              <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#202123] text-white sm:flex">
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} />
              </div>
              <div className="w-full rounded-lg border border-black/10 bg-white p-4 text-[14px] text-[#353740] shadow-sm">
                <div className="font-medium text-[#202123]">正在运行两个 Lighthouse 任务</div>
                <div className="mt-3 grid gap-2 text-[#6b6f76] sm:grid-cols-3">
                  {['并行请求 A/B', `保持 ${strategyLabel(strategy)} 环境一致`, '汇总图表和赢家'].map((step) => (
                    <div key={step} className="flex items-center gap-2 rounded-md bg-[#f7f7f4] px-3 py-2">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {error && (
            <section className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-800">
              {error}
            </section>
          )}

          {result && (
            <section className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#202123] text-white sm:flex">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
                </div>
                <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-[15px] leading-6 text-[#353740] shadow-sm">
                  <div className="font-medium text-[#202123]">对比完成</div>
                  <p className="mt-1">{scoreSummary(result)}</p>
                  <p className="mt-1 text-[13px] text-[#6b6f76]">
                    {leftLabel} vs {rightLabel} · {strategyLabel(result.left.summary.strategy)} ·{' '}
                    {sourceLabel(result.left.summary.source)} / {sourceLabel(result.right.summary.source)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <article className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
                  <div className="text-[13px] text-[#6b6f76]">链接 A Score</div>
                  <div className="mt-2 text-[32px] font-semibold leading-none text-[#202123]">
                    {formatMetric('score', result.left.summary.metrics.score, '')}
                  </div>
                  <p className="mt-2 truncate text-[13px] text-[#6b6f76]">{displayUrl(result.left.summary)}</p>
                </article>
                <article className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
                  <div className="text-[13px] text-[#6b6f76]">链接 B Score</div>
                  <div className="mt-2 text-[32px] font-semibold leading-none text-[#202123]">
                    {formatMetric('score', result.right.summary.metrics.score, '')}
                  </div>
                  <p className="mt-2 truncate text-[13px] text-[#6b6f76]">{displayUrl(result.right.summary)}</p>
                </article>
                <article className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
                  <div className="text-[13px] text-[#6b6f76]">本次环境</div>
                  <div className="mt-2 text-[20px] font-semibold text-[#202123]">{strategyLabel(strategy)}</div>
                  <p className="mt-2 text-[13px] text-[#6b6f76]">
                    {sourceLabel(result.left.summary.source)} / {sourceLabel(result.right.summary.source)}
                  </p>
                </article>
              </div>

              <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#202123]">指标图</h2>
                    <p className="mt-1 text-[13px] text-[#6b6f76]">LCP/FCP/SI 为秒，TBT 为 100ms，CLS 为 x100。</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#f0f0f0] px-3 py-1 text-[13px] text-[#5f6368]">
                    <GitCompare className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {leftLabel} vs {rightLabel}
                  </div>
                </div>
                <div className="mt-4">
                  <PerformanceCompareChart
                    leftLabel={leftLabel}
                    leftSummary={result.left.summary}
                    rightLabel={rightLabel}
                    rightSummary={result.right.summary}
                  />
                </div>
              </section>

              <section className="grid gap-2">
                {compareMetrics.map((metric) => {
                  const winner = metricWinner(metric, result.left.summary.metrics, result.right.summary.metrics);
                  return (
                    <article
                      key={metric.key}
                      className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:grid-cols-[1fr_120px_120px_88px]"
                    >
                      <div>
                        <div className="font-medium text-[#202123]">{metric.label}</div>
                        <div className="mt-1 text-[13px] text-[#6b6f76]">
                          {metric.higherIsBetter ? '越高越好' : '越低越好'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[12px] text-[#8e8ea0]">A</div>
                        <div className="mt-1 font-medium text-[#202123]">
                          {formatMetric(metric.key, result.left.summary.metrics[metric.key], metric.unit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[12px] text-[#8e8ea0]">B</div>
                        <div className="mt-1 font-medium text-[#202123]">
                          {formatMetric(metric.key, result.right.summary.metrics[metric.key], metric.unit)}
                        </div>
                      </div>
                      <div className="flex items-center sm:justify-end">
                        <span className="rounded-full bg-[#f0f0f0] px-2.5 py-1 text-[12px] font-medium text-[#5f6368]">
                          {winnerLabel(winner)}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </section>
            </section>
          )}
        </div>
      </main>
    </CodexShell>
  );
}
