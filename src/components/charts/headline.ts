import { formatMoney } from '@/lib/format';
import { BUCKET_COLORS, BUCKET_LABELS, STORY_N } from '@/lib/theme';
import { isExcluded } from '@/lib/companies';
import { LEVELS, YOES, type Bucket, type Level, type Pct, type Yoe } from '@/lib/types';
import { bandGroupsHeight, bandGroupsOption, type BandGroup, type BandItem } from './bandGroups';
import { ridgeOption, type RidgeRow } from './ridge';
import { RANGE_KEY, type KeyItem } from '@/lib/chartKey';
import { bucketCounts, emptySpec, metricName, nullPoolMessage, sourceLine, type ChartContext, type ChartSpec } from './shared';

function row(bucket: Bucket, pct: Pct): RidgeRow {
  return { id: `${bucket}:`, name: BUCKET_LABELS[bucket], pct, color: BUCKET_COLORS[bucket] };
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** OSS respects the group toggles so the hollow dot tracks the same pool as the filled one. */
function companyMedian(ctx: ChartContext, bucket: Bucket): RidgeRow['companyMedian'] {
  const values = ctx.snapshot.companies
    .filter(c => c.bucket === bucket && !isExcluded(c, ctx.state))
    .map(c => c[ctx.state.metric]?.p50)
    .filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return undefined;
  return { value: median(values), count: values.length };
}

function allRows(ctx: ChartContext): RidgeRow[] {
  return ctx.visible.flatMap(b => {
    const pool = ctx.pools[b];
    if (!pool) return [];
    const r = row(b, pool[ctx.state.metric].all);
    return [ctx.options.medianOfCompanies ? { ...r, companyMedian: companyMedian(ctx, b) } : r];
  });
}

function bandItems(ctx: ChartContext, pick: (b: Bucket) => Pct | undefined): BandItem[] {
  return ctx.visible.flatMap(b => {
    const pct = pick(b);
    if (!pct || pct.n < 0 || pct.p50 === null) return [];
    return [{ id: b, name: BUCKET_LABELS[b], pct, color: BUCKET_COLORS[b] }];
  });
}

function levelGroups(ctx: ChartContext): BandGroup[] {
  const pick = (level: Level) => (b: Bucket) => ctx.pools[b]?.[ctx.state.metric].byLevel?.[level];
  const shown = LEVELS.filter(level =>
    level === 'L1' || level === 'L2' || level === 'L3'
    || ctx.visible.some(b => (pick(level)(b)?.n ?? -1) >= STORY_N));
  return shown.map(level => ({ id: level, name: level, items: bandItems(ctx, pick(level)) })).filter(g => g.items.length > 0);
}

function yoeGroups(ctx: ChartContext): BandGroup[] {
  return YOES
    .map((yoe: Yoe) => ({ id: yoe, name: `${yoe} yrs`, items: bandItems(ctx, b => ctx.pools[b]?.[ctx.state.metric].byYoe?.[yoe]) }))
    .filter(g => g.items.length > 0);
}

function contextFor(ctx: ChartContext): string {
  const cutText = { all: 'all levels', level: 'by level', yoe: 'by years of experience' }[ctx.state.cut];
  return `${metricName(ctx)} · ${cutText}`;
}

function keyFor(ctx: ChartContext): KeyItem[] {
  const thin = RANGE_KEY.filter(k => k.glyph === 'tintBand');
  const companies = ctx.state.cut === 'all' && ctx.options.medianOfCompanies;
  return companies ? [...thin, { glyph: 'hollowDot', label: 'median of companies' }] : thin;
}

function groupedSpec(ctx: ChartContext, groups: BandGroup[], context: string): ChartSpec {
  const cur = ctx.state.cur;
  const cells = groups.flatMap(g => g.items.map(item => ({ g, item })));
  return {
    option: bandGroupsOption(ctx, groups),
    height: bandGroupsHeight(groups.length, ctx.scale),
    context,
    key: keyFor(ctx),
    legend: ctx.visible.filter(b => cells.some(c => c.item.id === b)),
    source: headlineSource(ctx),
    table: {
      columns: ['Band', 'Group', 'p25', 'p50', 'p75', 'Salaries'],
      rows: cells.map(({ g, item }) => [g.name, item.name, formatMoney(item.pct.p25, cur), formatMoney(item.pct.p50, cur), formatMoney(item.pct.p75, cur), item.pct.n]),
    },
  };
}

function headlineSource(ctx: ChartContext): string {
  return sourceLine(ctx, bucketCounts(ctx.visible, b => ctx.pools[b]?.n ?? 0));
}

const NOT_PULLED = 'Not pulled yet for this metric and cut. See scripts/pull.ts.';

export function buildHeadline(ctx: ChartContext): ChartSpec {
  const context = contextFor(ctx);
  const missing = nullPoolMessage(ctx);
  if (missing) return emptySpec(context, missing);
  if (ctx.state.cut !== 'all') {
    const groups = ctx.state.cut === 'level' ? levelGroups(ctx) : yoeGroups(ctx);
    return groups.length === 0 ? emptySpec(context, NOT_PULLED) : groupedSpec(ctx, groups, context);
  }
  const rows = allRows(ctx);
  if (rows.length === 0) return emptySpec(context, NOT_PULLED);
  const cur = ctx.state.cur;
  return {
    option: ridgeOption(ctx, rows),
    context,
    key: keyFor(ctx),
    legend: ctx.visible.filter(b => rows.some(r => r.id.startsWith(`${b}:`))),
    source: headlineSource(ctx),
    table: {
      columns: ['Group', 'p25', 'p50', 'p75', 'Salaries', 'Median of company medians'],
      rows: rows.map(r => [r.name, formatMoney(r.pct.p25, cur), formatMoney(r.pct.p50, cur), formatMoney(r.pct.p75, cur), r.pct.n,
        r.companyMedian ? `${formatMoney(r.companyMedian.value, cur)} (${r.companyMedian.count} cos.)` : '–']),
    },
  };
}
