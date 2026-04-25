'use client';

import { ArrowUp, Monitor, Plus, Smartphone } from 'lucide-react';
import { useState } from 'react';
import type { Strategy } from '@/lib/pagespeed';

type SearchFormProps = {
  onSubmit: (url: string, strategy: Strategy) => void;
  isLoading: boolean;
};

export default function SearchForm({ onSubmit, isLoading }: SearchFormProps) {
  const [url, setUrl] = useState('');
  const [strategy, setStrategy] = useState<Strategy>('mobile');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim() || isLoading) return;
    onSubmit(url.trim(), strategy);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-[22px] border border-black/10 bg-white shadow-[0_18px_70px_rgba(0,0,0,0.08)]"
    >
      <label className="sr-only" htmlFor="url">
        URL
      </label>
      <input
        id="url"
        type="url"
        required
        placeholder="粘贴一个公开 URL 进行分析"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        disabled={isLoading}
        className="h-16 w-full border-0 bg-white px-5 text-[16px] text-[#1f1f1f] outline-none placeholder:text-[#b7b7b2] disabled:cursor-not-allowed disabled:text-[#9b9b96]"
      />

      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] bg-[#f7f7f4] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#777773] hover:bg-black/[0.06]"
            aria-label="添加 URL"
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
          <div className="grid h-8 grid-cols-2 rounded-full bg-black/[0.06] p-0.5">
            {(['mobile', 'desktop'] as const).map((item) => {
              const Icon = item === 'mobile' ? Smartphone : Monitor;
              const label = item === 'mobile' ? '移动端' : '桌面端';
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStrategy(item)}
                  disabled={isLoading}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-medium capitalize transition ${
                    strategy === item ? 'bg-white text-[#1f1f1f] shadow-sm' : 'text-[#777773] hover:text-[#1f1f1f]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] text-[#8a8a86] sm:inline">Google PSI v5</span>
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8f8f8b] text-white transition hover:bg-[#1f1f1f] disabled:cursor-not-allowed disabled:bg-[#d2d2ce]"
            aria-label={isLoading ? '正在分析' : '开始分析 URL'}
          >
            <ArrowUp className="h-5 w-5" strokeWidth={1.9} />
          </button>
        </div>
      </div>
    </form>
  );
}
