'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import type { MetricKey, PageSpeedSummary } from '@/lib/pagespeed';

echarts.use([GridComponent, LegendComponent, TooltipComponent, BarChart, CanvasRenderer]);

type PerformanceCompareChartProps = {
  leftLabel: string;
  leftSummary: PageSpeedSummary;
  rightLabel: string;
  rightSummary: PageSpeedSummary;
};

type ChartMetric = {
  key: MetricKey;
  label: string;
  scale: number;
};

const chartMetrics: ChartMetric[] = [
  { key: 'score', label: 'Score', scale: 1 },
  { key: 'lcp', label: 'LCP (s)', scale: 1000 },
  { key: 'fcp', label: 'FCP (s)', scale: 1000 },
  { key: 'tbt', label: 'TBT (100ms)', scale: 100 },
  { key: 'cls', label: 'CLS (x100)', scale: 0.01 },
  { key: 'speedIndex', label: 'SI (s)', scale: 1000 },
];

function chartValue(summary: PageSpeedSummary, metric: ChartMetric): number | null {
  const value = summary.metrics[metric.key];
  if (value === null) return null;
  return Number((value / metric.scale).toFixed(2));
}

export default function PerformanceCompareChart({
  leftLabel,
  leftSummary,
  rightLabel,
  rightSummary,
}: PerformanceCompareChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' });

    chart.setOption({
      color: ['#111111', '#10a37f'],
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#111111',
        borderWidth: 0,
        textStyle: { color: '#ffffff' },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 14,
        itemHeight: 8,
        textStyle: { color: '#57534e' },
      },
      grid: {
        top: 48,
        right: 18,
        bottom: 34,
        left: 38,
      },
      xAxis: {
        type: 'category',
        data: chartMetrics.map((metric) => metric.label),
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
          name: leftLabel,
          type: 'bar',
          barMaxWidth: 34,
          data: chartMetrics.map((metric) => chartValue(leftSummary, metric)),
        },
        {
          name: rightLabel,
          type: 'bar',
          barMaxWidth: 34,
          data: chartMetrics.map((metric) => chartValue(rightSummary, metric)),
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [leftLabel, leftSummary, rightLabel, rightSummary]);

  return <div ref={ref} className="h-[360px] w-full" />;
}
