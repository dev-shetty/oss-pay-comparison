import type { EChartsOption } from 'echarts';
import { formatPct, roundTo } from '@/lib/format';
import { share } from '@/lib/pools';
import { BUCKET_COLORS, BUCKET_LABELS, COLORS, px, withAlpha } from '@/lib/theme';
import { YEARS, type Bucket, type Year } from '@/lib/types';
import { baseOption, categoryAxis, emptySpec, labelSize, nullPoolMessage, pctAxis, tooltipBox, type ChartContext, type ChartSpec } from './shared';

interface Item { bucket: Bucket; year: Year; count: number; total: number; value: number }

const Y_MAX = 40;
const FIRST_LEFT = 6;
const GAP = 2.5;

function itemsFor(ctx: ChartContext, bucket: Bucket): Item[] {
  const counts = ctx.pools[bucket]!.rowsPerYear!;
  const total = YEARS.reduce((s, y) => s + counts[y], 0);
  return YEARS.map((year): Item => ({ bucket, year, count: counts[year], total, value: roundTo(share(counts[year], total) * 100, 1) }));
}

function panelLeft(i: number, k: number): number {
  return (i * 100) / k + (i === 0 ? FIRST_LEFT : GAP);
}

function panelWidth(i: number, k: number): number {
  return 100 / k - (i === 0 ? FIRST_LEFT : GAP) - 1;
}

function areaSeries(ctx: ChartContext, bucket: Bucket, i: number) {
  const color = BUCKET_COLORS[bucket];
  return {
    type: 'line' as const,
    name: BUCKET_LABELS[bucket],
    xAxisIndex: i,
    yAxisIndex: i,
    symbol: 'circle',
    symbolSize: px(7, ctx.scale),
    lineStyle: { width: px(2, ctx.scale), color },
    itemStyle: { color },
    areaStyle: { color: withAlpha(color, 0.28) },
    label: { show: true, position: 'top' as const, fontSize: labelSize(ctx.scale) - 1, fontWeight: 700 as const, color: COLORS.sub,
      formatter: (p: unknown) => `${Math.round((p as { data: Item }).data.value)}%` },
    data: itemsFor(ctx, bucket),
  };
}

export function buildRowsPerYear(ctx: ChartContext): ChartSpec {
  const subtitle = 'Area = share of the bucket\'s 5-year rows per year. 2021 and 2026 are partial.';
  const missing = nullPoolMessage(ctx);
  if (missing) return emptySpec(subtitle, missing);
  const buckets = ctx.visible.filter(b => ctx.pools[b]?.rowsPerYear);
  if (buckets.length === 0) return emptySpec(subtitle, 'Rows per year not pulled for the selected buckets.');
  const k = buckets.length;
  const base = baseOption(ctx.scale);
  const option: EChartsOption = {
    ...base,
    grid: buckets.map((_, i) => ({ left: `${panelLeft(i, k)}%`, width: `${panelWidth(i, k)}%`, top: px(44, ctx.scale), bottom: px(50, ctx.scale) })),
    title: buckets.map((b, i) => ({ text: BUCKET_LABELS[b], left: `${panelLeft(i, k)}%`, top: 0,
      textStyle: { fontSize: labelSize(ctx.scale) + 1, fontWeight: 800, color: BUCKET_COLORS[b], fontFamily: base.textStyle?.fontFamily } })),
    tooltip: { ...base.tooltip, formatter: (p: unknown) => {
      const item = (p as { data: Item }).data;
      return tooltipBox(BUCKET_COLORS[item.bucket], `${BUCKET_LABELS[item.bucket]} ${item.year}`, [
        { label: 'Share of 5-year rows', value: formatPct(item.value / 100, 1) },
        { label: 'Rows (n)', value: `${item.count.toLocaleString('en-US')} of ${item.total.toLocaleString('en-US')}` },
      ]);
    } },
    xAxis: buckets.map((_, i) => ({ ...categoryAxis(YEARS.map(y => y.slice(2)), ctx.scale, { boundaryGap: false }), gridIndex: i, axisLabel: { color: COLORS.sub, fontSize: labelSize(ctx.scale) - 1, fontWeight: 600 } })),
    yAxis: buckets.map((_, i) => ({ ...pctAxis(ctx.scale, { max: Y_MAX, interval: 10 }), gridIndex: i, axisLabel: { show: i === 0, color: COLORS.mute, fontSize: labelSize(ctx.scale) - 1, formatter: (v: number) => `${v}%` } })),
    series: buckets.map((b, i) => areaSeries(ctx, b, i)),
  };
  return {
    option,
    subtitle,
    legend: buckets,
    source: 'Levels.fyi get-salary-trends percentilesByMonth counts, summed per year',
    table: {
      columns: ['Year', ...buckets.map(b => BUCKET_LABELS[b])],
      rows: YEARS.map((year, yi) => [year, ...buckets.map(b => { const it = itemsFor(ctx, b)[yi]; return `${it.count} (${formatPct(it.value / 100)})`; })]),
    },
  };
}
