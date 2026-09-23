import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn, EChartsOption } from 'echarts';
import { formatMoney, formatRatio, toDisplay } from '@/lib/format';
import { ratio } from '@/lib/pools';
import { BUCKET_COLORS, BUCKET_LABELS, COLORS, STORY_N, px, withAlpha } from '@/lib/theme';
import { LEVELS, type Bucket, type Level, type Pct } from '@/lib/types';
import { buildByLevelBars, levelSource, levelTable, pctAt } from './byLevelBars';
import { baseOption, categoryAxis, emptySpec, endLabel, labelSize, lineFocus, medianLabel, moneyAxis, nColor, nOpacity, nullPoolMessage, pctRows, storyNote, tooltipBox, type ChartContext, type ChartSpec, type CustomElement } from './shared';

const CORE: Level[] = ['L1', 'L2', 'L3'];

/** L4 joins the slope only when every visible bucket measured it; one predicted point would bend the story. */
function slopeLevels(ctx: ChartContext): Level[] {
  const l4Solid = ctx.visible.every(b => (pctAt(ctx, b, 'L4')?.n ?? -1) >= STORY_N);
  return LEVELS.filter(level => CORE.includes(level) || (level === 'L4' && l4Solid));
}

function lineSeries(ctx: ChartContext, bucket: Bucket, levels: Level[]) {
  const { cur } = ctx.state;
  const scale = ctx.scale;
  const color = BUCKET_COLORS[bucket];
  const last = levels[levels.length - 1];
  return {
    type: 'line' as const,
    name: BUCKET_LABELS[bucket],
    z: 5,
    symbol: 'circle',
    symbolSize: px(11, scale),
    lineStyle: { width: px(3, scale), color },
    itemStyle: { color, borderColor: '#fff', borderWidth: px(2, scale) },
    endLabel: endLabel(color, scale, () => { const p = pctAt(ctx, bucket, last); return p ? `${BUCKET_LABELS[bucket]} ${medianLabel(p.p50, p.n, cur)}` : BUCKET_LABELS[bucket]; }),
    labelLayout: { moveOverlap: 'shiftY' as const },
    ...lineFocus(),
    data: levels.map((level, i) => {
      const pct = pctAt(ctx, bucket, level);
      if (!pct) return { value: null };
      return {
        value: toDisplay(pct.p50 ?? 0, cur), pct, level,
        itemStyle: { color: nColor(pct.n, color), opacity: nOpacity(pct.n) },
        label: { show: i === 0, position: 'left' as const, fontSize: labelSize(scale) - 1, fontWeight: 700 as const, color: COLORS.sub, formatter: () => formatMoney(pct.p50, cur) },
      };
    }),
  };
}

interface Gap { i: number; o0: number; o1: number; f0: number; f1: number }

function gaps(ctx: ChartContext, levels: Level[]): Gap[] {
  const cur = ctx.state.cur;
  const at = (b: Bucket, l: Level) => { const p = pctAt(ctx, b, l)?.p50; return p === undefined || p === null ? null : toDisplay(p, cur); };
  return levels.slice(0, -1).flatMap((level, i) => {
    const o0 = at('oss', level); const o1 = at('oss', levels[i + 1]);
    const f0 = at('faang', level); const f1 = at('faang', levels[i + 1]);
    if (o0 === null || o1 === null || f0 === null || f1 === null) return [];
    return [{ i, o0, o1, f0, f1 }];
  });
}

function gapPolygons(g: Gap, api: CustomSeriesRenderItemAPI): CustomElement[] {
  const pt = (x: number, y: number) => api.coord([x, y]);
  const fill = (above: boolean) => withAlpha(above ? COLORS.blue : COLORS.amber, 0.18);
  const d0 = g.o0 - g.f0;
  const d1 = g.o1 - g.f1;
  const quad = (x0: number, x1: number, oa: number, ob: number, fa: number, fb: number, above: boolean) =>
    ({ type: 'polygon' as const, shape: { points: [pt(x0, oa), pt(x1, ob), pt(x1, fb), pt(x0, fa)] }, style: { fill: fill(above) }, silent: true });
  if (d0 * d1 >= 0) return [quad(g.i, g.i + 1, g.o0, g.o1, g.f0, g.f1, d0 + d1 >= 0)];
  const t = d0 / (d0 - d1);
  const xc = g.i + t;
  const yc = g.o0 + t * (g.o1 - g.o0);
  return [quad(g.i, xc, g.o0, yc, g.f0, yc, d0 > 0), quad(xc, g.i + 1, yc, g.o1, yc, g.f1, d1 > 0)];
}

