import { formatMoney, formatSalaries } from '@/lib/format';
import { BUCKET_COLORS, BUCKET_LABELS } from '@/lib/theme';
import { isExcluded } from '@/lib/companies';
import { GROUP_LABELS, GROUP_SHORT } from '@/lib/groups';
import { BUCKETS, OSS_GROUPS, YOES, type Company } from '@/lib/types';
import { companyYoeOption, hasEnoughBands, yoeRowsHeight, type YoeRow } from './companyYoe';
import { dumbbellOption, type DumbbellRow } from './dumbbell';
import type { KeyItem } from '@/lib/chartKey';
import { metricName, sourceLine, type ChartContext, type ChartSpec } from './shared';

interface Entry { company: Company; off: boolean; hint?: string; badge?: string }

function groupHint(company: Company): string | undefined {
  return company.group ? `${GROUP_LABELS[company.group]}. Click the name to remove the whole group from OSS, or add it back` : undefined;
}

function entries(ctx: ChartContext): Entry[] {
  const { metric, sort } = ctx.state;
  const list = ctx.snapshot.companies
    .filter(c => ctx.visible.includes(c.bucket) && c[metric] !== null)
    .map((company): Entry => ({ company, off: isExcluded(company, ctx.state), hint: groupHint(company), badge: company.group ? GROUP_SHORT[company.group] : undefined }));
  const byValue = (a: Entry, b: Entry) => (b.company[metric]?.p50 ?? 0) - (a.company[metric]?.p50 ?? 0);
  if (sort === 'value') return list.sort(byValue);
  const order = (e: Entry) => BUCKETS.indexOf(e.company.bucket) * 10 + (e.company.group ? OSS_GROUPS.indexOf(e.company.group) : 0);
  return list.sort((a, b) => order(a) - order(b) || byValue(a, b));
}

/** Tables cannot strike text through, so excluded rows keep a suffix there. */
function tableName(e: Entry): string {
  return e.off ? `${e.company.name} (out)` : e.company.name;
}

const FILTER_KEY: KeyItem = { glyph: 'filterTag', label: 'OSS group: click a name to turn its group off' };

function withFilter(ctx: ChartContext, items: KeyItem[]): KeyItem[] {
  return ctx.visible.includes('oss') ? [...items, FILTER_KEY] : items;
}

function dumbbellSpec(ctx: ChartContext, list: Entry[]): ChartSpec {
  const cur = ctx.state.cur;
  const rows = list.map((e): DumbbellRow => ({ id: e.company.slug, name: e.company.name, pct: e.company[ctx.state.metric]!, off: e.off, color: BUCKET_COLORS[e.company.bucket], hint: e.hint, badge: e.badge }));
  return {
    option: dumbbellOption(rows, cur, ctx.scale, 12),
    legend: ctx.visible.filter(b => list.some(e => e.company.bucket === b)),
    context: `${metricName(ctx)} · per company`,
    key: withFilter(ctx, [{ glyph: 'tintBand', label: 'under 20 salaries' }]),
    source: sourceLine(ctx, `${rows.length} companies, ${rows.reduce((s, r) => s + r.pct.n, 0).toLocaleString('en-US')} salaries.`),
    table: {
      columns: ['Company', 'Bucket', 'p25', 'p50', 'p75', 'Salaries'],
      rows: list.map(e => {
        const p = e.company[ctx.state.metric]!;
        return [tableName(e), BUCKET_LABELS[e.company.bucket], formatMoney(p.p25, cur), formatMoney(p.p50, cur), formatMoney(p.p75, cur), p.n];
      }),
    },
  };
}

/** Companies with under two bands sink to the bottom so the sparklines stay contiguous. */
function yoeSpec(ctx: ChartContext, list: Entry[]): ChartSpec {
  const cur = ctx.state.cur;
  const rows = list.map((e): YoeRow => ({ id: e.company.slug, name: e.company.name, color: BUCKET_COLORS[e.company.bucket], off: e.off, hint: e.hint, badge: e.badge, bands: e.company.tc?.byYoe ?? {} }));
  const sorted = [...rows.filter(hasEnoughBands), ...rows.filter(r => !hasEnoughBands(r))];
  const bandCount = sorted.reduce((s, r) => s + Object.keys(r.bands).length, 0);
  return {
    option: companyYoeOption(ctx, sorted),
    height: yoeRowsHeight(sorted.length, ctx.scale),
    legend: ctx.visible.filter(b => list.some(e => e.company.bucket === b)),
    context: 'Total comp median · by years of experience',
    key: withFilter(ctx, [{ glyph: 'dot', label: 'p50' }, { glyph: 'smallDot', label: 'under 20 salaries' }]),
    source: sourceLine(ctx, `${sorted.length} companies, ${bandCount} experience bands. Bands with under 5 salaries are left out.`),
    table: {
      columns: ['Company', 'Bucket', ...YOES.map(y => `${y} yrs`)],
      rows: sorted.map(r => {
        const entry = list.find(e => e.company.slug === r.id)!;
        return [tableName(entry), BUCKET_LABELS[entry.company.bucket], ...YOES.map(y => (r.bands[y] ? `${formatMoney(r.bands[y]!.p50, cur)} (${formatSalaries(r.bands[y]!.n)})` : '–'))];
      }),
    },
  };
}

export function buildPerCompany(ctx: ChartContext): ChartSpec {
  const list = entries(ctx);
  return ctx.state.cut === 'yoe' ? yoeSpec(ctx, list) : dumbbellSpec(ctx, list);
}
