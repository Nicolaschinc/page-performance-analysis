'use client';

import {
  ArrowUp,
  Bot,
  CheckCircle2,
  GitCompare,
  Globe2,
  Link2,
  LoaderCircle,
  Monitor,
  Server,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import CodexShell from '@/components/CodexShell';
import PerformanceCompareChart from '@/components/PerformanceCompareChart';
import type { AnalyzeMode, MetricKey, MetricSnapshot, PageSpeedSummary, Strategy } from '@/lib/pagespeed';

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

function strategyLabel(strategy: Strategy): string {
  return strategy === 'desktop' ? '桌面端' : '移动端';
}

function sourceLabel(source: PageSpeedSummary['source']): string {
  return source === 'local-lighthouse' ? '本地 Lighthouse' : 'Google PSI';
}

function modeLabel(mode: AnalyzeMode): string {
  return mode === 'internal' ? '内网' : '外网';
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

async function analyzeUrl(
  label: string,
  url: string,
  mode: AnalyzeMode,
  strategy: Strategy,
  signal: AbortSignal,
): Promise<AnalyzeResponse> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, url, strategy }),
    signal,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${label}：${data.error ?? '分析失败。'}`);
  return data;
}

export default function ComparePage() {
  const [leftUrl, setLeftUrl] = useState('');
  const [rightUrl, setRightUrl] = useState('');
  const [mode, setMode] = useState<AnalyzeMode>('external');
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
        analyzeUrl('链接 A', leftUrl.trim(), mode, strategy, controller.signal),
        analyzeUrl('链接 B', rightUrl.trim(), mode, strategy, controller.signal),
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

  const canSubmit = leftUrl.trim().length > 0 && rightUrl.trim().length > 0 && !isLoading;
  const leftLabel = result ? shortUrl(displayUrl(result.left.summary)) : '链接 A';
  const rightLabel = result ? shortUrl(displayUrl(result.right.summary)) : '链接 B';

  return (
    <CodexShell active="compare">
      <main className="min-h-[calc(100vh-4rem)] bg-[#f7f7f4] px-3 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto flex w-full max-w-[1050px] flex-col gap-4">
          <section className="mx-auto flex w-full max-w-[760px] items-start gap-3">
            <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#202123] text-white sm:flex">
              <Bot className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-[15px] leading-6 text-[#353740] shadow-sm">
              <div className="flex items-center gap-2 font-medium text-[#202123]">
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                性能对比
              </div>
              <p className="mt-2">
                发给我两个 URL，我会用同一个 {modeLabel(mode)} {strategyLabel(strategy)} 环境并行跑 Lighthouse，然后把差异整理成图表和可读结论。
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-[#6b6f76]">
                <span className="rounded-full bg-[#f0f0f0] px-2.5 py-1">公网使用 Google PSI</span>
                <span className="rounded-full bg-[#f0f0f0] px-2.5 py-1">内网使用本地 Lighthouse</span>
              </div>
            </div>
          </section>

          <div className="flex w-full justify-center">
            <form onSubmit={handleSubmit} className="w-full max-w-[760px] overflow-hidden rounded-[20px] border border-black/[0.08] bg-white shadow-[0_10px_26px_rgba(0,0,0,0.06)]">
              <div className="grid gap-px bg-black/[0.06]">
                <label className="flex flex-col bg-white">
                  <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#f4f4f4] px-4 py-2 text-[13px] font-medium text-[#6b6f76]">
                    <Link2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    链接 A
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com 或 http://10.0.0.12"
                    value={leftUrl}
                    onChange={(event) => setLeftUrl(event.target.value)}
                    disabled={isLoading}
                    className="h-16 w-full border-0 bg-white px-4 text-[13px] text-[#202123] outline-none placeholder:text-[13px] placeholder:text-[#a5a7ab] disabled:cursor-not-allowed disabled:text-[#9aa0a6] sm:h-[68px] sm:px-5 sm:text-[14px] sm:placeholder:text-[14px]"
                  />
                </label>
                <label className="flex flex-col bg-white">
                  <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#f4f4f4] px-4 py-2 text-[13px] font-medium text-[#6b6f76]">
                    <Link2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    链接 B
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="https://example.org 或 http://localhost:3000"
                    value={rightUrl}
                    onChange={(event) => setRightUrl(event.target.value)}
                    disabled={isLoading}
                    className="h-16 w-full border-0 bg-white px-4 text-[13px] text-[#202123] outline-none placeholder:text-[13px] placeholder:text-[#a5a7ab] disabled:cursor-not-allowed disabled:text-[#9aa0a6] sm:h-[68px] sm:px-5 sm:text-[14px] sm:placeholder:text-[14px]"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] bg-[#f4f4f4] px-3 py-2.5 sm:px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="grid h-8 grid-cols-2 rounded-full bg-black/[0.06] p-0.5 text-[12px] font-medium text-[#7a7d82] sm:text-[13px]">
                    <button
                      type="button"
                      onClick={() => setMode('external')}
                      disabled={isLoading}
                      aria-pressed={mode === 'external'}
                      className={`inline-flex min-w-[78px] items-center justify-center gap-1.5 rounded-full px-2.5 transition ${
                        mode === 'external'
                          ? 'bg-white text-[#202123] shadow-[0_1px_3px_rgba(0,0,0,0.14)]'
                          : 'hover:text-[#202123]'
                      }`}
                    >
                      <Globe2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                      外网
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('internal')}
                      disabled={isLoading}
                      aria-pressed={mode === 'internal'}
                      className={`inline-flex min-w-[78px] items-center justify-center gap-1.5 rounded-full px-2.5 transition ${
                        mode === 'internal'
                          ? 'bg-white text-[#202123] shadow-[0_1px_3px_rgba(0,0,0,0.14)]'
                          : 'hover:text-[#202123]'
                      }`}
                    >
                      <Server className="h-3.5 w-3.5" strokeWidth={1.8} />
                      内网
                    </button>
                  </div>
                  <div className="grid h-8 grid-cols-2 rounded-full bg-black/[0.06] p-0.5 text-[12px] font-medium text-[#7a7d82] sm:text-[13px]">
                    {(['mobile', 'desktop'] as const).map((item) => {
                      const Icon = item === 'mobile' ? Smartphone : Monitor;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setStrategy(item)}
                          disabled={isLoading}
                          className={`inline-flex min-w-[80px] items-center justify-center gap-1.5 rounded-full px-2.5 transition ${
                            strategy === item
                              ? 'bg-white text-[#202123] shadow-[0_1px_3px_rgba(0,0,0,0.14)]'
                              : 'hover:text-[#202123]'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                          {strategyLabel(item)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isLoading && (
                    <button
                      type="button"
                      onClick={cancelCompare}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-black/10 px-3 text-[13px] font-medium text-[#5f6368] hover:bg-white transition"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                      取消
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#202123] text-white shadow-[0_1px_6px_rgba(0,0,0,0.22)] transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#b9bdc3]"
                    aria-label={isLoading ? '分析中' : '发送'}
                  >
                    <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </form>
          </div>

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
                    {leftLabel} vs {rightLabel} · {modeLabel(mode)} · {strategyLabel(result.left.summary.strategy)} ·{' '}
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
