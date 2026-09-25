import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn, EChartsOption } from 'echarts';
import { formatMoney, formatRatio, toDisplay } from '@/lib/format';
import { ratio } from '@/lib/pools';
import { BUCKET_COLORS, BUCKET_LABELS, COLORS, FONT_FAMILY, px, withAlpha } from '@/lib/theme';
import { LEVELS, type Bucket, type Level, type Pct } from '@/lib/types';
import { buildByLevelBars, levelSource, levelTable, pctAt } from './byLevelBars';
import { baseOption, categoryAxis, emptySpec, labelSize, lineFocus, metricName, moneyAxis, nColor, nOpacity, nullPoolMessage, pctRows, tooltipBox, type ChartContext, type ChartSpec, type CustomElement, type TooltipRow } from './shared';

/** Levels where at least one visible bucket has a measured median; each line then stops at its own last measured level. */
function slopeLevels(ctx: ChartContext): Level[] {
  return LEVELS.filter(level => ctx.visible.some(b => pctAt(ctx, b, level)));
}


function lineSeries(ctx: ChartContext, bucket: Bucket, levels: Level[]) {
  const { cur } = ctx.state;
  const scale = ctx.scale;
  const color = BUCKET_COLORS[bucket];
  return {
    type: 'line' as const,
    name: BUCKET_LABELS[bucket],
    z: 5,
    symbol: 'circle',
    symbolSize: px(11, scale),
    lineStyle: { width: px(3, scale), color },
    itemStyle: { color, borderColor: '#fff', borderWidth: px(2, scale) },
    ...lineFocus(),
    data: levels.map(level => {
      const pct = pctAt(ctx, bucket, level);
      if (!pct) return { value: null };
      return {
        value: toDisplay(pct.p50 ?? 0, cur), pct, level, bucket,
        itemStyle: { color: nColor(pct.n, color), opacity: nOpacity(pct.n) },
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

const END_GAP = 16;

/** Pushes label centres apart top-down so neighbours never sit closer than `gap`. */
export function spreadYs(ys: number[], gap: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const out = ys.slice();
  let prev = -Infinity;
  order.forEach(({ y, i }) => { out[i] = Math.max(y, prev + gap); prev = out[i]; });
  return out;
}

type Edge = 'start' | 'end';

interface EdgeItem { bucket: Bucket; level: Level; value: number; text: string; fill: string }

/** zrender paints a text's stroke over its fill, so the halo is a second stroke-only text underneath. */
function haloText(x: number, y: number, item: EdgeItem, edge: Edge, scale: number): CustomElement[] {
  const style = {
    x, y, text: item.text, align: edge === 'end' ? 'left' as const : 'right' as const, verticalAlign: 'middle' as const,
    fontSize: edge === 'end' ? labelSize(scale) : labelSize(scale) - 1, fontWeight: edge === 'end' ? 800 : 700, fontFamily: FONT_FAMILY,
  };
  return [
    { type: 'text', silent: true, z2: 4, style: { ...style, stroke: '#fff', lineWidth: px(4, scale) } },
    { type: 'text', silent: true, z2: 6, style: { ...style, fill: item.fill } },
  ];
}

/** End: bucket name + median at the last measured level. Start: the median alone at the first. n lives in the tooltip so labels stay short enough to de-collide. */
function edgeItems(ctx: ChartContext, buckets: Bucket[], levels: Level[], edge: Edge): EdgeItem[] {
  const cur = ctx.state.cur;
  return buckets.flatMap(bucket => {
    const measured = levels.filter(level => pctAt(ctx, bucket, level));
    const level = edge === 'end' ? measured[measured.length - 1] : measured[0];
    const p = level && pctAt(ctx, bucket, level);
    if (!level || !p) return [];
    const money = formatMoney(p.p50, cur);
    return edge === 'end'
      ? [{ bucket, level, value: toDisplay(p.p50 ?? 0, cur), text: `${BUCKET_LABELS[bucket]} ${money}`, fill: BUCKET_COLORS[bucket] }]
      : [{ bucket, level, value: toDisplay(p.p50 ?? 0, cur), text: money, fill: COLORS.sub }];
  });
}

function edgeLabelSeries(ctx: ChartContext, buckets: Bucket[], levels: Level[], edge: Edge) {
  const items = edgeItems(ctx, buckets, levels, edge);
  const offset = px(edge === 'end' ? 12 : -10, ctx.scale);
  return [{
    type: 'custom' as const,
    name: `${edge}-labels`,
    silent: true,
    z: 30,
    renderItem: (_: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn => {
      const children = levels.flatMap(level => {
        const group = items.filter(item => item.level === level);
        const points = group.map(item => api.coord([level, item.value]));
        const ys = spreadYs(points.map(p => p[1]), px(END_GAP, ctx.scale));
        return group.flatMap((item, i) => haloText(points[i][0] + offset, ys[i], item, edge, ctx.scale));
      });
      return { type: 'group', children };
    },
    data: items.length ? [{ value: [items[0].level, items[0].value] }] : [],
  }];
}

export function ossTooltipRows(ctx: ChartContext, pct: Pct, level: Level): TooltipRow[] {
  const comparisons = ctx.visible.filter(b => b !== 'oss').flatMap(b => {
    const r = ratio(pct.p50, pctAt(ctx, b, level)?.p50);
    return r === null ? [] : [{ label: `vs ${BUCKET_LABELS[b]}`, value: formatRatio(r) }];
  });
  return [
    { label: 'p50 (median)', value: formatMoney(pct.p50, ctx.state.cur) },
    { label: 'Salaries (n)', value: pct.n.toLocaleString('en-US') },
    ...comparisons,
  ];
}

function buildSlope(ctx: ChartContext, context: string): ChartSpec {
  const levels = slopeLevels(ctx);
  const buckets = ctx.visible.filter(b => levels.some(l => pctAt(ctx, b, l)));
  if (buckets.length === 0) return emptySpec(context, 'No by-level salaries for the selected buckets.');
  const cur = ctx.state.cur;
  const maxValue = Math.max(...buckets.flatMap(b => levels.map(l => toDisplay(pctAt(ctx, b, l)?.p50 ?? 0, cur))));
  const base = baseOption(ctx.scale);
  const option: EChartsOption = {
    ...base,
    grid: { ...base.grid, left: px(72, ctx.scale), right: px(190, ctx.scale), top: px(40, ctx.scale) },
    tooltip: { ...base.tooltip, formatter: (p: unknown) => {
      const { seriesName, color, data } = p as { seriesName: string; color: string; data: { pct?: Pct; level?: Level; bucket?: Bucket } };
      if (!data.pct || !data.level) return '';
      const rows = data.bucket === 'oss' ? ossTooltipRows(ctx, data.pct, data.level) : pctRows(data.pct, cur);
      return tooltipBox(color, `${seriesName} ${data.level}`, rows);
    } },
    xAxis: categoryAxis(levels, ctx.scale, { boundaryGap: false }),
    yAxis: moneyAxis(cur, ctx.scale, { max: maxValue * 1.18, axisLabel: { show: false }, splitLine: { show: false } }),
    series: [...gapSeries(ctx, levels), ...buckets.map(b => lineSeries(ctx, b, levels)), ...edgeLabelSeries(ctx, buckets, levels, 'start'), ...edgeLabelSeries(ctx, buckets, levels, 'end')],
  };
  return { option, context, key: [], legend: buckets, source: levelSource(ctx, buckets), table: levelTable(ctx, buckets, levels) };
}

export function buildByLevel(ctx: ChartContext): ChartSpec {
  if (ctx.options.levelView === 'bars') return buildByLevelBars(ctx);
  const context = `${metricName(ctx)} median · by level`;
  const missing = nullPoolMessage(ctx);
  if (missing) return emptySpec(context, missing);
  return buildSlope(ctx, context);
}
