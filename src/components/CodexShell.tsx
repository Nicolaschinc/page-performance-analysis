import {
  BarChart3,
  Clock3,
  Folder,
  Gauge,
  MonitorDot,
  PenLine,
  Search,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';

type CodexShellProps = {
  active: 'analyze' | 'history';
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
  active: 'analyze' | 'history';
  Icon: ComponentType<IconProps>;
};

const navItems: NavItem[] = [
  { href: '/', label: '分析', active: 'analyze', Icon: Gauge },
  { href: '/history', label: '历史', active: 'history', Icon: BarChart3 },
];

const projectItems = ['page-performance', '实验报告', '监控网址'];

export default function CodexShell({ active, children, title = 'page-performance' }: CodexShellProps) {
  return (
    <div className="min-h-screen bg-[#f2f3f2] text-[#1f1f1f]">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="hidden min-h-screen border-r border-black/5 bg-[#f2f3f2] px-4 py-5 lg:flex lg:flex-col">
          <div className="mb-7 flex items-center gap-2 px-1" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#d9d9d7]" />
            <span className="h-3 w-3 rounded-full bg-[#d9d9d7]" />
            <span className="h-3 w-3 rounded-full bg-[#d9d9d7]" />
          </div>

          <nav className="grid gap-1 text-[15px] text-[#555553]" aria-label="主导航">
            <Link href="/" className="flex h-10 items-center gap-3 rounded-lg px-2 hover:bg-black/[0.04]">
              <PenLine className="h-[18px] w-[18px]" strokeWidth={1.8} />
              新建分析
            </Link>
            <Link href="/history" className="flex h-10 items-center gap-3 rounded-lg px-2 hover:bg-black/[0.04]">
              <Search className="h-[18px] w-[18px]" strokeWidth={1.8} />
              搜索历史
            </Link>
            <div className="flex h-10 items-center gap-3 rounded-lg px-2 text-[#777773]">
              <MonitorDot className="h-[18px] w-[18px]" strokeWidth={1.8} />
              PageSpeed
            </div>
            <div className="flex h-10 items-center gap-3 rounded-lg px-2 text-[#777773]">
              <Clock3 className="h-[18px] w-[18px]" strokeWidth={1.8} />
              自动任务
            </div>
          </nav>

          <div className="mt-8">
            <div className="mb-2 px-2 text-[13px] font-medium text-[#9a9a96]">项目</div>
            <div className="grid gap-1 text-[15px] text-[#626260]">
              {projectItems.map((item, index) => (
                <div
                  key={item}
                  className={`flex h-10 items-center gap-3 rounded-lg px-2 ${
                    index === 0 ? 'bg-black/[0.04] font-medium text-[#3b3b39]' : 'text-[#8a8a86]'
                  }`}
                >
                  <Folder className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-2 px-2 text-[13px] font-medium text-[#9a9a96]">工作区</div>
            <div className="grid gap-1 text-[15px] text-[#626260]">
              {navItems.map((item) => {
                const Icon = item.Icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex h-10 items-center gap-3 rounded-lg px-2 ${
                      active === item.active ? 'bg-white text-[#2b2b29] shadow-sm' : 'hover:bg-black/[0.04]'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-auto flex h-10 items-center gap-3 rounded-lg px-2 text-[15px] text-[#626260]">
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} />
            设置
          </div>
        </aside>

        <section className="min-w-0 bg-white lg:my-0 lg:rounded-l-[18px] lg:border-l lg:border-black/10">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-black/[0.04] bg-white/90 px-4 backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-[15px] font-medium lg:hidden">
                {title}
              </Link>
              <span className="hidden text-[15px] font-medium text-[#6f6f6b] lg:inline">{title}</span>
            </div>
            <div className="flex items-center gap-2 text-[14px] text-[#4c4c49]">
              {navItems.map((item) => {
                const Icon = item.Icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                      active === item.active
                        ? 'border-black/10 bg-[#f7f7f4] text-[#1f1f1f]'
                        : 'border-transparent hover:border-black/10 hover:bg-[#f7f7f4]'
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </header>

          {children}
        </section>
      </div>
    </div>
  );
}
