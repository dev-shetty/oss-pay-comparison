import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn, EChartsOption } from 'echarts';
import { formatMoney } from '@/lib/format';
import { COLORS, FONT_FAMILY, SMALL_N, px } from '@/lib/theme';
import { YOES, type Currency, type Pct, type Yoe } from '@/lib/types';
import { baseOption, categoryAxis, filterMark, filterMarkRich, labelSize, pctRows, thinColor, tooltipBox, type ChartContext, type CustomElement } from './shared';

/** One company row; `bands` holds only the YoE buckets the API returned. */
export interface YoeRow {
  id: string;
  name: string;
  color: string;
  off?: boolean;
  hint?: string;
  badge?: string;
  bands: Partial<Record<Yoe, Pct>>;
}

interface Datum { value: [number, number]; row: YoeRow; yoe: Yoe | null }

export const MIN_BANDS = 2;
const ROW_PX = 46;
const NOT_ENOUGH = 'not enough salaries by experience';

export function hasEnoughBands(row: YoeRow): boolean {
  return Object.keys(row.bands).length >= MIN_BANDS;
}

export function yoeRowsHeight(rowCount: number, scale: number): number {
  return px(ROW_PX * rowCount + 80, scale);
}

function rowColor(row: YoeRow, n: number): string {
  return thinColor(n, row.color, row.off);
}

function rowOpacity(row: YoeRow): number {
  return row.off ? 0.6 : 1;
}

function text(x: number, y: number, value: string, fill: string, size: number, weight: number, opacity = 1): CustomElement {
  return { type: 'text', silent: true, z2: 6, style: { x, y, text: value, fill, fontSize: size, fontWeight: weight, fontFamily: FONT_FAMILY, align: 'left', verticalAlign: 'middle', opacity } };
}

/** Every row shares one value scale so a flat line means flat pay, not a rescaled row. */
function renderItem(data: Datum[], maxP50: number, cur: Currency, scale: number) {
  return (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn => {
    const d = data[params.dataIndex];
    const { row, yoe } = d;
    const rowIdx = d.value[1];
    const h = (api.size!([0, 1]) as number[])[1];
    const centerY = api.coord([0, rowIdx])[1];
    const size = labelSize(scale);
    if (yoe === null) {
      const x0 = api.coord([0, rowIdx])[0] - px(14, scale);
      return text(x0, centerY, NOT_ENOUGH, COLORS.mute, size - 1, 600);
    }
    const pct = row.bands[yoe]!;
    const yOf = (p: Pct) => centerY + h * 0.36 - ((p.p50 ?? 0) / maxP50) * h * 0.72;
    const xOf = (band: Yoe) => api.coord([YOES.indexOf(band), rowIdx])[0];
    const color = rowColor(row, pct.n);
    const opacity = rowOpacity(row);
    const children: CustomElement[] = [];
    const prev = YOES[YOES.indexOf(yoe) - 1];
    const prevPct = prev ? row.bands[prev] : undefined;
    if (prevPct) {
      children.push({ type: 'line', silent: true, shape: { x1: xOf(prev), y1: yOf(prevPct), x2: xOf(yoe), y2: yOf(pct) }, style: { stroke: color, lineWidth: px(1.5, scale), opacity: opacity * 0.8 } });
    }
    children.push({ type: 'circle', shape: { cx: xOf(yoe), cy: yOf(pct), r: px(4, scale) }, style: { fill: color, stroke: '#fff', lineWidth: px(1.5, scale), opacity }, z2: 5 });
    const isLast = YOES.slice(YOES.indexOf(yoe) + 1).every(b => !row.bands[b]);
    if (isLast) {
      const fill = row.off || pct.n < SMALL_N ? COLORS.sub : row.color;
      children.push(text(xOf(yoe) + px(9, scale), yOf(pct), formatMoney(pct.p50, cur), fill, size, 800, opacity));
    }
    return { type: 'group', children };
  };
}

function tooltipFor({ row, yoe }: Datum, cur: Currency): string {
  if (yoe === null) return tooltipBox(row.color, row.name, [], `${NOT_ENOUGH} (fewer than ${MIN_BANDS} bands with n ≥ 5)`);
  const pct = row.bands[yoe]!;
  const rows = pctRows(pct, cur);
  if (row.off) rows.push({ label: 'OSS pool', value: 'excluded' });
  const notes = [row.hint ?? ''].filter(Boolean);
  return tooltipBox(row.color, `${row.name} · ${yoe} yrs`, rows, notes.join('<br/>'));
}

function axisName(rows: YoeRow[], name: string): string {
  const row = rows.find(r => r.name === name);
  return filterMark(name, row?.badge, row?.off);
}

function toData(rows: YoeRow[]): Datum[] {
  return rows.flatMap((row, i) => {
    if (!hasEnoughBands(row)) return [{ value: [0, i] as [number, number], row, yoe: null }];
    return YOES.filter(b => row.bands[b]).map((yoe): Datum => ({ value: [YOES.indexOf(yoe), i], row, yoe }));
  });
}

export function companyYoeOption(ctx: ChartContext, rows: YoeRow[]): EChartsOption {
  const cur = ctx.state.cur;
  const scale = ctx.scale;
  const base = baseOption(scale);
  const data = toData(rows);
  const maxP50 = Math.max(1, ...data.map(d => (d.yoe ? d.row.bands[d.yoe]!.p50 ?? 0 : 0)));
  return {
    ...base,
    grid: { ...base.grid, right: px(90, scale), top: px(36, scale), bottom: px(12, scale) },
    tooltip: { ...base.tooltip, formatter: (p: unknown) => tooltipFor((p as { data: Datum }).data, cur) },
    xAxis: { ...categoryAxis(YOES.map(y => `${y} yrs`), scale, { position: 'top', boundaryGap: true }), splitLine: { show: true, lineStyle: { color: COLORS.grid, type: 'dashed' } } },
    yAxis: categoryAxis(rows.map(r => r.name), scale, { inverse: true, triggerEvent: true, splitLine: { show: true, lineStyle: { color: COLORS.grid } },
      axisLabel: { color: COLORS.sub, fontSize: labelSize(scale), fontWeight: 600, formatter: (name: string) => axisName(rows, name), rich: filterMarkRich(scale) } }),
    series: [{ type: 'custom', name: 'yoe', renderItem: renderItem(data, maxP50, cur, scale), data }],
  };
}
