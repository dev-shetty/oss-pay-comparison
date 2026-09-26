import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn, EChartsOption } from 'echarts';
import { toDisplay } from '@/lib/format';
import { COLORS, FONT_FAMILY, SMALL_N, lighten, px } from '@/lib/theme';
import type { Currency } from '@/lib/types';
import { baseOption, categoryAxis, labelSize, moneyAxis, nColor, nOpacity, niceMax, type ChartContext, type CustomElement } from './shared';

export interface Dot {
  value: number;
  label: string;
  size: number;
  hollow?: boolean;
}

/** One connected pair per row. `n` drives the tint / faded treatment; `tooltip` is the finished HTML. */
export interface DotRow {
  id: string;
  name: string;
  color: string;
  n: number;
  a: Dot;
  b: Dot;
  midLabel?: string;
  subText?: string;
  tooltip: string;
}

interface Placed { dot: Dot; x: number; dy: number; align: 'left' | 'right' | 'center' }

/** Lighter than full hue so a small sample reads as tentative, darker than the dot tint so the text stays legible. */
const RATIO_TINT = 0.35;

/** `sides` flanks the pair; `above` puts each value over its own dot so every row reads the same way. */
export type LabelPlacement = 'sides' | 'above';

/**
 * Labels sit on the outer sides of the pair, measured from the outer edge of either dot so a big
 * hollow dot never runs into a small filled one. If the low label cannot fit left of the pair, it
 * moves above the row instead, clear of the high label.
 */
function place(row: DotRow, x: (usd: number) => number, left: number, scale: number): Placed[] {
  const pad = px(6, scale);
  const [lo, hi] = row.a.value <= row.b.value ? [row.a, row.b] : [row.b, row.a];
  const dots = [row.a, row.b];
  const leftEdge = Math.min(...dots.map(d => x(d.value) - d.size / 2)) - pad;
  const rightEdge = Math.max(...dots.map(d => x(d.value) + d.size / 2)) + pad;
  const fits = leftEdge - lo.label.length * labelSize(scale) * 0.55 >= left;
  const lift = Math.max(lo.size, hi.size) / 2 + px(16, scale);
  const loPlaced: Placed = fits
    ? { dot: lo, x: leftEdge, dy: 0, align: 'right' }
    : { dot: lo, x: Math.max(left, leftEdge), dy: -lift, align: 'left' };
  return [loPlaced, { dot: hi, x: rightEdge, dy: 0, align: 'left' }];
}

/** When the two values would touch, the higher one drops below the line so neither is hidden. */
function placeAbove(row: DotRow, x: (usd: number) => number, left: number, scale: number): Placed[] {
  const lift = Math.max(row.a.size, row.b.size) / 2 + labelSize(scale) / 2 + px(3, scale);
  const halfWidth = (dot: Dot) => (dot.label.length * labelSize(scale) * 0.55) / 2;
  const [lo, hi] = row.a.value <= row.b.value ? [row.a, row.b] : [row.b, row.a];
  const loX = Math.max(x(lo.value), left + halfWidth(lo));
  const hiX = Math.max(x(hi.value), left + halfWidth(hi));
  const clash = loX + halfWidth(lo) + px(8, scale) > hiX - halfWidth(hi);
  return [
    { dot: lo, x: loX, dy: -lift, align: 'center' },
    { dot: hi, x: hiX, dy: clash ? lift : -lift, align: 'center' },
  ];
}

function text(x: number, y: number, value: string, fill: string, size: number, weight: number, align: 'left' | 'right' | 'center', opacity = 1): CustomElement {
  return { type: 'text', silent: true, z2: 6, style: { x, y, text: value, fill, fontSize: size, fontWeight: weight, fontFamily: FONT_FAMILY, align: align, verticalAlign: 'middle', opacity } };
}

function circle(cx: number, cy: number, dot: Dot, color: string, scale: number, opacity: number): CustomElement {
  const style = dot.hollow
    ? { fill: '#fff', stroke: color, lineWidth: px(2, scale), opacity }
    : { fill: color, stroke: '#fff', lineWidth: px(1.5, scale), opacity };
  return { type: 'circle', shape: { cx, cy, r: dot.size / 2 }, style, z2: dot.hollow ? 4 : 5 };
}

function renderRow(rows: DotRow[], cur: Currency, scale: number, placement: LabelPlacement) {
  return (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn => {
    const idx = params.dataIndex;
    const row = rows[idx];
    const h = (api.size!([0, 1]) as number[])[1];
    const y0 = api.coord([0, idx])[1] - (row.subText ? h * 0.12 : 0);
    const x = (usd: number) => api.coord([toDisplay(usd, cur), idx])[0];
    const left = api.coord([0, idx])[0];
    const color = nColor(row.n, row.color);
    const opacity = nOpacity(row.n);
    const size = labelSize(scale);
    const placed = placement === 'above' ? placeAbove(row, x, left, scale) : place(row, x, left, scale);
    const children: CustomElement[] = [
      { type: 'line', silent: true, shape: { x1: x(row.a.value), y1: y0, x2: x(row.b.value), y2: y0 }, style: { stroke: color, lineWidth: px(2, scale), opacity } },
      circle(x(row.a.value), y0, row.a, color, scale, opacity),
      circle(x(row.b.value), y0, row.b, color, scale, opacity),
      ...placed.map(p => text(p.x, y0 + p.dy, p.dot.label, COLORS.sub, size, 700, p.align, opacity)),
    ];
    if (row.midLabel) {
      const columnX = api.getWidth() - px(16, scale);
      const ratioColor = row.n < SMALL_N ? lighten(row.color, RATIO_TINT) : row.color;
      children.push(text(columnX, y0, row.midLabel, ratioColor, size + px(2, scale), 800, 'right', opacity));
      if (idx === 0 && params.coordSys) {
        const top = (params.coordSys as unknown as { y: number }).y;
        children.push(text(columnX, top - px(10, scale), '% of US pay', COLORS.mute, size - px(1, scale), 700, 'right'));
      }
    }
    if (row.subText) {
      children.push(text(x(Math.min(row.a.value, row.b.value)) - Math.min(row.a.size, row.b.size) / 2, y0 + Math.max(h * 0.3, Math.max(row.a.size, row.b.size) / 2 + px(10, scale)), row.subText, COLORS.mute, size - 1, 600, 'left'));
    }
    return { type: 'group', children };
  };
}

export function dotRowsOption(ctx: ChartContext, rows: DotRow[], placement: LabelPlacement = 'sides'): EChartsOption {
  const cur = ctx.state.cur;
  const scale = ctx.scale;
  const base = baseOption(scale);
  const xMax = Math.max(...rows.flatMap(r => [r.a.value, r.b.value]));
  const ratioColumn = rows.some(r => r.midLabel);
  return {
    ...base,
    grid: { ...base.grid, right: px(ratioColumn ? 150 : 110, scale), top: px(placement === 'above' ? 44 : 28, scale), bottom: px(28, scale) },
    tooltip: { ...base.tooltip, formatter: (p: unknown) => (p as { data: { row: DotRow } }).data.row.tooltip },
    xAxis: moneyAxis(cur, scale, { min: 0, max: niceMax(toDisplay(xMax * 1.08, cur)) }),
    yAxis: categoryAxis(rows.map(r => r.name), scale, { inverse: true }),
    series: [{
      type: 'custom',
      name: 'dots',
      renderItem: renderRow(rows, cur, scale, placement),
      data: rows.map((row, i) => ({ value: [toDisplay(row.a.value, cur), i], row })),
    }],
  };
}
