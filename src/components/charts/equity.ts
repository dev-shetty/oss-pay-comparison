import type { EChartsOption } from 'echarts';
import { formatMoney, formatPct, roundTo } from '@/lib/format';
import { share } from '@/lib/pools';
import { BUCKET_COLORS, BUCKET_LABELS, COLORS, STORY_N, STORY_OPACITY, lighten, px } from '@/lib/theme';
import { LEVELS, type Bucket, type EquityRow, type Level } from '@/lib/types';
import type { KeyItem } from '@/lib/chartKey';
import { baseOption, bucketCounts, categoryAxis, emptySpec, labelSize, nullPoolMessage, pctAxis, sourceLine, tooltipBox, type ChartContext, type ChartSpec } from './shared';

type Part = 'base' | 'stock' | 'bonus';
const PARTS: Part[] = ['base', 'stock', 'bonus'];
const PART_TINT: Record<Part, number> = { base: 0, stock: 0.45, bonus: 0.75 };

const KEY: KeyItem[] = [
  { glyph: 'shades', label: 'base · stock · bonus' },
  { glyph: 'value', text: '32%', label: 'stock share' },
];

function rowAt(ctx: ChartContext, bucket: Bucket, level: Level): EquityRow | undefined {
  const row = ctx.pools[bucket]?.equity?.byLevel[level];
  return row && row.n >= 1 ? row : undefined;
}

function levelsFor(ctx: ChartContext, buckets: Bucket[]): Level[] {
  return LEVELS.filter(level => buckets.some(b => rowAt(ctx, b, level)));
}

function partShare(row: EquityRow, part: Part): number {
  return share(row[part], row.base + row.stock + row.bonus);
}

function partSeries(ctx: ChartContext, bucket: Bucket, part: Part, levels: Level[]) {
  const color = lighten(BUCKET_COLORS[bucket], PART_TINT[part]);
  return {
    type: 'bar' as const,
    name: `${BUCKET_LABELS[bucket]} ${part}`,
    stack: bucket,
    barGap: '20%',
    itemStyle: { color },
    label: {
      show: part === 'bonus',
      position: 'top' as const,
      distance: px(4, ctx.scale),
      fontSize: labelSize(ctx.scale),
      fontWeight: 800 as const,
      color: COLORS.ink,
      formatter: (p: unknown) => { const row = (p as { data: { row?: EquityRow } }).data.row; return row ? formatPct(partShare(row, 'stock')) : ''; },
    },
    data: levels.map(level => {
      const row = rowAt(ctx, bucket, level);
      if (!row) return { value: null, shareValue: 0 };
      const value = partShare(row, part);
      return { value: roundTo(value * 100, 1), shareValue: value, row, level, bucket, part, itemStyle: { opacity: row.n < STORY_N ? STORY_OPACITY : 1 } };
    }),
  };
}

interface Item { row?: EquityRow; level?: Level; bucket?: Bucket; part?: Part }

function tooltip(ctx: ChartContext, data: Item): string {
  if (!data.row || !data.bucket || !data.part) return '';
  const cur = ctx.state.cur;
  const row = data.row;
  return tooltipBox(BUCKET_COLORS[data.bucket], `${BUCKET_LABELS[data.bucket]} ${data.level}`, [
    ...PARTS.map(part => ({ label: `${part[0].toUpperCase()}${part.slice(1)}`, value: `${formatPct(partShare(row, part))} · ${formatMoney(row[part], cur)}` })),
    { label: 'Salaries (n)', value: row.n.toLocaleString('en-US') },
  ]);
}

export function buildEquity(ctx: ChartContext): ChartSpec {
  const context = 'Share of total comp · by level';
  const missing = nullPoolMessage(ctx);
  if (missing) return emptySpec(context, missing);
  const buckets = ctx.visible.filter(b => ctx.pools[b]?.equity);
  if (buckets.length === 0) return emptySpec(context, 'Equity split not pulled for the selected buckets.');
  const levels = levelsFor(ctx, buckets);
  const base = baseOption(ctx.scale);
  const option: EChartsOption = {
    ...base,
    grid: { ...base.grid, top: px(44, ctx.scale) },
    tooltip: { ...base.tooltip, formatter: (p: unknown) => tooltip(ctx, (p as { data: Item }).data) },
    xAxis: categoryAxis(levels, ctx.scale),
    yAxis: pctAxis(ctx.scale),
    series: buckets.flatMap(b => PARTS.map(part => partSeries(ctx, b, part, levels))),
  };
  return {
    option,
    context,
    key: KEY,
    legend: buckets,
    source: sourceLine(ctx, bucketCounts(buckets, b => LEVELS.reduce((s, l) => s + (rowAt(ctx, b, l)?.n ?? 0), 0))),
    table: {
      columns: ['Level', ...buckets.map(b => `${BUCKET_LABELS[b]} base / stock / bonus (salaries)`)],
      rows: levels.map(level => [level, ...buckets.map(b => {
        const row = rowAt(ctx, b, level);
        return row ? `${PARTS.map(part => formatPct(partShare(row, part))).join(' / ')} (${row.n})` : '–';
      })]),
    },
  };
}
