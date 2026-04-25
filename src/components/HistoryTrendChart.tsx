'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import type { MetricSnapshot } from '@/lib/pagespeed';

echarts.use([GridComponent, LegendComponent, TooltipComponent, LineChart, CanvasRenderer]);

type Run = {
  id: string;
  createdAt: string;
  metrics: MetricSnapshot;
};

type HistoryTrendChartProps = {
  runs: Run[];
};

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function HistoryTrendChart({ runs }: HistoryTrendChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    const orderedRuns = runs.slice().reverse();
    const labels = orderedRuns.map((run) => formatTime(run.createdAt));

    chart.setOption({
      color: ['#111111', '#10a37f', '#f59e0b', '#e11d48'],
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#111111',
        borderWidth: 0,
        textStyle: { color: '#ffffff' },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 16,
        itemHeight: 8,
        textStyle: { color: '#57534e' },
      },
      grid: {
        top: 44,
        right: 24,
        bottom: 28,
        left: 42,
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#e7e5e4' } },
        axisLabel: { color: '#78716c' },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        axisLabel: { color: '#78716c' },
        splitLine: { lineStyle: { color: '#f5f5f4' } },
      },
      series: [
        {
          name: 'Score',
          type: 'line',
          smooth: true,
          data: orderedRuns.map((run) => run.metrics.score),
          symbolSize: 7,
        },
        {
          name: 'LCP (s)',
          type: 'line',
          smooth: true,
          data: orderedRuns.map((run) => (run.metrics.lcp === null ? null : Number((run.metrics.lcp / 1000).toFixed(2)))),
          symbolSize: 7,
        },
        {
          name: 'TBT (100ms)',
          type: 'line',
          smooth: true,
          data: orderedRuns.map((run) => (run.metrics.tbt === null ? null : Number((run.metrics.tbt / 100).toFixed(2)))),
          symbolSize: 7,
        },
        {
          name: 'CLS (x100)',
          type: 'line',
          smooth: true,
          data: orderedRuns.map((run) => (run.metrics.cls === null ? null : Number((run.metrics.cls * 100).toFixed(2)))),
          symbolSize: 7,
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [runs]);

  return <div ref={ref} className="h-[360px] w-full" />;
}
