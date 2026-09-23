import { formatMoney } from '@/lib/format';
import { BUCKET_COLORS, BUCKET_LABELS } from '@/lib/theme';
import { BUCKETS, YOES, type Company, type ToggleSlug } from '@/lib/types';
import { companyYoeOption, hasEnoughBands, yoeRowsHeight, type YoeRow } from './companyYoe';
import { dumbbellOption, type DumbbellRow } from './dumbbell';
import type { ChartContext, ChartSpec } from './shared';

interface Entry { company: Company; off: boolean; hint?: string }

const TOGGLE_HINT = 'Click the row to toggle this company in or out of the OSS pool';

function entries(ctx: ChartContext): Entry[] {
  const { metric, toggles, sort } = ctx.state;
  const list = ctx.snapshot.companies
    .filter(c => ctx.visible.includes(c.bucket) && c[metric] !== null)
    .map((company): Entry => {
      const isToggle = ctx.snapshot.meta.toggles.includes(company.slug as ToggleSlug);
      return { company, off: isToggle && !toggles[company.slug as ToggleSlug], hint: isToggle ? TOGGLE_HINT : undefined };
    });
  const byValue = (a: Entry, b: Entry) => (b.company[metric]?.p50 ?? 0) - (a.company[metric]?.p50 ?? 0);
  if (sort === 'value') return list.sort(byValue);
  const order = (e: Entry) => BUCKETS.indexOf(e.company.bucket);
  return list.sort((a, b) => order(a) - order(b) || byValue(a, b));
}

function name(e: Entry): string {
  return e.off ? `${e.company.name} (out)` : e.company.name;
}

function dumbbellSpec(ctx: ChartContext, list: Entry[]): ChartSpec {
  const cur = ctx.state.cur;
  const metric = ctx.state.metric === 'tc' ? 'Total comp' : 'Base';
  const rows = list.map((e): DumbbellRow => ({ id: e.company.slug, name: name(e), pct: e.company[ctx.state.metric]!, off: e.off, color: BUCKET_COLORS[e.company.bucket], hint: e.hint }));
  return {
    option: dumbbellOption(rows, cur, ctx.scale, 12),
    legend: ctx.visible.filter(b => list.some(e => e.company.bucket === b)),
    subtitle: `${metric}: band = p25–p75, tick = median, dots = rows. Light tint = n<20. ⇄ = click to toggle.`,
    source: `Levels.fyi, ${rows.length} companies, ${rows.reduce((s, r) => s + r.pct.n, 0).toLocaleString('en-US')} rows`,
    table: {
      columns: ['Company', 'Bucket', 'p25', 'Median', 'p75', 'n'],
      rows: list.map(e => {
        const p = e.company[ctx.state.metric]!;
        return [name(e), BUCKET_LABELS[e.company.bucket], formatMoney(p.p25, cur), formatMoney(p.p50, cur), formatMoney(p.p75, cur), p.n];
      }),
    },
  };
}

/** Companies with under two bands sink to the bottom so the sparklines stay contiguous. */
function yoeSpec(ctx: ChartContext, list: Entry[]): ChartSpec {
  const cur = ctx.state.cur;
  const rows = list.map((e): YoeRow => ({ id: e.company.slug, name: name(e), color: BUCKET_COLORS[e.company.bucket], off: e.off, hint: e.hint, bands: e.company.tc?.byYoe ?? {} }));
  const sorted = [...rows.filter(hasEnoughBands), ...rows.filter(r => !hasEnoughBands(r))];
  const bandCount = sorted.reduce((s, r) => s + Object.keys(r.bands).length, 0);
  return {
    option: companyYoeOption(ctx, sorted),
    height: yoeRowsHeight(sorted.length, ctx.scale),
    legend: ctx.visible.filter(b => list.some(e => e.company.bucket === b)),
    subtitle: 'Total comp median by years of experience, one shared scale. Light tint = n<20. ⇄ = click to toggle.',
    source: `Levels.fyi get-salaries-by-experience, ${sorted.length} companies, ${bandCount} bands (n<5 bands omitted by the API)`,
    table: {
      columns: ['Company', 'Bucket', ...YOES.map(y => `${y} yrs`)],
      rows: sorted.map(r => {
        const bucket = list.find(e => e.company.slug === r.id)!.company.bucket;
        return [r.name, BUCKET_LABELS[bucket], ...YOES.map(y => (r.bands[y] ? `${formatMoney(r.bands[y]!.p50, cur)} (n=${r.bands[y]!.n})` : '–'))];
      }),
    },
  };
}

export function buildPerCompany(ctx: ChartContext): ChartSpec {
  const list = entries(ctx);
  return ctx.state.cut === 'yoe' ? yoeSpec(ctx, list) : dumbbellSpec(ctx, list);
}
