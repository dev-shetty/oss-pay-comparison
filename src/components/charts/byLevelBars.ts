import type { EChartsOption } from 'echarts';
import { formatMoney, formatRatio, formatSalaries, toDisplay } from '@/lib/format';
import { ratio } from '@/lib/pools';
import { BUCKET_COLORS, BUCKET_LABELS, COLORS, STORY_N, STORY_OPACITY } from '@/lib/theme';
import { LEVELS, type Bucket, type Level, type Pct } from '@/lib/types';
import type { KeyItem } from '@/lib/chartKey';
import { ossTooltipRows } from './byLevel';
import { baseOption, bucketCounts, categoryAxis, emptySpec, labelSize, metricName, moneyAxis, nColor, nullPoolMessage, pctRows, shortMedianLabel, sourceLine, tooltipBox, type ChartContext, type ChartSpec } from './shared';

/** Levels under STORY_N salaries are left out, so a 4-salary L5 never reads as a comparison with FAANG+. */
export function pctAt(ctx: ChartContext, bucket: Bucket, level: Level): Pct | undefined {
  const pct = ctx.pools[bucket]?.[ctx.state.metric].byLevel?.[level];
  if (!pct || pct.n < STORY_N || pct.p50 === null) return undefined;
  return pct;
}

function shownLevels(ctx: ChartContext): Level[] {
  return LEVELS.filter(level => ['L1', 'L2', 'L3'].includes(level)
    || ctx.visible.some(b => (pctAt(ctx, b, level)?.n ?? -1) >= STORY_N));
}

export function levelTable(ctx: ChartContext, buckets: Bucket[], levels: Level[]) {
  const cur = ctx.state.cur;
  return {
    columns: ['Level', ...buckets.map(b => BUCKET_LABELS[b]), 'OSS / FAANG+', 'OSS / Indian product'],
    rows: levels.map(level => [level,
      ...buckets.map(b => { const p = pctAt(ctx, b, level); return p ? `${formatMoney(p.p50, cur)} (${formatSalaries(p.n)})` : '–'; }),
      formatRatioOrDash(ratio(pctAt(ctx, 'oss', level)?.p50, pctAt(ctx, 'faang', level)?.p50)),
      formatRatioOrDash(ratio(pctAt(ctx, 'oss', level)?.p50, pctAt(ctx, 'inp', level)?.p50))]),
  };
}

export function levelSource(ctx: ChartContext, buckets: Bucket[]): string {
  return sourceLine(ctx, bucketCounts(buckets, b => ctx.pools[b]?.n ?? 0));
}

function barSeries(ctx: ChartContext, bucket: Bucket, levels: Level[]) {
  const cur = ctx.state.cur;
  return {
    type: 'bar' as const,
    name: BUCKET_LABELS[bucket],
    barGap: '15%',
    itemStyle: { color: BUCKET_COLORS[bucket], borderRadius: [4, 4, 0, 0] },
    label: { show: true, position: 'top' as const, fontSize: labelSize(ctx.scale) - 1, color: COLORS.sub, fontWeight: 600 as const, lineHeight: labelSize(ctx.scale) + 2,
      formatter: (p: unknown) => { const pct = (p as { data: { pct?: Pct } }).data.pct; return pct ? shortMedianLabel(pct.p50, pct.n, cur).replace(' (', '\n(') : ''; } },
    data: levels.map(level => {
      const pct = pctAt(ctx, bucket, level);
      if (!pct) return { value: null };
      const story = pct.n < STORY_N;
      return { value: toDisplay(pct.p50 ?? 0, cur), pct, level, itemStyle: { color: nColor(pct.n, BUCKET_COLORS[bucket]), opacity: story ? STORY_OPACITY : 1 } };
    }),
  };
}

const BARS_KEY: KeyItem[] = [{ glyph: 'tintBar', label: 'under 20 salaries' }];

export function buildByLevelBars(ctx: ChartContext): ChartSpec {
  const context = `${metricName(ctx)} median · by level`;
  const missing = nullPoolMessage(ctx);
  if (missing) return emptySpec(context, missing);
  const levels = shownLevels(ctx);
  const buckets = ctx.visible.filter(b => levels.some(l => pctAt(ctx, b, l)));
  if (buckets.length === 0) return emptySpec(context, 'No by-level salaries for the selected buckets.');
  const cur = ctx.state.cur;
  const maxValue = Math.max(...buckets.flatMap(b => levels.map(l => toDisplay(pctAt(ctx, b, l)?.p50 ?? 0, cur))));
  const base = baseOption(ctx.scale);
  const option: EChartsOption = {
    ...base,
    tooltip: { ...base.tooltip, formatter: (p: unknown) => {
      const { seriesName, color, data } = p as { seriesName: string; color: string; data: { pct?: Pct; level?: Level } };
      if (!data.pct || !data.level) return '';
      const rows = seriesName === BUCKET_LABELS.oss ? ossTooltipRows(ctx, data.pct, data.level) : pctRows(data.pct, cur);
      return tooltipBox(color, `${seriesName} ${data.level}`, rows);
    } },
    xAxis: categoryAxis(levels, ctx.scale),
    yAxis: moneyAxis(cur, ctx.scale, { max: maxValue * 1.2 }),
    series: buckets.map(b => barSeries(ctx, b, levels)),
  };
  return {
    option,
    context,
    key: BARS_KEY,
    legend: buckets,
    source: levelSource(ctx, buckets),
    table: levelTable(ctx, buckets, levels),
  };
}

function formatRatioOrDash(value: number | null): string {
  return value === null ? '–' : formatRatio(value);
}
