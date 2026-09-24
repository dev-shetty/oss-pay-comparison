import { formatMoney, formatPct, roundTo } from '@/lib/format';
import { share } from '@/lib/pools';
import { BUCKET_COLORS, BUCKET_LABELS } from '@/lib/theme';
import type { Bucket, RemoteBlock } from '@/lib/types';
import { dotRowsOption, type DotRow } from './dotRows';
import type { KeyItem } from '@/lib/chartKey';
import { bucketCounts, emptySpec, medianLabel, nullPoolMessage, sourceLine, sqrtSize, tooltipBox, type ChartContext, type ChartSpec } from './shared';

interface Other { label: string; value: number; rows: number }
interface Item { bucket: Bucket; remote: RemoteBlock; other: Other; value: number }

/** Pools pulled before the office-only pass fall back to the median of all salaries. */
function otherDot(remote: RemoteBlock, allP50: number): Other {
  if (remote.officeP50 !== undefined) {
    return { label: 'office / hybrid', value: remote.officeP50, rows: remote.officeRows ?? remote.allRows - remote.remoteRows };
  }
  return { label: 'all salaries', value: allP50, rows: remote.allRows };
}

function items(ctx: ChartContext): Item[] {
  return ctx.visible.flatMap(bucket => {
    const pool = ctx.pools[bucket];
    const remote = pool?.remote;
    if (!pool || !remote) return [];
    const allP50 = pool.tc.all.p50;
    if (allP50 === null) return [];
    return [{ bucket, remote, other: otherDot(remote, allP50), value: roundTo(share(remote.remoteRows, remote.allRows) * 100, 1) }];
  });
}

function subText(item: Item): string {
  return `${item.remote.remoteRows.toLocaleString('en-US')} of ${item.remote.allRows.toLocaleString('en-US')} salaries are remote (${formatPct(item.value / 100)})`;
}

function toRow(ctx: ChartContext, item: Item, maxN: number): DotRow {
  const cur = ctx.state.cur;
  const { remote, other } = item;
  const otherTitle = `${other.label[0].toUpperCase()}${other.label.slice(1)}`;
  return {
    id: item.bucket,
    name: BUCKET_LABELS[item.bucket],
    color: BUCKET_COLORS[item.bucket],
    n: remote.remoteRows,
    a: { value: other.value, label: `${other.label} ${medianLabel(other.value, other.rows, cur)}`, size: sqrtSize(other.rows, maxN, ctx.scale), hollow: true },
    b: { value: remote.tcP50, label: `remote ${medianLabel(remote.tcP50, remote.remoteRows, cur)}`, size: sqrtSize(remote.remoteRows, maxN, ctx.scale) },
    subText: subText(item),
    tooltip: tooltipBox(BUCKET_COLORS[item.bucket], BUCKET_LABELS[item.bucket], [
      { label: 'Remote median', value: formatMoney(remote.tcP50, cur) },
      { label: 'Remote salaries (n)', value: remote.remoteRows.toLocaleString('en-US') },
      { label: `${otherTitle} median`, value: formatMoney(other.value, cur) },
      { label: `${otherTitle} salaries (n)`, value: other.rows.toLocaleString('en-US') },
      { label: 'Remote share', value: formatPct(item.value / 100) },
    ]),
  };
}

function keyFor(otherName: string): KeyItem[] {
  return [
    { glyph: 'filledDot', label: 'remote' },
    { glyph: 'hollowDot', label: otherName },
    { glyph: 'dotSizes', label: 'more salaries' },
  ];
}

function helpFor(otherName: string): string[] {
  return [
    'Filled dot: median total comp of remote salaries.',
    `Hollow dot: median total comp of ${otherName} salaries.`,
    'A bigger dot means more salaries behind that median.',
    'Remote is what the person submitting said.',
  ];
}

export function buildRemote(ctx: ChartContext): ChartSpec {
  const hasOffice = items(ctx).some(i => i.remote.officeP50 !== undefined);
  const otherName = hasOffice ? 'office / hybrid' : 'all salaries';
  const context = `Total comp median · remote vs ${hasOffice ? 'office' : 'all'}`;
  const missing = nullPoolMessage(ctx);
  if (missing) return emptySpec(context, missing);
  const rows = items(ctx);
  if (rows.length === 0) return emptySpec(context, 'Remote share not pulled for the selected buckets.');
  const maxN = Math.max(...rows.map(r => r.other.rows));
  const cur = ctx.state.cur;
  return {
    option: dotRowsOption(ctx, rows.map(r => toRow(ctx, r, maxN))),
    context,
    key: keyFor(otherName),
    help: helpFor(otherName),
    legend: rows.map(r => r.bucket),
    source: sourceLine(ctx, `${bucketCounts(rows.map(r => r.bucket), b => rows.find(r => r.bucket === b)!.remote.allRows)} Remote is what the person submitting said.`),
    table: {
      columns: ['Bucket', 'Remote salaries', 'All salaries', 'Share', 'Remote median TC', `${otherName[0].toUpperCase()}${otherName.slice(1)} median TC`],
      rows: rows.map(r => [BUCKET_LABELS[r.bucket], r.remote.remoteRows, r.remote.allRows, formatPct(r.value / 100, 1), formatMoney(r.remote.tcP50, cur), formatMoney(r.other.value, cur)]),
    },
  };
}
