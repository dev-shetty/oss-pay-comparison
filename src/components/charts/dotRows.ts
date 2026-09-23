import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn, EChartsOption } from 'echarts';
import { toDisplay } from '@/lib/format';
import { COLORS, FONT_FAMILY, SMALL_N, px } from '@/lib/theme';
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

/** The low label sits left of its dot unless that runs into the axis, then it moves above the dot. */
function place(row: DotRow, x: (usd: number) => number, left: number, scale: number): Placed[] {
  const pad = px(6, scale);
  const [lo, hi] = row.a.value <= row.b.value ? [row.a, row.b] : [row.b, row.a];
  const loEdge = x(lo.value) - lo.size / 2 - pad;
  const fits = loEdge - lo.label.length * labelSize(scale) * 0.55 >= left;
  const loPlaced: Placed = fits
    ? { dot: lo, x: loEdge, dy: 0, align: 'right' }
    : { dot: lo, x: x(lo.value), dy: -(lo.size / 2 + px(10, scale)), align: 'center' };
  return [loPlaced, { dot: hi, x: x(hi.value) + hi.size / 2 + pad, dy: 0, align: 'left' }];
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

function renderRow(rows: DotRow[], cur: Currency, scale: number) {
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
    const children: CustomElement[] = [
      { type: 'line', silent: true, shape: { x1: x(row.a.value), y1: y0, x2: x(row.b.value), y2: y0 }, style: { stroke: color, lineWidth: px(2, scale), opacity } },
      circle(x(row.a.value), y0, row.a, color, scale, opacity),
      circle(x(row.b.value), y0, row.b, color, scale, opacity),
      ...place(row, x, left, scale).map(p => text(p.x, y0 + p.dy, p.dot.label, COLORS.sub, size, 700, p.align, opacity)),
    ];
    if (row.midLabel) {
      const mid = (x(row.a.value) + x(row.b.value)) / 2;
      const lift = Math.max(row.a.size, row.b.size) / 2 + px(9, scale);
      children.push(text(mid, y0 - lift, row.midLabel, row.n < SMALL_N ? COLORS.sub : row.color, size, 800, 'center', opacity));
    }
    if (row.subText) {
      children.push(text(x(Math.min(row.a.value, row.b.value)) - Math.min(row.a.size, row.b.size) / 2, y0 + h * 0.3, row.subText, COLORS.mute, size - 1, 600, 'left'));
    }
    return { type: 'group', children };
  };
}

export function dotRowsOption(ctx: ChartContext, rows: DotRow[]): EChartsOption {
  const cur = ctx.state.cur;
  const scale = ctx.scale;
  const base = baseOption(scale);
  const xMax = Math.max(...rows.flatMap(r => [r.a.value, r.b.value]));
  return {
    ...base,
    grid: { ...base.grid, right: px(110, scale), top: px(28, scale), bottom: px(28, scale) },
    tooltip: { ...base.tooltip, formatter: (p: unknown) => (p as { data: { row: DotRow } }).data.row.tooltip },
    xAxis: moneyAxis(cur, scale, { min: 0, max: niceMax(toDisplay(xMax * 1.08, cur)) }),
    yAxis: categoryAxis(rows.map(r => r.name), scale, { inverse: true }),
    series: [{
      type: 'custom',
      name: 'dots',
      renderItem: renderRow(rows, cur, scale),
      data: rows.map((row, i) => ({ value: [toDisplay(row.a.value, cur), i], row })),
    }],
  };
}
