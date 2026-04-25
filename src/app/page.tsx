'use client';

import { useRouter } from 'next/navigation';
import CodexShell from '@/components/CodexShell';
import SearchForm from '@/components/SearchForm';
import type { AnalyzeMode, Strategy } from '@/lib/pagespeed';

export default function Home() {
  const router = useRouter();

  function handleAnalyze(url: string, strategy: Strategy, mode: AnalyzeMode) {
    const query = new URLSearchParams({ mode, strategy, url });
    router.push(`/analyze?${query.toString()}`);
  }

  return (
    <CodexShell active="analyze">
      <main className="min-h-screen bg-white px-4 py-6 sm:px-6 lg:py-10">
        <div className="mx-auto grid w-full max-w-[1050px] min-h-[calc(100vh-7rem)] content-center gap-6 pb-10">
          <section className="grid justify-items-center gap-8">
            <h1 className="max-w-[760px] text-center text-[24px] font-semibold leading-[1.16] tracking-normal text-[#202123] sm:text-[30px] lg:text-[34px]">
              你想分析哪个页面？
            </h1>
            <SearchForm onSubmit={handleAnalyze} isLoading={false} />
          </section>
        </div>
      </main>
    </CodexShell>
  );
}
