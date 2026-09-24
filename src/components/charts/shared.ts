import type { CustomSeriesRenderItemReturn, EChartsOption } from 'echarts';
import type { CardOptions } from '@/lib/cardOptions.types';
import type { KeyItem } from '@/lib/chartKey';
import type { PoolMap } from '@/lib/pools';
import { ANIMATION_MS, BUCKET_LABELS, COLORS, FONT_FAMILY, SMALL_N, STORY_N, STORY_OPACITY, WATERMARK, lighten, px } from '@/lib/theme';
import { axisMoney, formatMoney, formatSalaries, windowText } from '@/lib/format';
import type { Bucket, Currency, FilterState, Pct, Snapshot, TableData } from '@/lib/types';

export type CustomElement = NonNullable<CustomSeriesRenderItemReturn>;

export interface ChartContext {
  snapshot: Snapshot;
  state: FilterState;
  pools: PoolMap;
  visible: Bucket[];
  scale: number;
  options: CardOptions;
}

export interface ChartSpec {
  option: EChartsOption | null;
  table: TableData;
  /** Metric and cut, e.g. "Total comp · all levels"; shown above the title. */
  context: string;
  /** The marks this chart draws, shown as glyphs next to the bucket legend. */
  key: KeyItem[];
  source: string;
  legend?: Bucket[];
  help?: string[];
  missing?: string;
  /** Overrides the card's default chart height when the row count drives it. */
  height?: number;
  /** Charts that draw a middle-50% band show a worked example of how to read it. */
  guide?: 'dot' | 'tick';
}

const TINT = 0.55;
const BLUR_OPACITY = 0.25;

export function labelSize(scale: number): number {
  return px(13, scale);
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function baseOption(scale: number): EChartsOption {
  return {
    textStyle: { fontFamily: FONT_FAMILY, color: COLORS.ink },
    color: [COLORS.blue, COLORS.amber, COLORS.green, COLORS.slate],
    animation: !reducedMotion(),
    animationDuration: ANIMATION_MS,
    animationDurationUpdate: ANIMATION_MS,
    animationEasingUpdate: 'cubicOut',
    grid: { left: px(16, scale), right: px(24, scale), top: px(36, scale), bottom: px(16, scale), containLabel: true },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: COLORS.grid,
      borderWidth: 1,
      padding: 12,
      textStyle: { fontFamily: FONT_FAMILY, color: COLORS.ink },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,.08); border-radius: 8px;',
    },
    graphic: [watermark(scale)],
  };
}

export function watermark(scale: number) {
  return {
    type: 'image' as const,
    right: px(8, scale),
    bottom: px(4, scale),
    z: 100,
    silent: true,
    style: { image: WATERMARK, width: px(84, scale), height: px(20, scale), opacity: 0.55 },
  };
}

export function categoryAxis(data: string[], scale: number, extra: Record<string, unknown> = {}) {
  return {
    type: 'category' as const,
    data,
    axisTick: { show: false },
    axisLine: { lineStyle: { color: COLORS.grid } },
    axisLabel: { color: COLORS.sub, fontSize: labelSize(scale), fontWeight: 600 as const },
    ...extra,
  };
}

export function valueAxis(scale: number, formatter: (v: number) => string, extra: Record<string, unknown> = {}) {
  return {
    type: 'value' as const,
    splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' as const } },
    axisLabel: { color: COLORS.mute, fontSize: labelSize(scale), formatter },
    ...extra,
  };
}

export function moneyAxis(cur: Currency, scale: number, extra: Record<string, unknown> = {}) {
  return valueAxis(scale, v => axisMoney(v, cur), extra);
}

export function pctAxis(scale: number, extra: Record<string, unknown> = {}) {
  return valueAxis(scale, v => `${v}%`, { max: 100, ...extra });
}

/** n < 20 keeps the bucket hue as a light tint so the legend still explains the row. */
export function nColor(n: number, color: string): string {
  return n >= 0 && n < SMALL_N ? lighten(color, TINT) : color;
}

/** Axis-label marker after company names that the chart can toggle in or out of the OSS pool. */
export function filterMark(name: string, toggleable: boolean): string {
  return toggleable ? `${name} {mark|filter}` : name;
}

export function filterMarkRich(scale: number) {
  return {
    mark: { color: COLORS.blue, backgroundColor: lighten(COLORS.blue, 0.88), borderRadius: 3, padding: [1, 4], fontSize: labelSize(scale) - 3, fontWeight: 700 as const },
  };
}