function gapSeries(ctx: ChartContext, levels: Level[]) {
  if (!ctx.visible.includes('oss') || !ctx.visible.includes('faang')) return [];
  const segments = gaps(ctx, levels);
  return [{
    type: 'custom' as const,
    name: 'gap',
    silent: true,
    z: 1,
    renderItem: (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn =>
      ({ type: 'group', children: gapPolygons(segments[params.dataIndex], api) }),
    data: segments.map(g => ({ value: [g.i, g.o0] })),
  }];
}

function ratioSeries(ctx: ChartContext, levels: Level[]) {
  if (!ctx.visible.includes('oss') || !ctx.visible.includes('faang')) return [];
  const cur = ctx.state.cur;
  return [{
    type: 'scatter' as const,
    name: 'ratio',
    symbolSize: 0,
    silent: true,
    z: 20,
    label: { show: true, position: 'top' as const, distance: px(12, ctx.scale), fontSize: labelSize(ctx.scale), color: COLORS.blue, fontWeight: 800 as const,
      backgroundColor: 'rgba(255,255,255,0.85)', padding: [1, 4], borderRadius: 4,
      formatter: (p: unknown) => (p as { data: { text: string } }).data.text },
    data: levels.flatMap(level => {
      const oss = pctAt(ctx, 'oss', level);
      const r = ratio(oss?.p50, pctAt(ctx, 'faang', level)?.p50);
      if (!oss || r === null) return [];
      return [{ value: [level, toDisplay(oss.p50 ?? 0, cur)], text: formatRatio(r) }];
    }),
  }];
}

function buildSlope(ctx: ChartContext, subtitle: string): ChartSpec {
  const levels = slopeLevels(ctx);
  const buckets = ctx.visible.filter(b => levels.some(l => pctAt(ctx, b, l)));
  if (buckets.length === 0) return emptySpec(subtitle, 'No by-level rows for the selected buckets.');
  const cur = ctx.state.cur;
  const maxValue = Math.max(...buckets.flatMap(b => levels.map(l => toDisplay(pctAt(ctx, b, l)?.p50 ?? 0, cur))));
  const base = baseOption(ctx.scale);
  const option: EChartsOption = {
    ...base,
    grid: { ...base.grid, left: px(72, ctx.scale), right: px(170, ctx.scale), top: px(40, ctx.scale) },
    tooltip: { ...base.tooltip, formatter: (p: unknown) => {
      const { seriesName, color, data } = p as { seriesName: string; color: string; data: { pct?: Pct; level?: Level } };
      if (!data.pct) return '';
      return tooltipBox(color, `${seriesName} ${data.level}`, pctRows(data.pct, cur), storyNote(data.pct.n));
    } },
    xAxis: categoryAxis(levels, ctx.scale, { boundaryGap: false }),
    yAxis: moneyAxis(cur, ctx.scale, { max: maxValue * 1.18, axisLabel: { show: false }, splitLine: { show: false } }),
    series: [...gapSeries(ctx, levels), ...buckets.map(b => lineSeries(ctx, b, levels)), ...ratioSeries(ctx, levels)],
  };
  return { option, subtitle, legend: buckets, source: levelSource(ctx, buckets), table: levelTable(ctx, buckets, levels) };
}

export function buildByLevel(ctx: ChartContext): ChartSpec {
  if (ctx.options.levelView === 'bars') return buildByLevelBars(ctx);
  const metric = ctx.state.metric === 'tc' ? 'Total comp' : 'Base';
  const subtitle = `${metric} median per level. Shade = OSS above (blue) or below (amber) FAANG+. Label = OSS ÷ FAANG+.`;
  const missing = nullPoolMessage(ctx);
  if (missing) return emptySpec(subtitle, missing);
  return buildSlope(ctx, subtitle);
}
