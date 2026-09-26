import type { EChartsOption } from 'echarts';
import { formatPct, roundTo } from '@/lib/format';
import { share } from '@/lib/pools';
import { BUCKET_COLORS, BUCKET_LABELS, COLORS, px, withAlpha } from '@/lib/theme';
import { YEARS, type Bucket, type Year } from '@/lib/types';
import type { KeyItem } from '@/lib/chartKey';
import { baseOption, bucketCounts, categoryAxis, emptySpec, labelSize, nullPoolMessage, pctAxis, sourceLine, tooltipBox, type ChartContext, type ChartSpec } from './shared';

interface Item { bucket: Bucket; year: Year; count: number; total: number; value: number }

const Y_MAX = 40;
const GAP = 2.5;
const RIGHT_ROOM = 3;
/** Phones stack the panels two across; each row of panels gets this much height. */
const NARROW_ROW_H = 250;
const PANEL_TOP = 44;
const PANEL_BOTTOM = 62;

/** The pull window starts in Sep 2021 and ends in Sep 2026, so both end years are partial. */
const PARTIAL: Partial<Record<Year, string>> = { '2021': 'Sep–Dec', '2026': 'Jan–Sep' };

function itemsFor(ctx: ChartContext, bucket: Bucket): Item[] {
  const counts = ctx.pools[bucket]!.rowsPerYear!;
  const total = YEARS.reduce((s, y) => s + counts[y], 0);
  return YEARS.map((year): Item => ({ bucket, year, count: counts[year], total, value: roundTo(share(counts[year], total) * 100, 1) }));
}

/** Room for the y-axis labels, which only the first column shows. */
function firstLeft(narrow: boolean): number {
  return narrow ? 11 : 6;
}

function panelLeft(col: number, cols: number, narrow: boolean): number {
  return (col * (100 - RIGHT_ROOM)) / cols + (col === 0 ? firstLeft(narrow) : GAP);
}

function panelWidth(col: number, cols: number, narrow: boolean): number {
  return (100 - RIGHT_ROOM) / cols - (col === 0 ? firstLeft(narrow) : GAP) - 1;
}

interface Cell { left: string; width: string; top: number; col: number }

function cells(ctx: ChartContext, k: number): Cell[] {
  const cols = ctx.narrow ? Math.min(k, 2) : k;
  return Array.from({ length: k }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const top = ctx.narrow ? row * NARROW_ROW_H : 0;
    return { left: `${panelLeft(col, cols, ctx.narrow)}%`, width: `${panelWidth(col, cols, ctx.narrow)}%`, top, col };
  });
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

export function buildRowsPerYear(ctx: ChartContext): ChartSpec {
  const context = 'Share of each bucket\'s salaries · by year';
  const missing = nullPoolMessage(ctx);
  if (missing) return emptySpec(context, missing);
  const buckets = ctx.visible.filter(b => ctx.pools[b]?.rowsPerYear);
  if (buckets.length === 0) return emptySpec(context, 'Salaries per year not pulled for the selected buckets.');
  const k = buckets.length;
  const base = baseOption(ctx.scale);
  const layout = cells(ctx, k);
  const rows = Math.ceil(k / (ctx.narrow ? Math.min(k, 2) : k));
  const grid = layout.map(c => (ctx.narrow
    ? { left: c.left, width: c.width, top: c.top + PANEL_TOP, height: NARROW_ROW_H - PANEL_TOP - PANEL_BOTTOM }
    : { left: c.left, width: c.width, top: px(PANEL_TOP, ctx.scale), bottom: px(PANEL_BOTTOM, ctx.scale) }));
  const option: EChartsOption = {
    ...base,
    grid,
    title: buckets.map((b, i) => ({ text: BUCKET_LABELS[b], left: layout[i].left, top: layout[i].top,
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
    yAxis: buckets.map((_, i) => ({ ...pctAxis(ctx.scale, { max: Y_MAX, interval: 10 }), gridIndex: i, axisLabel: { show: layout[i].col === 0, color: COLORS.mute, fontSize: labelSize(ctx.scale) - 1, formatter: (v: number) => `${v}%` } })),
    series: buckets.flatMap((b, i) => [fullYearSeries(ctx, b, i), partialYearSeries(ctx, b, i)]),
  };
  return {
    option,
    height: ctx.narrow ? rows * NARROW_ROW_H : undefined,
    context,
    key: KEY,
    legend: buckets,
    source: sourceLine(ctx, bucketCounts(buckets, b => itemsFor(ctx, b)[0].total)),
    table: {
      columns: ['Year', ...buckets.map(b => BUCKET_LABELS[b])],
      rows: YEARS.map((year, yi) => [PARTIAL[year] ? `${year} (${PARTIAL[year]})` : year, ...buckets.map(b => { const it = itemsFor(ctx, b)[yi]; return `${it.count} (${formatPct(it.value / 100)})`; })]),
    },
  };
}
