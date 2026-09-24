import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn, EChartsOption } from 'echarts';
import { formatMoney, toDisplay } from '@/lib/format';
import { COLORS, FONT_FAMILY, SMALL_N, px, withAlpha } from '@/lib/theme';
import type { Currency, Pct } from '@/lib/types';
import { baseOption, categoryAxis, labelSize, moneyAxis, nColor, nOpacity, niceMax, pctRows, tooltipBox, type ChartContext, type CustomElement } from './shared';

export interface BandItem {
  id: string;
  name: string;
  pct: Pct;
  color: string;
}

/** One y row per band; `items` are the buckets drawn as stacked sub-rows inside it. */
export interface BandGroup {
  id: string;
  name: string;
  items: BandItem[];
}

interface Datum { value: [number, number]; group: BandGroup; item: BandItem; slot: number }

const SUB_ROW_GAP = 14;
const BAND_H = 6;
const DOT_R = 4;
const LABEL_PAD = 5;

function subRowY(api: CustomSeriesRenderItemAPI, groupIdx: number, slot: number, count: number, scale: number): number {
  const center = api.coord([0, groupIdx])[1];
  return center + (slot - (count - 1) / 2) * px(SUB_ROW_GAP, scale);
}

function labelWidth(text: string, scale: number): number {
  return text.length * labelSize(scale) * 0.6;
}

/** Labels keep their sub-row y unless a neighbour's text overlaps in x; overlapping ones are pushed down, then the set is re-centred on the group. */
function labelYs(rowYs: number[], xs: number[], widths: number[], scale: number): number[] {
  const lineH = labelSize(scale) + px(2, scale);
  const ys = rowYs.slice();
  for (let i = 1; i < ys.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      const overlapX = Math.abs(xs[i] - xs[j]) < Math.max(widths[i], widths[j]);
      if (overlapX && ys[i] - ys[j] < lineH) ys[i] = ys[j] + lineH;
    }
  }
  const shift = (rowYs[0] + rowYs[rowYs.length - 1]) / 2 - (ys[0] + ys[ys.length - 1]) / 2;
  return ys.map(y => y + shift);
}

/** zrender paints a text's stroke over its fill, so the halo is a second stroke-only text drawn underneath. */
function labelElements(x: number, y: number, text: string, fill: string, right: number, scale: number, opacity: number): CustomElement[] {
  const flip = x + labelWidth(text, scale) > right;
  const style = {
    x: flip ? x - px(DOT_R * 2 + LABEL_PAD * 2, scale) : x,
    y,
    text,
    align: flip ? 'right' as const : 'left' as const,
    verticalAlign: 'middle' as const,
    fontSize: labelSize(scale),
    fontWeight: 800,
    fontFamily: FONT_FAMILY,
    opacity,
  };
  return [
    { type: 'text', silent: true, z2: 4, style: { ...style, stroke: '#fff', lineWidth: px(3, scale) } },
    { type: 'text', silent: true, z2: 6, style: { ...style, fill } },
  ];
}

function renderItem(data: Datum[], cur: Currency, scale: number) {
  return (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn => {
    const d = data[params.dataIndex];
    const { group, item, slot } = d;
    const groupIdx = d.value[1];
    const x = (usd: number) => api.coord([toDisplay(usd, cur), groupIdx])[0];
    const sys = params.coordSys as unknown as { x: number; width: number };
    const right = sys.x + sys.width;
    const count = group.items.length;
    const y = subRowY(api, groupIdx, slot, count, scale);
    const color = nColor(item.pct.n, item.color);
    const opacity = nOpacity(item.pct.n);
    const bandH = px(BAND_H, scale);
    const r = px(DOT_R, scale);
    const children: CustomElement[] = [
      { type: 'rect', shape: { x: x(item.pct.p25), y: y - bandH / 2, width: x(item.pct.p75) - x(item.pct.p25), height: bandH, r: bandH / 2 }, style: { fill: withAlpha(color, 0.55), opacity } },
    ];
    if (item.pct.p50 === null) return { type: 'group', children };
    children.push({ type: 'circle', shape: { cx: x(item.pct.p50), cy: y, r }, style: { fill: color, stroke: '#fff', lineWidth: px(1.5, scale), opacity }, z2: 5 });
    const labelled = group.items.filter(i => i.pct.p50 !== null);
    const xs = labelled.map(i => x(i.pct.p50!) + r + px(LABEL_PAD, scale));
    const texts = labelled.map(i => formatMoney(i.pct.p50, cur));
    const rowYs = labelled.map(i => subRowY(api, groupIdx, group.items.indexOf(i), count, scale));
    const ys = labelYs(rowYs, xs, texts.map(t => labelWidth(t, scale)), scale);
    const k = labelled.indexOf(item);
    const fill = item.pct.n < SMALL_N ? COLORS.sub : item.color;
    children.push(...labelElements(xs[k], ys[k], texts[k], fill, right, scale, opacity));
    return { type: 'group', children };
  };
}

function tooltipFor({ group, item }: Datum, cur: Currency): string {
  return tooltipBox(item.color, `${item.name} · ${group.name}`, pctRows(item.pct, cur));
}

/** Chart height that keeps every sub-row readable: ~90px per band plus axis padding. */
export function bandGroupsHeight(groupCount: number, scale: number): number {
  return px(90 * groupCount + 60, scale);
}

export function bandGroupsOption(ctx: ChartContext, groups: BandGroup[]): EChartsOption {
  const cur = ctx.state.cur;
  const scale = ctx.scale;
  const base = baseOption(scale);
  const data: Datum[] = groups.flatMap((group, gi) => group.items.map((item, slot): Datum => ({ value: [toDisplay(item.pct.p50 ?? item.pct.p25, cur), gi], group, item, slot })));
  const xMax = Math.max(...data.map(d => d.item.pct.p75));
  return {
    ...base,
    grid: { ...base.grid, right: px(72, scale), top: px(28, scale), bottom: px(28, scale) },
    tooltip: { ...base.tooltip, formatter: (p: unknown) => tooltipFor((p as { data: Datum }).data, cur) },
    xAxis: moneyAxis(cur, scale, { min: 0, max: niceMax(toDisplay(xMax * 1.05, cur)) }),
    yAxis: categoryAxis(groups.map(g => g.name), scale, { inverse: true, splitLine: { show: true, lineStyle: { color: COLORS.grid } } }),
    series: [{ type: 'custom', name: 'bands', renderItem: renderItem(data, cur, scale), data }],
  };
}
