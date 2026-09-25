import { formatMoney } from '@/lib/format';
import { GROUP_LABELS } from '@/lib/groups';
import { ossPoolKey } from '@/lib/pools';
import { BUCKET_COLORS, BUCKET_LABELS } from '@/lib/theme';
import { OSS_GROUPS, type Bucket, type OssGroup, type Pct } from '@/lib/types';
import { RANGE_KEY } from '@/lib/chartKey';
import { ridgeOption, type RidgeRow } from './ridge';
import { emptySpec, metricName, sourceLine, type ChartContext, type ChartSpec } from './shared';

const RIVALS: Bucket[] = ['faang', 'inp', 'insvc'];

function onlyGroup(group: OssGroup): Record<OssGroup, boolean> {
  return Object.fromEntries(OSS_GROUPS.map(g => [g, g === group])) as Record<OssGroup, boolean>;
}

/** Each group reads its own single-group pool, so the filter toggles do not change this chart. */
function groupRows(ctx: ChartContext): RidgeRow[] {
  if (!ctx.visible.includes('oss')) return [];
  return OSS_GROUPS
    .flatMap(g => {
      const pct: Pct | undefined = ctx.snapshot.pools[ossPoolKey(onlyGroup(g))]?.[ctx.state.metric].all;
      return pct ? [{ id: `oss:${g}`, name: GROUP_LABELS[g], pct, color: BUCKET_COLORS.oss }] : [];
    })
    .sort((a, b) => (b.pct.p50 ?? 0) - (a.pct.p50 ?? 0));
}

function rivalRows(ctx: ChartContext): RidgeRow[] {
  return RIVALS.filter(b => ctx.visible.includes(b)).flatMap(b => {
    const pct = ctx.pools[b]?.[ctx.state.metric].all;
    return pct ? [{ id: `${b}:`, name: BUCKET_LABELS[b], pct, color: BUCKET_COLORS[b] }] : [];
  });
}

export function buildGroups(ctx: ChartContext): ChartSpec {
  const context = `${metricName(ctx)} · OSS by license group`;
  const rows = [...groupRows(ctx), ...rivalRows(ctx)];
  if (rows.length === 0) return emptySpec(context, 'Show the OSS bucket to compare its license groups.');
  const cur = ctx.state.cur;
  const legend = [...new Set(rows.map(r => r.id.split(':')[0] as Bucket))];
  return {
    option: ridgeOption(ctx, rows),
    context,
    key: RANGE_KEY.filter(k => k.glyph === 'tintBand'),
    legend,
    source: sourceLine(ctx, `OSS groups: ${rows.filter(r => r.id.startsWith('oss:')).map(r => `${r.name} ${r.pct.n}`).join(', ')} salaries.`),
    table: {
      columns: ['Group', 'p25', 'p50', 'p75', 'Salaries'],
      rows: rows.map(r => [r.name, formatMoney(r.pct.p25, cur), formatMoney(r.pct.p50, cur), formatMoney(r.pct.p75, cur), r.pct.n]),
    },
  };
}
