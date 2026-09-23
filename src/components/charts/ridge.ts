import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn, EChartsOption } from 'echarts';
import { formatMoney, toDisplay } from '@/lib/format';
import { COLORS, SMALL_N, px, withAlpha } from '@/lib/theme';
import type { Currency, Pct } from '@/lib/types';
import { baseOption, categoryAxis, labelSize, medianLabel, moneyAxis, nColor, nOpacity, pctRows, storyNote, tooltipBox, niceMax, type ChartContext, type CustomElement } from './shared';

/** The API adds p10/p90 on some pulls; the frozen Pct type does not carry them. */
export type WidePct = Pct & { p10?: number; p90?: number };

export interface RidgeRow {
  id: string;
  name: string;
  pct: WidePct;
  color: string;
  companyMedian?: { value: number; count: number };
}

interface Extent { lo: number; hi: number }

const SAMPLES = 48;
const SMOOTH_PASSES = 3;

export function rowExtent(p: WidePct): Extent {
  if (p.p10 !== undefined && p.p90 !== undefined) {
    return { lo: Math.max(0, p.p10 - (p.p25 - p.p10)), hi: p.p90 + (p.p90 - p.p75) };
  }
  const iqr = p.p75 - p.p25;
  return { lo: Math.max(0, p.p25 - 1.5 * iqr), hi: p.p75 + 1.5 * iqr };
}

function stepDensity(p: WidePct, x: number, ext: Extent): number {
  const knots = [p.p10!, p.p25, p.p50 ?? (p.p25 + p.p75) / 2, p.p75, p.p90!];
  const masses = [0.15, 0.25, 0.25, 0.15];
  for (let i = 0; i < masses.length; i += 1) {
    if (x >= knots[i] && x <= knots[i + 1]) return masses[i] / Math.max(knots[i + 1] - knots[i], 1);
  }
  if (x < knots[0]) return (0.1 / Math.max(knots[0] - ext.lo, 1)) * ((x - ext.lo) / Math.max(knots[0] - ext.lo, 1));
  return (0.1 / Math.max(ext.hi - knots[4], 1)) * ((ext.hi - x) / Math.max(ext.hi - knots[4], 1));
}

function smooth(ys: number[]): number[] {
  const out = ys.slice();
  for (let pass = 0; pass < SMOOTH_PASSES; pass += 1) {
    const prev = out.slice();
    for (let i = 0; i < prev.length; i += 1) {
      const win = [prev[i - 2], prev[i - 1], prev[i], prev[i + 1], prev[i + 2]].filter(v => v !== undefined);
      out[i] = win.reduce((s, v) => s + v, 0) / win.length;
    }
  }
  const max = Math.max(...out, 1e-9);
  return out.map(v => v / max);
}

/** Deterministic density-like outline sampled from the quantiles; y is normalised to [0, 1]. */
export function ridgeShape(p: WidePct): [number, number][] {
  const ext = rowExtent(p);
  const xs = Array.from({ length: SAMPLES }, (_, i) => ext.lo + ((ext.hi - ext.lo) * i) / (SAMPLES - 1));
  const ys = smooth(xs.map(x => stepDensity(p, x, ext)));
  return xs.map((x, i) => [x, ys[i]]);
}

function hasShape(p: WidePct): boolean {
  return p.p10 !== undefined && p.p90 !== undefined;
}

function ridgePolygon(row: RidgeRow, api: CustomSeriesRenderItemAPI, idx: number, cur: Currency, y0: number, peak: number, fill: string, opacity: number) {
  const points = ridgeShape(row.pct).map(([x, d]) => [api.coord([toDisplay(x, cur), idx])[0], y0 - d * peak]);
  const first = points[0][0];
  const last = points[points.length - 1][0];
  return { type: 'polygon' as const, shape: { points: [[first, y0], ...points, [last, y0]], smooth: 0.3 }, style: { fill, opacity }, silent: true };
}

