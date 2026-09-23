import type { EChartsOption } from 'echarts';
import { formatMoney, formatN, formatRatio, toDisplay } from '@/lib/format';
import { ratio } from '@/lib/pools';
import { BUCKET_COLORS, BUCKET_LABELS, COLORS, STORY_N, STORY_OPACITY } from '@/lib/theme';
import { LEVELS, type Bucket, type Level, type Pct } from '@/lib/types';
import { baseOption, categoryAxis, emptySpec, labelSize, medianLabel, moneyAxis, nColor, nullPoolMessage, pctRows, storyNote, tooltipBox, type ChartContext, type ChartSpec } from './shared';

export function pctAt(ctx: ChartContext, bucket: Bucket, level: Level): Pct | undefined {
  const pct = ctx.pools[bucket]?.[ctx.state.metric].byLevel?.[level];
  if (!pct || pct.n < 0 || pct.p50 === null) return undefined;
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
      ...buckets.map(b => { const p = pctAt(ctx, b, level); return p ? `${formatMoney(p.p50, cur)} (${formatN(p.n)})` : '–'; }),
      formatRatioOrDash(ratio(pctAt(ctx, 'oss', level)?.p50, pctAt(ctx, 'faang', level)?.p50)),
      formatRatioOrDash(ratio(pctAt(ctx, 'oss', level)?.p50, pctAt(ctx, 'inp', level)?.p50))]),
  };
}

export function levelSource(ctx: ChartContext, buckets: Bucket[]): string {
  return `Levels.fyi pooled percentiles, ${buckets.map(b => `${BUCKET_LABELS[b]} ${formatN(ctx.pools[b]?.n ?? 0)}`).join(' · ')}`;
}

function ratioText(ctx: ChartContext, level: Level): string {
  const oss = pctAt(ctx, 'oss', level)?.p50;
  const parts: string[] = [];
  const faang = ratio(oss, pctAt(ctx, 'faang', level)?.p50);
  const inp = ratio(oss, pctAt(ctx, 'inp', level)?.p50);
  if (ctx.visible.includes('faang') && faang) parts.push(`${formatRatio(faang)} FAANG+`);
  if (ctx.visible.includes('inp') && inp) parts.push(`${formatRatio(inp)} Ind. product`);
  return parts.length ? `OSS = ${parts.join('\n')}` : '';
}

function barSeries(ctx: ChartContext, bucket: Bucket, levels: Level[]) {
  const cur = ctx.state.cur;
  return {
    type: 'bar' as const,
    name: BUCKET_LABELS[bucket],
    barGap: '15%',
    itemStyle: { color: BUCKET_COLORS[bucket], borderRadius: [4, 4, 0, 0] },
    label: { show: true, position: 'top' as const, fontSize: labelSize(ctx.scale) - 1, color: COLORS.sub, fontWeight: 600 as const, lineHeight: labelSize(ctx.scale) + 2,
      formatter: (p: unknown) => { const pct = (p as { data: { pct?: Pct } }).data.pct; return pct ? medianLabel(pct.p50, pct.n, cur).replace(' (', '\n(') : ''; } },
    data: levels.map(level => {
      const pct = pctAt(ctx, bucket, level);
      if (!pct) return { value: null };
      const story = pct.n < STORY_N;
      return { value: toDisplay(pct.p50 ?? 0, cur), pct, level, itemStyle: { color: nColor(pct.n, BUCKET_COLORS[bucket]), opacity: story ? STORY_OPACITY : 1 } };
    }),
  };
}

function levelMax(ctx: ChartContext, level: Level): number {
  return Math.max(0, ...ctx.visible.map(b => toDisplay(pctAt(ctx, b, level)?.p50 ?? 0, ctx.state.cur)));
}

function calloutSeries(ctx: ChartContext, levels: Level[], lift: number) {
  if (!ctx.visible.includes('oss')) return [];
  return [{
    type: 'scatter' as const,
    name: 'ratio',
    symbolSize: 0,
    silent: true,
    z: 20,
    label: { show: true, position: 'top' as const, fontSize: labelSize(ctx.scale), color: COLORS.blue, fontWeight: 700 as const, lineHeight: labelSize(ctx.scale) + 4, align: 'center' as const,
      formatter: (p: unknown) => (p as { data: { text: string } }).data.text },
    data: levels.map(level => ({ value: [level, levelMax(ctx, level) + lift], text: ratioText(ctx, level) })),
  }];
}

export function buildByLevelBars(ctx: ChartContext): ChartSpec {
  const metric = ctx.state.metric === 'tc' ? 'Total comp' : 'Base';
  const subtitle = `${metric} median per level. Callout = OSS ÷ other bucket. Light tint = n<20.`;
  const missing = nullPoolMessage(ctx);
  if (missing) return emptySpec(subtitle, missing);
  const levels = shownLevels(ctx);
  const buckets = ctx.visible.filter(b => levels.some(l => pctAt(ctx, b, l)));
  if (buckets.length === 0) return emptySpec(subtitle, 'No by-level rows for the selected buckets.');
  const cur = ctx.state.cur;
  const maxValue = Math.max(...buckets.flatMap(b => levels.map(l => toDisplay(pctAt(ctx, b, l)?.p50 ?? 0, cur))));
  const base = baseOption(ctx.scale);
  const option: EChartsOption = {
    ...base,
    tooltip: { ...base.tooltip, formatter: (p: unknown) => {
      const { seriesName, color, data } = p as { seriesName: string; color: string; data: { pct?: Pct; level?: Level } };
      if (!data.pct) return '';
      return tooltipBox(color, `${seriesName} ${data.level}`, pctRows(data.pct, cur), storyNote(data.pct.n));
    } },
    xAxis: categoryAxis(levels, ctx.scale),
    yAxis: moneyAxis(cur, ctx.scale, { max: maxValue * 1.4 }),
    series: [...buckets.map(b => barSeries(ctx, b, levels)), ...calloutSeries(ctx, levels, maxValue * 0.18)],
  };
  return {
    option,
    subtitle,
    legend: buckets,
    source: levelSource(ctx, buckets),
    table: levelTable(ctx, buckets, levels),
  };
}

function formatRatioOrDash(value: number | null): string {
  return value === null ? '–' : formatRatio(value);
}
