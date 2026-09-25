import { formatMoney, formatPct, roundTo } from '@/lib/format';
import { isExcluded } from '@/lib/companies';
import { ratio } from '@/lib/pools';
import { BUCKET_COLORS, BUCKET_LABELS, px } from '@/lib/theme';
import type { Company } from '@/lib/types';
import { dotRowsOption, type DotRow } from './dotRows';
import type { KeyItem } from '@/lib/chartKey';
import { emptySpec, shortMedianLabel, sourceLine, tooltipBox, type ChartContext, type ChartSpec } from './shared';

interface Item { company: Company; value: number; indiaP50: number; usP50: number; n: number }

function items(ctx: ChartContext): Item[] {
  return ctx.snapshot.companies
    .filter(c => ctx.visible.includes(c.bucket) && !isExcluded(c, ctx.state) && c.usP50 && c.tc?.p50)
    .map(c => {
      const r = ratio(c.tc!.p50, c.usP50) ?? 0;
      return { company: c, value: roundTo(r * 100, 1), indiaP50: c.tc!.p50!, usP50: c.usP50!, n: c.tc!.n };
    })
    .sort((a, b) => b.value - a.value);
}

function toRow(ctx: ChartContext, item: Item): DotRow {
  const cur = ctx.state.cur;
  const size = px(12, ctx.scale);
  return {
    id: item.company.slug,
    name: item.company.name,
    color: BUCKET_COLORS[item.company.bucket],
    n: item.n,
    a: { value: item.indiaP50, label: `IN ${shortMedianLabel(item.indiaP50, item.n, cur)}`, size },
    b: { value: item.usP50, label: `US ${formatMoney(item.usP50, cur)}`, size, hollow: true },
    midLabel: formatPct(item.value / 100),
    tooltip: tooltipBox(BUCKET_COLORS[item.company.bucket], item.company.name, [
      { label: 'India median', value: formatMoney(item.indiaP50, cur) },
      { label: 'US median', value: formatMoney(item.usP50, cur) },
      { label: 'India ÷ US', value: formatPct(item.value / 100) },
      { label: 'India salaries (n)', value: item.n.toLocaleString('en-US') },
    ]),
  };
}

const KEY: KeyItem[] = [
  { glyph: 'filledDot', label: 'India' },
  { glyph: 'hollowDot', label: 'US' },
  { glyph: 'value', text: '26%', label: 'India ÷ US' },
];

export function buildIndiaVsUs(ctx: ChartContext): ChartSpec {
  const context = 'Total comp median · same company';
  const rows = items(ctx);
  if (rows.length === 0) return emptySpec(context, 'No company with a US reference in the selected buckets.');
  const cur = ctx.state.cur;
  return {
    option: dotRowsOption(ctx, rows.map(r => toRow(ctx, r))),
    context,
    key: KEY,
    legend: ctx.visible.filter(b => rows.some(r => r.company.bucket === b)),
    source: sourceLine(ctx, `Median total comp at ${rows.length} companies with both. ${rows.reduce((s, r) => s + r.n, 0).toLocaleString('en-US')} India salaries.`, 'in India and the US'),
    table: {
      columns: ['Company', 'Bucket', 'India median', 'US median', 'India / US', 'India salaries'],
      rows: rows.map(r => [r.company.name, BUCKET_LABELS[r.company.bucket], formatMoney(r.indiaP50, cur), formatMoney(r.usP50, cur), formatPct(r.value / 100), r.n]),
    },
  };
}
