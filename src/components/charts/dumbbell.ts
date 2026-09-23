import type { EChartsOption } from 'echarts';
import { toDisplay } from '@/lib/format';
import { COLORS, STORY_N, STORY_OPACITY, px, withAlpha } from '@/lib/theme';
import type { Currency, Pct } from '@/lib/types';
import { baseOption, categoryAxis, labelSize, medianLabel, moneyAxis, nColor, pctRows, storyNote, tooltipBox } from './shared';

export interface DumbbellRow {
  id: string;
  name: string;
  pct: Pct;
  color: string;
  hint?: string;
  off?: boolean;
}

interface RowItem {
  value: number;
  row: DumbbellRow;
}

function rowOpacity(row: DumbbellRow): number {
  if (row.off) return 0.5;
  if (row.pct.n >= 0 && row.pct.n < STORY_N) return STORY_OPACITY;
  return 1;
}

function rowColor(row: DumbbellRow): string {
  return row.off ? COLORS.grayBar : nColor(row.pct.n, row.color);
}

function rangeLabel(row: DumbbellRow, cur: Currency): string {
  const prefix = row.pct.approx ? '≈ ' : '';
  return `${prefix}${medianLabel(row.pct.p50, row.pct.n, cur)}`;
}

const TOGGLE_HINT = '⇄';

function axisName(rows: DumbbellRow[], name: string): string {
  const row = rows.find(r => r.name === name);
  return row?.hint ? `${name} {hint|${TOGGLE_HINT}}` : name;
}

export function dumbbellTooltip(row: DumbbellRow, cur: Currency): string {
  const p = row.pct;
  const rows = pctRows(p, cur);
  if (row.off) rows.push({ label: 'OSS pool', value: 'excluded' });
  const notes = [p.approx ? 'Median of company medians (approx.)' : '', storyNote(p.n), row.hint ?? ''].filter(Boolean);
  return tooltipBox(row.color, row.name, rows, notes.join('<br/>'));
}

const DENSITY_CAP = 60;

/** min(n, 60) dots spread evenly over p25–p75 so the band's weight reads as n; deterministic, no jitter. */
function densityData(rows: DumbbellRow[], cur: Currency) {
  return rows.flatMap(row => {
    const count = Math.min(Math.max(row.pct.n, 0), DENSITY_CAP);
    const span = row.pct.p75 - row.pct.p25;
    return Array.from({ length: count }, (_, i) => ({
      value: [toDisplay(row.pct.p25 + (span * (i + 0.5)) / count, cur), row.name],
      row,
      itemStyle: { color: rowColor(row), opacity: rowOpacity(row) * 0.6 },
    }));
  });
}

export function dumbbellOption(rows: DumbbellRow[], cur: Currency, scale: number, barWidth = 18): EChartsOption {
  const base = baseOption(scale);
  const names = rows.map(r => r.name);
  const bw = px(barWidth, scale);
  const rangeData: RowItem[] = rows.map(row => ({ value: toDisplay(row.pct.p75 - row.pct.p25, cur), row }));
  const offsetData: RowItem[] = rows.map(row => ({ value: toDisplay(row.pct.p25, cur), row }));
  const medianData = rows.map(row => ({
    value: [toDisplay(row.pct.p50 ?? row.pct.p25, cur), row.name],
    row,
    itemStyle: { color: rowColor(row), opacity: rowOpacity(row) },
  }));
  return {
    ...base,
    grid: { ...base.grid, right: px(150, scale) },
    tooltip: {
      ...base.tooltip,
      formatter: (params: unknown) => dumbbellTooltip((params as { data: RowItem }).data.row, cur),
    },
    xAxis: moneyAxis(cur, scale),
    yAxis: categoryAxis(names, scale, { inverse: true, triggerEvent: true,
      axisLabel: { color: COLORS.sub, fontSize: labelSize(scale), fontWeight: 600, formatter: (name: string) => axisName(rows, name), rich: { hint: { color: COLORS.mute, fontSize: labelSize(scale) - 1 } } } }),
    series: [
      {
        type: 'bar',
        name: 'offset',
        stack: 'range',
        barWidth: bw,
        silent: true,
        itemStyle: { color: 'transparent' },
        emphasis: { disabled: true },
        data: offsetData,
      },
      {
        type: 'bar',
        name: 'p25–p75',
        stack: 'range',
        barWidth: bw,
        itemStyle: { borderRadius: 4 },
        data: rangeData.map(item => ({
          ...item,
          itemStyle: { color: withAlpha(rowColor(item.row), 0.35), opacity: rowOpacity(item.row) },
        })),
        label: {
          show: true,
          position: 'right',
          color: COLORS.sub,
          fontSize: labelSize(scale),
          fontWeight: 600,
          formatter: (params: unknown) => rangeLabel((params as { data: RowItem }).data.row, cur),
        },
      },
      {
        type: 'scatter',
        name: 'density',
        symbolSize: px(3.5, scale),
        data: densityData(rows, cur),
        z: 8,
      },
      {
        type: 'scatter',
        name: 'median',
        symbol: 'rect',
        symbolSize: [px(4, scale), bw + px(8, scale)],
        data: medianData,
        z: 10,
      },
    ],
  };
}
