'use client';

import {
  GitCompare,
  Menu,
  PenLine,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useState, type ComponentType, type ReactNode } from 'react';

type CodexShellProps = {
  active: 'analyze' | 'compare' | 'history' | 'none';
  children: ReactNode;
  title?: string;
};

type IconProps = {
  className?: string;
  strokeWidth?: number;
};

type NavItem = {
  href: string;
  label: string;
  active: Exclude<CodexShellProps['active'], 'none'>;
  Icon: ComponentType<IconProps>;
};

const sidebarItems: NavItem[] = [
  { href: '/', label: '新建分析', active: 'analyze', Icon: PenLine },
  { href: '/compare', label: '性能对比', active: 'compare', Icon: GitCompare },
  { href: '/history', label: '历史记录', active: 'history', Icon: Search },
];

export default function CodexShell({ active, children, title = '性能优化AI' }: CodexShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeItem = sidebarItems.find((item) => item.active === active);

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-[#202123]">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] lg:hidden"
          aria-label="收起侧边栏"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-black/[0.08] bg-[#f7f7f4] px-3 py-3 transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="mb-2 flex h-11 items-center justify-between gap-2 px-2">
            <Link
              href="/"
              onClick={() => setSidebarOpen(false)}
              className="flex min-w-0 items-center gap-2 text-[#202123]"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#202123] text-white">
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="truncate text-[14px] font-semibold">{title}</span>
            </Link>
            <button
              type="button"
              aria-label="收起侧边栏"
              onClick={() => setSidebarOpen(false)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#5f6368] transition hover:bg-black/[0.06] lg:hidden"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>

          <nav className="grid gap-1 text-[14px]" aria-label="主导航">
            {sidebarItems.map((item) => {
              const Icon = item.Icon;
              const isActive = active === item.active;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex h-10 items-center gap-3 rounded-lg px-3 transition ${
                    isActive
                      ? 'bg-[#ececec] font-medium text-[#202123]'
                      : 'text-[#5f6368] hover:bg-black/[0.05] hover:text-[#202123]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 bg-white">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-black/[0.06] bg-white/90 px-3 backdrop-blur lg:hidden">
            <button
              type="button"
              aria-label="展开侧边栏"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#4c4f54] transition hover:bg-black/[0.05]"
            >
              <Menu className="h-5 w-5" strokeWidth={1.9} />
            </button>
            <div className="min-w-0 truncate text-[15px] font-medium text-[#202123]">
              {activeItem?.label ?? title}
            </div>
          </header>

          {children}
        </section>
      </div>
    </div>
  );
}
