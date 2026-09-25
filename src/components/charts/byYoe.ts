import type { EChartsOption } from 'echarts';
import { formatMoney, formatSalaries, toDisplay } from '@/lib/format';
import { BUCKET_COLORS, BUCKET_LABELS, SMALL_N, STORY_N, STORY_OPACITY, px } from '@/lib/theme';
import { YOES, type Bucket, type Pct, type Yoe } from '@/lib/types';
import type { KeyItem } from '@/lib/chartKey';
import { baseOption, bucketCounts, categoryAxis, emptySpec, endLabel, lineFocus, metricName, moneyAxis, nColor, nullPoolMessage, pctRows, sourceLine, tooltipBox, type ChartContext, type ChartSpec } from './shared';

function pctAt(ctx: ChartContext, bucket: Bucket, yoe: Yoe): Pct | undefined {
  const pct = ctx.pools[bucket]?.[ctx.state.metric].byYoe?.[yoe];
  if (!pct || pct.n < 0 || pct.p50 === null) return undefined;
  return pct;
}

function lineSeries(ctx: ChartContext, bucket: Bucket) {
  const cur = ctx.state.cur;
  const scale = ctx.scale;
  return {
    type: 'line' as const,
    name: BUCKET_LABELS[bucket],
    connectNulls: false,
    lineStyle: { width: px(3, scale), color: BUCKET_COLORS[bucket] },
    itemStyle: { color: BUCKET_COLORS[bucket] },
    symbol: 'circle',
    endLabel: endLabel(BUCKET_COLORS[bucket], scale, () => BUCKET_LABELS[bucket]),
    labelLayout: { moveOverlap: 'shiftY' as const },
    ...lineFocus(),
    data: YOES.map(yoe => {
      const pct = pctAt(ctx, bucket, yoe);
      if (!pct) return { value: null };
      const small = pct.n < SMALL_N;
      return {
        value: toDisplay(pct.p50 ?? 0, cur),
        pct,
        yoe,
        symbolSize: small ? px(6, scale) : px(11, scale),
        itemStyle: { color: nColor(pct.n, BUCKET_COLORS[bucket]), opacity: pct.n < STORY_N ? STORY_OPACITY : 1 },
      };
    }),
  };
}

const KEY: KeyItem[] = [
  { glyph: 'dot', label: 'p50' },
  { glyph: 'smallDot', label: 'under 20 salaries' },
];

export function buildByYoe(ctx: ChartContext): ChartSpec {
  const metric = metricName(ctx);
  const context = `${metric} median · by years of experience`;
  const missing = nullPoolMessage(ctx);
  if (missing) return emptySpec(context, missing);
  const buckets = ctx.visible.filter(b => YOES.some(y => pctAt(ctx, b, y)));
  if (buckets.length === 0) {
    return emptySpec(context, `${metric} by experience is not pulled yet. See scripts/pull.ts.`);
  }
  const cur = ctx.state.cur;
  const base = baseOption(ctx.scale);
  const option: EChartsOption = {
    ...base,
    grid: { ...base.grid, right: px(130, ctx.scale) },
    tooltip: { ...base.tooltip, formatter: (p: unknown) => {
      const { seriesName, color, data } = p as { seriesName: string; color: string; data: { pct?: Pct; yoe?: Yoe } };
      if (!data.pct) return '';
      return tooltipBox(color, `${seriesName}, ${data.yoe} yrs`, pctRows(data.pct, cur));
    } },
    xAxis: categoryAxis(YOES.map(y => `${y} yrs`), ctx.scale, { boundaryGap: false }),
    yAxis: moneyAxis(cur, ctx.scale),
    series: buckets.map(b => lineSeries(ctx, b)),
  };
  return {
    option,
    context,
    key: KEY,
    legend: buckets,
    source: sourceLine(ctx, bucketCounts(buckets, b => ctx.pools[b]?.n ?? 0)),
    table: {
      columns: ['YoE', ...buckets.map(b => BUCKET_LABELS[b])],
      rows: YOES.map(yoe => [yoe, ...buckets.map(b => { const p = pctAt(ctx, b, yoe); return p ? `${formatMoney(p.p50, cur)} (${formatSalaries(p.n)})` : '–'; })]),
    },
  };
}
