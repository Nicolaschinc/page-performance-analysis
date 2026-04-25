'use client';

import {
  ArrowUp,
  Globe2,
  Laptop,
  Server,
  Smartphone,
} from 'lucide-react';
import { useState } from 'react';
import type { AnalyzeMode, Strategy } from '@/lib/pagespeed';

type SearchFormProps = {
  onSubmit: (url: string, strategy: Strategy, mode: AnalyzeMode) => void;
  isLoading: boolean;
  initialUrl?: string;
  initialStrategy?: Strategy;
  initialMode?: AnalyzeMode;
};

export default function SearchForm({
  onSubmit,
  isLoading,
  initialUrl = '',
  initialStrategy = 'mobile',
  initialMode = 'external',
}: SearchFormProps) {
  const [url, setUrl] = useState(initialUrl);
  const [strategy, setStrategy] = useState<Strategy>(initialStrategy);
  const [mode, setMode] = useState<AnalyzeMode>(initialMode);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim() || isLoading) return;
    onSubmit(url.trim(), strategy, mode);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[760px] overflow-hidden rounded-[20px] border border-black/[0.08] bg-white shadow-[0_10px_26px_rgba(0,0,0,0.06)]"
    >
      <label className="sr-only" htmlFor="url">
        分析链接
      </label>
      <input
        id="url"
        type="text"
        inputMode="url"
        required
        placeholder="输入或粘贴要分析的 URL"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        disabled={isLoading}
        className="h-16 w-full border-0 bg-white px-4 text-[13px] text-[#202123] outline-none placeholder:text-[13px] placeholder:text-[#a5a7ab] disabled:cursor-not-allowed disabled:text-[#9aa0a6] sm:h-[68px] sm:px-5 sm:text-[14px] sm:placeholder:text-[14px]"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] bg-[#f4f4f4] px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="grid h-8 grid-cols-2 rounded-full bg-black/[0.06] p-0.5 text-[12px] font-medium text-[#7a7d82] sm:text-[13px]">
            <button
              type="button"
              onClick={() => setMode('external')}
              disabled={isLoading}
              aria-pressed={mode === 'external'}
              className={`inline-flex min-w-[78px] items-center justify-center gap-1.5 rounded-full px-2.5 transition ${
                mode === 'external' ? 'bg-white text-[#202123] shadow-[0_1px_3px_rgba(0,0,0,0.14)]' : 'hover:text-[#202123]'
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
                mode === 'internal' ? 'bg-white text-[#202123] shadow-[0_1px_3px_rgba(0,0,0,0.14)]' : 'hover:text-[#202123]'
              }`}
            >
              <Server className="h-3.5 w-3.5" strokeWidth={1.8} />
              内网
            </button>
          </div>

          <div className="grid h-8 grid-cols-2 rounded-full bg-black/[0.06] p-0.5 text-[12px] font-medium text-[#7a7d82] sm:text-[13px]">
            <button
              type="button"
              onClick={() => setStrategy('mobile')}
              disabled={isLoading}
              aria-pressed={strategy === 'mobile'}
              className={`inline-flex min-w-[80px] items-center justify-center gap-1.5 rounded-full px-2.5 transition ${
                strategy === 'mobile' ? 'bg-white text-[#202123] shadow-[0_1px_3px_rgba(0,0,0,0.14)]' : 'hover:text-[#202123]'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" strokeWidth={1.8} />
              移动端
            </button>
            <button
              type="button"
              onClick={() => setStrategy('desktop')}
              disabled={isLoading}
              aria-pressed={strategy === 'desktop'}
              className={`inline-flex min-w-[80px] items-center justify-center gap-1.5 rounded-full px-2.5 transition ${
                strategy === 'desktop' ? 'bg-white text-[#202123] shadow-[0_1px_3px_rgba(0,0,0,0.14)]' : 'hover:text-[#202123]'
              }`}
            >
              <Laptop className="h-3.5 w-3.5" strokeWidth={1.8} />
              桌面端
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#202123] text-white shadow-[0_1px_6px_rgba(0,0,0,0.22)] transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#b9bdc3]"
          aria-label={isLoading ? '正在分析' : '开始分析链接'}
        >
          <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
