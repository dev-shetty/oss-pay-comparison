import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn, EChartsOption } from 'echarts';
import { formatMoney, toDisplay } from '@/lib/format';
import { COLORS, SMALL_N, px, withAlpha } from '@/lib/theme';
import type { Currency, Pct } from '@/lib/types';
import { baseOption, categoryAxis, labelSize, medianLabel, moneyAxis, nColor, nOpacity, pctRows, tooltipBox, niceMax, type ChartContext, type CustomElement } from './shared';

export interface RidgeRow {
  id: string;
  name: string;
  pct: Pct;
  color: string;
  companyMedian?: { value: number; count: number };
}

type ShapedPct = Pct & { p10: number; p90: number };


function hasShape(p: Pct): p is ShapedPct {
  return p.p10 !== undefined && p.p90 !== undefined;
}

function rowRight(p: Pct): number {
  return hasShape(p) ? p.p90 : p.p75;
}

function renderRow(rows: RidgeRow[], cur: Currency, scale: number) {
  return (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn => {
    const idx = params.dataIndex;
    const row = rows[idx];
    const p = row.pct;
    const h = (api.size!([0, 1]) as number[])[1];
    const y0 = api.coord([0, idx])[1] + h * 0.12;
    const x = (usd: number) => api.coord([toDisplay(usd, cur), idx])[0];
    const color = nColor(p.n, row.color);
    const opacity = nOpacity(p.n);
    const bandH = Math.min(h * 0.24, px(16, scale));
    const r = Math.min(h * 0.16, px(7, scale));
    const children: CustomElement[] = [];
    if (hasShape(p)) {
      children.push({ type: 'line', shape: { x1: x(p.p10), y1: y0, x2: x(p.p90), y2: y0 }, style: { stroke: color, lineWidth: px(1.5, scale), opacity: opacity * 0.7 }, silent: true });
    }
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
  if (cm) rows.push({ label: `Company-median (${cm.count} cos.)`, value: formatMoney(cm.value, cur) });
  return tooltipBox(row.color, row.name, rows);
}

export function ridgeOption(ctx: ChartContext, rows: RidgeRow[]): EChartsOption {
  const cur = ctx.state.cur;
  const scale = ctx.scale;
  const base = baseOption(scale);
  const xMax = Math.max(...rows.map(r => rowRight(r.pct)), ...rows.map(r => r.companyMedian?.value ?? 0));
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
