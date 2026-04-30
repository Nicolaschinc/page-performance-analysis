'use client';

import { AlertCircle, Bot, Check, Clipboard, FileJson, LoaderCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { AiOptimizationBriefResult, BriefFormat } from '@/lib/ai-optimizer';
import type { MetricSnapshot, PageSpeedSummary } from '@/lib/pagespeed';

type AiBriefPanelProps = {
  summary: PageSpeedSummary;
  previous: {
    id: string;
    createdAt: string;
    metrics: MetricSnapshot;
  } | null;
};

type CopyTarget = 'brief' | 'context' | null;

const briefFormats: { value: BriefFormat; label: string }[] = [
  { value: 'codex', label: 'Codex' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'github-issue', label: 'GitHub Issue' },
  { value: 'markdown', label: 'Markdown' },
];

function providerLabel(result: AiOptimizationBriefResult): string {
  if (result.provider === 'deepseek') return `DeepSeek · ${result.model ?? 'unknown model'}`;
  if (result.provider === 'openai') return `OpenAI · ${result.model ?? 'unknown model'}`;
  if (result.fallbackReason === 'missing-api-key') return '本地 fallback · 缺少 API Key';
  if (result.fallbackReason === 'empty-response') return '本地 fallback · AI 返回为空';
  return '本地 fallback · AI 调用失败';
}

export default function AiBriefPanel({ summary, previous }: AiBriefPanelProps) {
  const [format, setFormat] = useState<BriefFormat>('codex');
  const [goal, setGoal] = useState('');
  const [result, setResult] = useState<AiOptimizationBriefResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<CopyTarget>(null);

  async function generateBrief() {
    if (isLoading) return;
    setIsLoading(true);
    setError('');
    setCopied(null);

    try {
      const response = await fetch('/api/ai/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          previous,
          goal: goal.trim() || undefined,
          format,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'AI Brief 生成失败。');
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI Brief 生成失败。');
    } finally {
      setIsLoading(false);
    }
  }

  async function copyText(target: CopyTarget, value: string | undefined) {
    if (!target || !value) return;
    await navigator.clipboard.writeText(value);
    setCopied(target);
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <section className="rounded-[18px] border border-black/10 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[14px] font-medium text-[#202123]">
            <Bot className="h-4 w-4" strokeWidth={1.8} />
            AI 优化 Brief
          </div>
          <h2 className="mt-2 text-[20px] font-semibold text-[#1f1f1f]">把 Lighthouse 结果变成 AI 上下文包</h2>
          <p className="mt-1 max-w-[720px] text-[14px] leading-6 text-[#777773]">
            生成可直接交给 AI 编程工具的优化指令，同时保留压缩后的 Lighthouse 证据、历史记忆和验证策略。
          </p>
        </div>
        {result && (
          <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[13px] text-[#666662]">
            {providerLabel(result)}
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-2">
          <div className="text-[13px] font-medium text-[#4c4f54]">输出格式</div>
          <div className="flex flex-wrap gap-2">
            {briefFormats.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFormat(item.value)}
                disabled={isLoading}
                className={`h-9 rounded-full px-3 text-[13px] font-medium transition ${
                  format === item.value
                    ? 'bg-[#202123] text-white'
                    : 'border border-black/[0.08] text-[#666662] hover:bg-black/[0.04]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-[13px] font-medium text-[#4c4f54]">本轮优化目标</span>
          <input
            type="text"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            disabled={isLoading}
            placeholder="例如：本轮只优化移动端 LCP，不改业务逻辑"
            className="h-11 rounded-xl border border-black/[0.08] bg-white px-3 text-[14px] text-[#202123] outline-none transition placeholder:text-[#a5a7ab] focus:border-black/[0.18] disabled:text-[#9aa0a6]"
          />
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-[14px] border border-rose-200 bg-rose-50 p-3 text-[14px] text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={generateBrief}
            disabled={isLoading}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#202123] px-4 text-[14px] font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#b9bdc3]"
          >
            {isLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} />
            ) : (
              <Sparkles className="h-4 w-4" strokeWidth={1.8} />
            )}
            {isLoading ? '生成中' : '生成 AI Brief'}
          </button>
          <button
            type="button"
            onClick={() => copyText('brief', result?.content)}
            disabled={!result?.content}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.1] px-4 text-[14px] font-medium text-[#666662] transition hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:text-[#b0b3b8]"
          >
            {copied === 'brief' ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            复制 Brief
          </button>
          <button
            type="button"
            onClick={() => copyText('context', result?.contextPackage)}
            disabled={!result?.contextPackage}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.1] px-4 text-[14px] font-medium text-[#666662] transition hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:text-[#b0b3b8]"
          >
            {copied === 'context' ? <Check className="h-4 w-4" /> : <FileJson className="h-4 w-4" />}
            复制上下文包
          </button>
        </div>

        {result && (
          <div className="grid gap-3">
            {result.error && (
              <p className="rounded-[14px] bg-amber-50 p-3 text-[13px] leading-6 text-amber-800">
                AI 调用没有完成，已返回本地规则兜底版。错误：{result.error}
              </p>
            )}
            <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-[14px] bg-[#111111] p-4 text-[13px] leading-6 text-[#f6f3ea]">
              {result.content}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}
