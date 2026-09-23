import { formatMoney, formatN } from '@/lib/format';
import { BUCKET_COLORS, BUCKET_LABELS, STORY_N } from '@/lib/theme';
import { LEVELS, YOES, type Bucket, type Level, type Pct, type ToggleSlug, type Yoe } from '@/lib/types';
import { bandGroupsHeight, bandGroupsOption, type BandGroup, type BandItem } from './bandGroups';
import { ridgeOption, type RidgeRow } from './ridge';
import { emptySpec, nullPoolMessage, type ChartContext, type ChartSpec } from './shared';

const METRIC_LABEL = { tc: 'Total comp', base: 'Base' } as const;

function row(bucket: Bucket, pct: Pct): RidgeRow {
  return { id: `${bucket}:`, name: BUCKET_LABELS[bucket], pct, color: BUCKET_COLORS[bucket] };
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** OSS respects the company toggles so the hollow dot tracks the same pool as the filled one. */
function companyMedian(ctx: ChartContext, bucket: Bucket): RidgeRow['companyMedian'] {
  const values = ctx.snapshot.companies
    .filter(c => c.bucket === bucket && (ctx.state.toggles[c.slug as ToggleSlug] ?? true))
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

const HELP = [
  'Median: half the engineers earn less than this, half earn more.',
  'Band (p25–p75): the middle half of engineers sit inside this range.',
  'Thin line: the rest, up to 1.5× the band width.',
  'Hollow dot: median of the company medians. Shows if one big company pulls the pool.',
];

function subtitleFor(ctx: ChartContext): string {
  const metric = METRIC_LABEL[ctx.state.metric];
  const cutText = { all: 'all levels', level: 'by level', yoe: 'by experience' }[ctx.state.cut];
  return `${metric}, ${cutText}. Band = middle 50%, dot = median. Light tint = n<20.`;
}

function groupedSpec(ctx: ChartContext, groups: BandGroup[], subtitle: string): ChartSpec {
  const cur = ctx.state.cur;
  const cells = groups.flatMap(g => g.items.map(item => ({ g, item })));
  return {
    option: bandGroupsOption(ctx, groups),
    height: bandGroupsHeight(groups.length, ctx.scale),
    subtitle,
    help: HELP,
    legend: ctx.visible.filter(b => cells.some(c => c.item.id === b)),
    source: sourceLine(ctx),
    table: {
      columns: ['Band', 'Group', 'p25', 'Median', 'p75', 'n'],
      rows: cells.map(({ g, item }) => [g.name, item.name, formatMoney(item.pct.p25, cur), formatMoney(item.pct.p50, cur), formatMoney(item.pct.p75, cur), item.pct.n]),
    },
  };
}

function sourceLine(ctx: ChartContext): string {
  return `Levels.fyi pooled percentiles, ${ctx.visible.map(b => `${BUCKET_LABELS[b]} ${formatN(ctx.pools[b]?.n ?? 0)}`).join(' · ')}`;
}

const NOT_PULLED = 'Not pulled yet for this metric and cut. See scripts/pull.ts.';

export function buildHeadline(ctx: ChartContext): ChartSpec {
  const subtitle = subtitleFor(ctx);
  const missing = nullPoolMessage(ctx);
  if (missing) return emptySpec(subtitle, missing);
  if (ctx.state.cut !== 'all') {
    const groups = ctx.state.cut === 'level' ? levelGroups(ctx) : yoeGroups(ctx);
    return groups.length === 0 ? emptySpec(subtitle, NOT_PULLED) : groupedSpec(ctx, groups, subtitle);
  }
  const rows = allRows(ctx);
  if (rows.length === 0) return emptySpec(subtitle, NOT_PULLED);
  const cur = ctx.state.cur;
  return {
    option: ridgeOption(ctx, rows),
    subtitle,
    help: HELP,
    legend: ctx.visible.filter(b => rows.some(r => r.id.startsWith(`${b}:`))),
    source: sourceLine(ctx),
    table: {
      columns: ['Group', 'p25', 'Median', 'p75', 'n', 'Median of company medians'],
      rows: rows.map(r => [r.name, formatMoney(r.pct.p25, cur), formatMoney(r.pct.p50, cur), formatMoney(r.pct.p75, cur), r.pct.n,
        r.companyMedian ? `${formatMoney(r.companyMedian.value, cur)} (${r.companyMedian.count} cos.)` : '–']),
    },
  };
}
