import type { EChartsOption } from 'echarts';
import { formatPct, roundTo } from '@/lib/format';
import { share } from '@/lib/pools';
import { BUCKET_COLORS, BUCKET_LABELS, COLORS, px, withAlpha } from '@/lib/theme';
import { YEARS, type Bucket, type Year } from '@/lib/types';
import type { KeyItem } from '@/lib/chartKey';
import { baseOption, bucketCounts, categoryAxis, emptySpec, labelSize, nullPoolMessage, pctAxis, sourceLine, tooltipBox, type ChartContext, type ChartSpec } from './shared';

interface Item { bucket: Bucket; year: Year; count: number; total: number; value: number }

const Y_MAX = 40;
const FIRST_LEFT = 6;
const GAP = 2.5;
const RIGHT_ROOM = 3;

/** The pull window starts in Sep 2021 and ends in Sep 2026, so both end years are partial. */
const PARTIAL: Partial<Record<Year, string>> = { '2021': 'Sep–Dec', '2026': 'Jan–Sep' };

function itemsFor(ctx: ChartContext, bucket: Bucket): Item[] {
  const counts = ctx.pools[bucket]!.rowsPerYear!;
  const total = YEARS.reduce((s, y) => s + counts[y], 0);
  return YEARS.map((year): Item => ({ bucket, year, count: counts[year], total, value: roundTo(share(counts[year], total) * 100, 1) }));
}

function panelLeft(i: number, k: number): number {
  return (i * (100 - RIGHT_ROOM)) / k + (i === 0 ? FIRST_LEFT : GAP);
}

function panelWidth(i: number, k: number): number {
  return (100 - RIGHT_ROOM) / k - (i === 0 ? FIRST_LEFT : GAP) - 1;
}

function pointLabel(ctx: ChartContext) {
  return { show: true, position: 'top' as const, fontSize: labelSize(ctx.scale) - 1, fontWeight: 700 as const, color: COLORS.sub,
    formatter: (p: unknown) => `${Math.round((p as { data: Item }).data.value)}%` };
}

function fullYearSeries(ctx: ChartContext, bucket: Bucket, i: number) {
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
    label: pointLabel(ctx),
    data: itemsFor(ctx, bucket).map(item => (PARTIAL[item.year] ? { value: null } : item)),
  };
}

/** Dashed so the short 2021 and 2026 windows do not read as a real rise or decline. */
function partialYearSeries(ctx: ChartContext, bucket: Bucket, i: number) {
  const color = BUCKET_COLORS[bucket];
  const items = itemsFor(ctx, bucket);
  const joins = new Set([1, items.length - 2]);
  return {
    type: 'line' as const,
    name: `${BUCKET_LABELS[bucket]} partial`,
    xAxisIndex: i,
    yAxisIndex: i,
    symbol: 'emptyCircle',
    lineStyle: { width: px(2, ctx.scale), color, type: 'dashed' as const },
    itemStyle: { color },
    areaStyle: { color: withAlpha(color, 0.1) },
    data: items.map((item, j) => {
      if (PARTIAL[item.year]) return { ...item, symbolSize: px(7, ctx.scale), label: pointLabel(ctx) };
      if (joins.has(j)) return { ...item, symbolSize: 0, label: { show: false }, tooltip: { show: false } };
      return { value: null };
    }),
  };
}

function yearTick(year: string): string {
  const note = PARTIAL[`20${year}` as Year];
  return note ? `${year}\n{partial|${note}}` : year;
}

function xAxes(ctx: ChartContext, count: number) {
  const size = labelSize(ctx.scale) - 1;
  return Array.from({ length: count }, (_, i) => ({
    ...categoryAxis(YEARS.map(y => y.slice(2)), ctx.scale, { boundaryGap: false }),
    gridIndex: i,
    axisLabel: { interval: 0, hideOverlap: false, alignMinLabel: 'left' as const, alignMaxLabel: 'right' as const, color: COLORS.sub, fontSize: size, fontWeight: 600, lineHeight: size + 3, formatter: yearTick,
      rich: { partial: { color: COLORS.mute, fontSize: size - 2, fontWeight: 600 } } },
  }));
}

const KEY: KeyItem[] = [{ glyph: 'dashed', label: 'partial year' }];

const HELP = [
  'Each panel splits one bucket\'s salaries by the year they were submitted.',
  'Dashed: a partial year. 2021 covers Sep to Dec only, 2026 covers Jan to Sep only.',
];

export function buildRowsPerYear(ctx: ChartContext): ChartSpec {
  const context = 'Share of each bucket\'s salaries · by year';
  const missing = nullPoolMessage(ctx);
  if (missing) return emptySpec(context, missing);
  const buckets = ctx.visible.filter(b => ctx.pools[b]?.rowsPerYear);
  if (buckets.length === 0) return emptySpec(context, 'Salaries per year not pulled for the selected buckets.');
  const k = buckets.length;
  const base = baseOption(ctx.scale);
  const option: EChartsOption = {
    ...base,
    grid: buckets.map((_, i) => ({ left: `${panelLeft(i, k)}%`, width: `${panelWidth(i, k)}%`, top: px(44, ctx.scale), bottom: px(62, ctx.scale) })),
    title: buckets.map((b, i) => ({ text: BUCKET_LABELS[b], left: `${panelLeft(i, k)}%`, top: 0,
      textStyle: { fontSize: labelSize(ctx.scale) + 1, fontWeight: 800, color: BUCKET_COLORS[b], fontFamily: base.textStyle?.fontFamily } })),
    tooltip: { ...base.tooltip, formatter: (p: unknown) => {
      const item = (p as { data: Item }).data;
      const partial = PARTIAL[item.year] ? ` (${PARTIAL[item.year]} only)` : '';
      return tooltipBox(BUCKET_COLORS[item.bucket], `${BUCKET_LABELS[item.bucket]} ${item.year}${partial}`, [
        { label: 'Share of 5-year salaries', value: formatPct(item.value / 100, 1) },
        { label: 'Salaries (n)', value: `${item.count.toLocaleString('en-US')} of ${item.total.toLocaleString('en-US')}` },
      ]);
    } },
    xAxis: xAxes(ctx, k),
    yAxis: buckets.map((_, i) => ({ ...pctAxis(ctx.scale, { max: Y_MAX, interval: 10 }), gridIndex: i, axisLabel: { show: i === 0, color: COLORS.mute, fontSize: labelSize(ctx.scale) - 1, formatter: (v: number) => `${v}%` } })),
    series: buckets.flatMap((b, i) => [fullYearSeries(ctx, b, i), partialYearSeries(ctx, b, i)]),
  };
  return {
    option,
    context,
    key: KEY,
    help: HELP,
    legend: buckets,
    source: sourceLine(ctx, bucketCounts(buckets, b => itemsFor(ctx, b)[0].total)),
    table: {
      columns: ['Year', ...buckets.map(b => BUCKET_LABELS[b])],
      rows: YEARS.map((year, yi) => [PARTIAL[year] ? `${year} (${PARTIAL[year]})` : year, ...buckets.map(b => { const it = itemsFor(ctx, b)[yi]; return `${it.count} (${formatPct(it.value / 100)})`; })]),
    },
  };
}
