import { Clock3, Gauge, LayoutDashboard, TimerReset } from 'lucide-react';
import type { ComponentType } from 'react';
import type { ActionItem, AuditItem, MetricKey, MetricSnapshot } from '@/lib/pagespeed';
import { metricRating } from '@/lib/pagespeed';

type KeyResultsProps = {
  actions: ActionItem[];
  metrics: MetricSnapshot;
  opportunities: AuditItem[];
};

type IconProps = {
  className?: string;
  strokeWidth?: number;
};

const keyMetrics: { key: MetricKey; label: string; unit: string; helper: string; Icon: ComponentType<IconProps> }[] = [
  { key: 'score', label: 'Performance', unit: '', helper: 'Lighthouse 综合评分', Icon: Gauge },
  { key: 'lcp', label: 'LCP', unit: 's', helper: '最大内容绘制耗时', Icon: Clock3 },
  { key: 'cls', label: 'CLS', unit: '', helper: '页面视觉稳定性', Icon: LayoutDashboard },
  { key: 'tbt', label: 'TBT', unit: 'ms', helper: '主线程阻塞时间', Icon: TimerReset },
];

function formatMetric(key: MetricKey, value: number | null, unit: string): string {
  if (value === null) return '-';
  if (unit === 's') return `${(value / 1000).toFixed(2)}s`;
  if (unit === 'ms') return `${Math.round(value)}ms`;
  if (key === 'cls') return value.toFixed(3);
  return String(Math.round(value));
}

function statusText(rating: ReturnType<typeof metricRating>): string {
  if (rating === 'good') return '良好';
  if (rating === 'needs-work') return '待优化';
  if (rating === 'poor') return '较差';
  return '无数据';
}

function statusClass(rating: ReturnType<typeof metricRating>): string {
  if (rating === 'good') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (rating === 'needs-work') return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (rating === 'poor') return 'bg-rose-50 text-rose-700 ring-rose-200';
  return 'bg-black/[0.04] text-[#777773] ring-black/10';
}

function impactClass(impact: ActionItem['impact']): string {
  if (impact === 'high') return 'text-rose-700 bg-rose-50 ring-rose-200';
  if (impact === 'medium') return 'text-amber-700 bg-amber-50 ring-amber-200';
  return 'text-stone-600 bg-stone-100 ring-stone-200';
}

function impactText(impact: ActionItem['impact']): string {
  if (impact === 'high') return '高优先级';
  if (impact === 'medium') return '中优先级';
  return '低优先级';
}

export default function KeyResults({ actions, metrics, opportunities }: KeyResultsProps) {
  const topActions = actions.slice(0, 3);
  const topOpportunity = opportunities[0];

  return (
    <div className="grid gap-5">
      <section className="grid gap-px overflow-hidden rounded-[18px] border border-black/10 bg-black/[0.08] md:grid-cols-4">
        {keyMetrics.map(({ key, label, unit, helper, Icon }) => {
          const rating = metricRating(key, metrics[key]);
          return (
            <article key={key} className="bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[14px] text-[#777773]">
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                  {label}
                </div>
                <span className={`rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${statusClass(rating)}`}>
                  {statusText(rating)}
                </span>
              </div>
              <p className="mt-5 text-[34px] font-semibold leading-none tracking-normal text-[#1f1f1f]">
                {formatMetric(key, metrics[key], unit)}
              </p>
              <p className="mt-2 text-[13px] text-[#8a8a86]">{helper}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-[18px] border border-black/10 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-semibold text-[#1f1f1f]">下一步优先处理</h2>
            <p className="mt-1 text-[14px] text-[#8a8a86]">只保留最可能推动分数变化的少量行动项。</p>
          </div>
          {topOpportunity?.displayValue && (
            <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[13px] text-[#666662]">
              最大节省：{topOpportunity.displayValue}
            </span>
          )}
        </div>

        <div className="mt-5 grid gap-3">
          {topActions.length === 0 ? (
            <div className="rounded-[14px] bg-black/[0.03] p-4 text-[14px] text-[#666662]">
              本次没有返回高影响性能问题。
            </div>
          ) : (
            topActions.map((action, index) => (
              <article
                key={`${action.title}-${action.metric}`}
                className="grid gap-3 rounded-[14px] border border-black/[0.08] p-4 md:grid-cols-[40px_1fr_auto]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1f1f1f] text-[14px] font-medium text-white">
                  {index + 1}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-[#1f1f1f]">{action.title}</h3>
                    <span className="text-[13px] text-[#9f9f9a]">· {action.metric}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[14px] leading-6 text-[#666662]">{action.reason}</p>
                </div>
                <span className={`h-fit rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${impactClass(action.impact)}`}>
                  {impactText(action.impact)}
                </span>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