function renderRow(rows: RidgeRow[], cur: Currency, scale: number) {
  return (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn => {
    const idx = params.dataIndex;
    const row = rows[idx];
    const p = row.pct;
    const h = (api.size!([0, 1]) as number[])[1];
    const y0 = api.coord([0, idx])[1] + h * 0.22;
    const x = (usd: number) => api.coord([toDisplay(usd, cur), idx])[0];
    const color = nColor(p.n, row.color);
    const opacity = nOpacity(p.n);
    const bandH = Math.min(h * 0.24, px(16, scale));
    const r = Math.min(h * 0.16, px(7, scale));
    const ext = rowExtent(p);
    const children: CustomElement[] = [];
    if (hasShape(p)) children.push(ridgePolygon(row, api, idx, cur, y0, h * 0.62, withAlpha(color, 0.22), opacity));
    children.push({ type: 'line', shape: { x1: x(ext.lo), y1: y0, x2: x(ext.hi), y2: y0 }, style: { stroke: color, lineWidth: px(1.5, scale), opacity: opacity * 0.7 }, silent: true });
    children.push({ type: 'rect', shape: { x: x(p.p25), y: y0 - bandH / 2, width: x(p.p75) - x(p.p25), height: bandH, r: bandH / 2 }, style: { fill: withAlpha(color, 0.6), opacity } });
    if (p.p50 !== null) {
      children.push({ type: 'circle', shape: { cx: x(p.p50), cy: y0, r }, style: { fill: color, stroke: '#fff', lineWidth: px(2, scale), opacity }, z2: 5 });
      const label = medianLabel(p.p50, p.n, cur);
      const left = api.coord([0, idx])[0];
      const clipped = x(p.p50) - (label.length * labelSize(scale) * 0.55) / 2 < left;
      children.push({ type: 'text', style: { x: clipped ? left : x(p.p50), y: y0 - bandH / 2 - px(4, scale), text: label, align: clipped ? 'left' : 'center', verticalAlign: 'bottom', fill: p.n < SMALL_N ? COLORS.sub : row.color, fontSize: labelSize(scale), fontWeight: 800, fontFamily: 'Nunito', opacity }, silent: true, z2: 6 });
    }
    if (row.companyMedian) {
      children.push({ type: 'circle', shape: { cx: x(row.companyMedian.value), cy: y0, r }, style: { fill: '#fff', stroke: row.color, lineWidth: px(2, scale), opacity }, z2: 6 });
    }
    return { type: 'group', children };
  };
}

export function ridgeTooltip(row: RidgeRow, cur: Currency): string {
  const p = row.pct;
  const cm = row.companyMedian;
  const rows = pctRows(p, cur);
  if (hasShape(p)) rows.push({ label: 'p10 – p90', value: `${formatMoney(p.p10, cur)} – ${formatMoney(p.p90, cur)}` });
  if (cm) rows.push({ label: `Company-median (${cm.count} cos.)`, value: formatMoney(cm.value, cur) });
  return tooltipBox(row.color, row.name, rows, storyNote(p.n));
}

export function ridgeOption(ctx: ChartContext, rows: RidgeRow[]): EChartsOption {
  const cur = ctx.state.cur;
  const scale = ctx.scale;
  const base = baseOption(scale);
  const xMax = Math.max(...rows.map(r => rowExtent(r.pct).hi), ...rows.map(r => r.companyMedian?.value ?? 0));
  return {
    ...base,
    grid: { ...base.grid, right: px(48, scale), top: px(28, scale), bottom: px(28, scale) },
    tooltip: { ...base.tooltip, formatter: (p: unknown) => ridgeTooltip((p as { data: { row: RidgeRow } }).data.row, cur) },
    xAxis: moneyAxis(cur, scale, { min: 0, max: niceMax(toDisplay(xMax * 1.05, cur)) }),
    yAxis: categoryAxis(rows.map(r => r.name), scale, { inverse: true }),
    series: [{
      type: 'custom',
      name: 'ridge',
      renderItem: renderRow(rows, cur, scale),
      data: rows.map((row, i) => ({ value: [toDisplay(row.pct.p50 ?? row.pct.p25, cur), i], row })),
    }],
  };
}