/** Thin or excluded companies keep a light tint of their own bucket colour so no row turns grey. */
export function thinColor(n: number, color: string, off = false): string {
  if (off || (n >= 0 && n < STORY_N)) return lighten(color, 0.7);
  return nColor(n, color);
}

export function medianLabel(p50: number | null, n: number, cur: Currency): string {
  return `${formatMoney(p50, cur)} (${formatSalaries(n)})`;
}

/** For charts where "(103 salaries)" does not fit; the help popover says what the number is. */
export function shortMedianLabel(p50: number | null, n: number, cur: Currency): string {
  return `${formatMoney(p50, cur)} (${n.toLocaleString('en-US')})`;
}

export function metricName(ctx: ChartContext): string {
  return ctx.state.metric === 'tc' ? 'Total comp' : 'Base salary';
}

export function sourceLine(ctx: ChartContext, detail: string, where = 'in India'): string {
  return `Levels.fyi, software engineers ${where}, ${windowText(ctx.snapshot.meta.pulledAt)}. ${detail}`;
}

/** "259 OSS, 9,395 FAANG+ and 2,060 Indian product salaries." */
export function bucketCounts(buckets: Bucket[], count: (b: Bucket) => number): string {
  const parts = buckets.map(b => `${count(b).toLocaleString('en-US')} ${BUCKET_LABELS[b]}`);
  if (parts.length === 0) return '';
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `${list} salaries.`;
}

export function nOpacity(n: number): number {
  return n >= 0 && n < STORY_N ? STORY_OPACITY : 1;
}

/** Dot area tracks n: sqrt scale between 6px and 28px, then present-mode scaled. */
export function sqrtSize(n: number, maxN: number, scale: number): number {
  const t = maxN > 0 ? Math.sqrt(Math.max(n, 0) / maxN) : 0;
  return px(6 + 22 * t, scale);
}

/** Rounds an axis max up to the leading digit so the last tick is a round number. */
export function niceMax(value: number): number {
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
}

/** Hover dims the other series' marks but never their text, so direct labels stay readable. */
export function lineFocus() {
  return {
    emphasis: { focus: 'series' as const, blurScope: 'coordinateSystem' as const },
    blur: { lineStyle: { opacity: BLUR_OPACITY }, itemStyle: { opacity: BLUR_OPACITY }, label: { opacity: 1 }, endLabel: { opacity: 1 } },
  };
}

export function endLabel(color: string, scale: number, formatter: () => string) {
  return {
    show: true,
    formatter,
    fontSize: labelSize(scale),
    fontWeight: 700 as const,
    color,
    offset: [px(8, scale), 0],
    textBorderColor: '#fff',
    textBorderWidth: 2,
  };
}

export interface TooltipRow {
  label: string;
  value: string;
}

/** HTML for `tooltip.formatter`; the `.tt-*` classes live in index.css. */
export function tooltipBox(color: string, title: string, rows: TooltipRow[], note = ''): string {
  const grid = rows.map(r => `<span class="tt-label">${r.label}</span><span class="tt-value">${r.value}</span>`).join('');
  const foot = note ? `<div class="tt-note">${note}</div>` : '';
  return `<div class="tt"><div class="tt-title"><span class="tt-swatch" style="background:${color}"></span>${title}</div><div class="tt-grid">${grid}</div>${foot}</div>`;
}

export function pctRows(p: Pct, cur: Currency): TooltipRow[] {
  return [
    { label: 'Median', value: formatMoney(p.p50, cur) },
    { label: 'Middle 50%', value: `${formatMoney(p.p25, cur)} – ${formatMoney(p.p75, cur)}` },
    { label: 'Salaries (n)', value: p.n < 0 ? 'predicted' : p.n.toLocaleString('en-US') },
  ];
}

export function emptySpec(context: string, missing: string): ChartSpec {
  return { option: null, table: { columns: [], rows: [] }, context, key: [], source: '', missing };
}

export function visibleWithPools(ctx: ChartContext): Bucket[] {
  return ctx.visible.filter(b => ctx.pools[b] !== null);
}

export function nullPoolMessage(ctx: ChartContext): string | undefined {
  const missing = ctx.visible.filter(b => ctx.pools[b] === null);
  if (missing.length === 0) return undefined;
  return 'This OSS toggle combination is not pulled yet. Run scripts/pull.ts to fill it.';
}
