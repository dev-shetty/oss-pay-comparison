import type { EChartsOption } from 'echarts';
import { formatMoney, formatPct, roundTo } from '@/lib/format';
import { share } from '@/lib/pools';
import { BUCKET_COLORS, BUCKET_LABELS, COLORS, STORY_N, STORY_OPACITY, lighten } from '@/lib/theme';
import { LEVELS, type Bucket, type EquityRow, type Level } from '@/lib/types';
import { baseOption, categoryAxis, emptySpec, labelSize, nullPoolMessage, pctAxis, storyNote, tooltipBox, type ChartContext, type ChartSpec } from './shared';

type Part = 'base' | 'stock' | 'bonus';
const PARTS: Part[] = ['base', 'stock', 'bonus'];
const PART_TINT: Record<Part, number> = { base: 0, stock: 0.45, bonus: 0.75 };

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
      show: part === 'stock',
      position: 'inside' as const,
      fontSize: labelSize(ctx.scale),
      fontWeight: 700 as const,
      color: part === 'base' ? '#fff' : COLORS.ink,
      formatter: (p: unknown) => formatPct((p as { data: { shareValue: number } }).data.shareValue),
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
    { label: 'Rows (n)', value: row.n.toLocaleString('en-US') },
  ], storyNote(row.n));
}

export function buildEquity(ctx: ChartContext): ChartSpec {
  const subtitle = 'Share of total comp: dark = base, mid = stock, light = bonus. Label = stock share.';
  const missing = nullPoolMessage(ctx);
  if (missing) return emptySpec(subtitle, missing);
  const buckets = ctx.visible.filter(b => ctx.pools[b]?.equity);
  if (buckets.length === 0) return emptySpec(subtitle, 'Equity split not pulled for the selected buckets.');
  const levels = levelsFor(ctx, buckets);
  const base = baseOption(ctx.scale);
  const option: EChartsOption = {
    ...base,
    tooltip: { ...base.tooltip, formatter: (p: unknown) => tooltip(ctx, (p as { data: Item }).data) },
    xAxis: categoryAxis(levels, ctx.scale),
    yAxis: pctAxis(ctx.scale),
    series: buckets.flatMap(b => PARTS.map(part => partSeries(ctx, b, part, levels))),
  };
  return {
    option,
    subtitle,
    legend: buckets,
    source: 'Levels.fyi get-salary-trends medianCompByLevel, India, 0-60 months',
    table: {
      columns: ['Level', ...buckets.map(b => `${BUCKET_LABELS[b]} base / stock / bonus (n)`)],
      rows: levels.map(level => [level, ...buckets.map(b => {
        const row = rowAt(ctx, b, level);
        return row ? `${PARTS.map(part => formatPct(partShare(row, part))).join(' / ')} (${row.n})` : '–';
      })]),
    },
  };
}
