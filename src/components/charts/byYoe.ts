import type { EChartsOption } from 'echarts';
import { formatMoney, formatN, toDisplay } from '@/lib/format';
import { BUCKET_COLORS, BUCKET_LABELS, SMALL_N, STORY_N, STORY_OPACITY, px } from '@/lib/theme';
import { YOES, type Bucket, type Pct, type Yoe } from '@/lib/types';
import { baseOption, categoryAxis, emptySpec, endLabel, lineFocus, moneyAxis, nColor, nullPoolMessage, pctRows, storyNote, tooltipBox, type ChartContext, type ChartSpec } from './shared';

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

export function buildByYoe(ctx: ChartContext): ChartSpec {
  const metric = ctx.state.metric === 'tc' ? 'Total comp' : 'Base';
  const subtitle = `Median ${metric.toLowerCase()} per experience band. Small dot = n<20, faded = n<10.`;
  const missing = nullPoolMessage(ctx);
  if (missing) return emptySpec(subtitle, missing);
  const buckets = ctx.visible.filter(b => YOES.some(y => pctAt(ctx, b, y)));
  if (buckets.length === 0) {
    return emptySpec(subtitle, `${metric} by experience is not pulled yet. See scripts/pull.ts (get-salaries-by-experience with salaryType base_salary).`);
  }
  const cur = ctx.state.cur;
  const base = baseOption(ctx.scale);
  const option: EChartsOption = {
    ...base,
    grid: { ...base.grid, right: px(130, ctx.scale) },
    tooltip: { ...base.tooltip, formatter: (p: unknown) => {
      const { seriesName, color, data } = p as { seriesName: string; color: string; data: { pct?: Pct; yoe?: Yoe } };
      if (!data.pct) return '';
      return tooltipBox(color, `${seriesName}, ${data.yoe} yrs`, pctRows(data.pct, cur), storyNote(data.pct.n));
    } },
    xAxis: categoryAxis(YOES.map(y => `${y} yrs`), ctx.scale, { boundaryGap: false }),
    yAxis: moneyAxis(cur, ctx.scale),
    series: buckets.map(b => lineSeries(ctx, b)),
  };
  return {
    option,
    subtitle,
    legend: buckets,
    source: `Levels.fyi get-salaries-by-experience, ${buckets.map(b => `${BUCKET_LABELS[b]} ${formatN(ctx.pools[b]?.n ?? 0)}`).join(' · ')}`,
    table: {
      columns: ['YoE', ...buckets.map(b => BUCKET_LABELS[b])],
      rows: YOES.map(yoe => [yoe, ...buckets.map(b => { const p = pctAt(ctx, b, yoe); return p ? `${formatMoney(p.p50, cur)} (${formatN(p.n)})` : '–'; })]),
    },
  };
}
