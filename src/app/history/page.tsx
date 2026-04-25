'use client';

import { Filter, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CodexShell from '@/components/CodexShell';
import HistoryTrendChart from '@/components/HistoryTrendChart';
import type { MetricSnapshot, Strategy } from '@/lib/pagespeed';

type Run = {
  id: string;
  url: string;
  finalUrl: string | null;
  strategy: Strategy;
  createdAt: string;
  metrics: MetricSnapshot;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatSeconds(value: number | null): string {
  return value === null ? '-' : `${(value / 1000).toFixed(2)}s`;
}

function strategyLabel(strategy: Strategy): string {
  return strategy === 'desktop' ? '桌面端' : '移动端';
}

export default function HistoryPage() {
  const [url, setUrl] = useState('');
  const [strategy, setStrategy] = useState<Strategy>('mobile');
  const [runs, setRuns] = useState<Run[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      setUrl(params.get('url') ?? '');
      setStrategy(params.get('strategy') === 'desktop' ? 'desktop' : 'mobile');
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchHistory() {
      setIsLoading(true);
      setError('');
      try {
        const query = new URLSearchParams();
        if (url) query.set('url', url);
        query.set('strategy', strategy);
        const response = await fetch(`/api/history?${query.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? '加载历史失败。');
        setRuns(data.runs ?? []);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught.message : '加载历史失败。');
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
    return () => controller.abort();
  }, [url, strategy]);

  const latest = runs[0];
  const headline = useMemo(() => {
    if (url) return url;
    if (latest) return latest.finalUrl ?? latest.url;
    return '历史';
  }, [latest, url]);

  return (
    <CodexShell active="history">
      <main className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6">
        <div className="mx-auto grid w-full max-w-[1100px] gap-6">
          <section className="max-w-[760px]">
            <p className="text-[13px] font-medium uppercase tracking-wide text-[#9a9a96]">历史</p>
            <h1 className="mt-3 text-[34px] font-semibold leading-tight tracking-normal text-[#1f1f1f]">{headline}</h1>
            <p className="mt-3 text-[15px] leading-6 text-[#777773]">
              查看多次 PageSpeed 运行后的 Score 和 Core Web Vitals 趋势。
            </p>
          </section>

          <section className="grid gap-3 rounded-[18px] border border-black/10 bg-white p-3 md:grid-cols-[1fr_auto_auto]">
            <label className="flex h-11 items-center gap-2 rounded-xl bg-black/[0.04] px-3 focus-within:bg-white focus-within:ring-1 focus-within:ring-black/10">
              <Filter className="h-4 w-4 text-[#8a8a86]" strokeWidth={1.8} />
              <input
                type="url"
                placeholder="按 URL 筛选"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
              />
            </label>
            <div className="grid h-11 grid-cols-2 rounded-full bg-black/[0.06] p-1">
              {(['mobile', 'desktop'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStrategy(item)}
                  className={`rounded-full px-4 text-[14px] font-medium capitalize ${
                    strategy === item ? 'bg-white text-[#1f1f1f] shadow-sm' : 'text-[#777773]'
                  }`}
                >
                  {strategyLabel(item)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setUrl('')}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/10 px-4 text-[14px] font-medium text-[#666662] hover:bg-black/[0.04]"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.8} />
              显示全部
            </button>
          </section>

          {error && <p className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-800">{error}</p>}

          <section className="rounded-[18px] border border-black/10 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[20px] font-semibold">趋势</h2>
                <p className="mt-1 text-[14px] text-[#8a8a86]">
                  {isLoading ? '正在加载历史...' : `${runs.length} 条已保存记录`}
                </p>
              </div>
              {latest && (
                <div className="rounded-full bg-black/[0.04] px-3 py-1 text-[14px] text-[#666662]">
                  最新 Score {latest.metrics.score ?? '-'}
                </div>
              )}
            </div>
            {runs.length > 0 ? (
              <div className="mt-5">
                <HistoryTrendChart runs={runs} />
              </div>
            ) : (
              <p className="mt-5 rounded-[14px] bg-black/[0.03] p-5 text-[14px] text-[#777773]">
                还没有历史记录。请先从首页运行一次分析。
              </p>
            )}
          </section>

          {runs.length > 0 && (
            <section className="overflow-hidden rounded-[18px] border border-black/10 bg-white">
              <div className="border-b border-black/[0.06] p-5">
                <h2 className="text-[20px] font-semibold">已保存记录</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[14px]">
                  <thead className="bg-black/[0.03] text-[12px] uppercase text-[#8a8a86]">
                    <tr>
                      <th className="px-5 py-3 font-medium">日期</th>
                      <th className="px-5 py-3 font-medium">URL</th>
                      <th className="px-5 py-3 font-medium">Score</th>
                      <th className="px-5 py-3 font-medium">LCP</th>
                      <th className="px-5 py-3 font-medium">CLS</th>
                      <th className="px-5 py-3 font-medium">TBT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06]">
                    {runs.map((run) => (
                      <tr key={run.id}>
                        <td className="px-5 py-4 text-[#666662]">{formatDate(run.createdAt)}</td>
                        <td className="max-w-[300px] truncate px-5 py-4 text-[#666662]">{run.finalUrl ?? run.url}</td>
                        <td className="px-5 py-4 font-medium text-[#1f1f1f]">{run.metrics.score ?? '-'}</td>
                        <td className="px-5 py-4 text-[#666662]">{formatSeconds(run.metrics.lcp)}</td>
                        <td className="px-5 py-4 text-[#666662]">{run.metrics.cls?.toFixed(3) ?? '-'}</td>
                        <td className="px-5 py-4 text-[#666662]">
                          {run.metrics.tbt === null ? '-' : `${Math.round(run.metrics.tbt)}ms`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>
    </CodexShell>
  );
}
