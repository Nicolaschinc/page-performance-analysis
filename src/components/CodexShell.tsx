'use client';

import {
  GitCompare,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeItem = sidebarItems.find((item) => item.active === active);
  const ToggleIcon = sidebarCollapsed ? PanelLeftOpen : PanelLeftClose;

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
      <div className="min-h-screen lg:flex">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-black/[0.08] bg-[#f7f7f4] px-3 py-3 shadow-2xl shadow-black/10 transition-[transform,width,padding] duration-300 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:overflow-visible lg:shadow-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${sidebarCollapsed ? 'lg:w-[76px] lg:px-2' : 'lg:w-[280px] lg:px-3'
          }`}
        >
          <div
            className={`mb-2 flex items-center justify-between gap-2 px-2 transition-[height,padding] duration-300 ${
              sidebarCollapsed ? 'lg:h-14 lg:justify-center lg:px-0' : 'h-11'
            }`}
          >
            <Link
              href="/"
              onClick={() => setSidebarOpen(false)}
              aria-label={title}
              className={`flex min-w-0 items-center gap-2 text-[#202123] transition-all duration-300 ${
                sidebarCollapsed ? 'lg:w-10 lg:justify-center' : 'lg:w-auto'
              }`}
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#202123] text-white shadow-sm transition-transform duration-300 hover:scale-105">
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span
                className={`truncate text-[14px] font-semibold transition-[opacity,width,transform] duration-300 ${
                  sidebarCollapsed
                    ? 'lg:w-0 lg:translate-x-1 lg:opacity-0'
                    : 'lg:w-auto lg:translate-x-0 lg:opacity-100'
                }`}
              >
                {title}
              </span>
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
          <button
            type="button"
            aria-label={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            aria-pressed={sidebarCollapsed}
            title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#5f6368] transition-[background-color,box-shadow,color,transform] duration-300 ease-out hover:text-[#202123] active:scale-95 lg:absolute lg:right-5 lg:top-4 lg:inline-flex ${
              sidebarCollapsed
                ? 'lg:translate-x-[67px] lg:translate-y-1.5 lg:bg-white lg:shadow-[0_10px_28px_rgba(15,23,42,0.12)] lg:ring-1 lg:ring-black/[0.08] lg:hover:bg-[#f8f8f7] lg:hover:shadow-[0_12px_30px_rgba(15,23,42,0.14)]'
                : 'lg:translate-x-0 lg:translate-y-0 lg:bg-transparent lg:hover:bg-black/[0.06]'
            }`}
          >
            <ToggleIcon className="h-[18px] w-[18px] transition-transform duration-300" strokeWidth={1.9} />
          </button>

          <nav className="grid gap-1 text-[14px]" aria-label="主导航">
            {sidebarItems.map((item) => {
              const Icon = item.Icon;
              const isActive = active === item.active;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  title={sidebarCollapsed ? item.label : undefined}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex h-10 items-center gap-3 rounded-lg px-3 transition-[background,color,padding] duration-200 ${
                    isActive
                      ? 'bg-[#ececec] font-medium text-[#202123]'
                      : 'text-[#5f6368] hover:bg-black/[0.05] hover:text-[#202123]'
                  } ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : 'lg:justify-start lg:px-3'}`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                      isActive ? 'text-[#202123]' : 'group-hover:scale-105'
                    }`}
                    strokeWidth={1.9}
                  />
                  <span
                    className={`truncate transition-[opacity,width,transform] duration-300 ${
                      sidebarCollapsed
                        ? 'lg:w-0 lg:translate-x-2 lg:opacity-0'
                        : 'lg:w-auto lg:translate-x-0 lg:opacity-100'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 flex-1 bg-white">
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
