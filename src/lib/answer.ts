import { ratio, type PoolMap } from './pools';
import type { Bucket, FilterState } from './types';

export interface HeroRow {
  bucket: Bucket;
  median: number;
  /** OSS median divided by this row's median; null on the OSS row. */
  ossRatio: number | null;
}

export interface Answer {
  headline: string;
  rows: HeroRow[];
  max: number;
  caption: string;
}

const RIVALS: Bucket[] = ['faang', 'inp', 'insvc'];
const LEAD_HEADLINE = 'Do open source companies pay competitively in India?';
const NEUTRAL_HEADLINE = 'Do open source companies pay competitively in India?';

function median(pools: PoolMap, state: FilterState, bucket: Bucket): number | null {
  return pools[bucket]?.[state.metric].all.p50 ?? null;
}

/** OSS is the subject, so it always stays; if every rival is hidden the strip keeps them all. */
function rivalRows(pools: PoolMap, state: FilterState, oss: number): HeroRow[] {
  const withMedian = RIVALS.flatMap(bucket => {
    const m = median(pools, state, bucket);
    return m === null ? [] : [{ bucket, median: m, ossRatio: ratio(oss, m) }];
  });
  const shown = withMedian.filter(r => state.buckets.includes(r.bucket));
  return (shown.length > 0 ? shown : withMedian).sort((a, b) => b.median - a.median);
}

function caption(state: FilterState, pulledAt: string): string {
  const metric = state.metric === 'tc' ? 'total comp' : 'base salary';
  const end = new Date(pulledAt).getUTCFullYear();
  return `Median ${metric} · software engineers in India · ${end - 5} to ${end}`;
}

export function buildAnswer(pools: PoolMap, state: FilterState, pulledAt: string): Answer | null {
  const oss = median(pools, state, 'oss');
  if (oss === null) return null;
  const rivals = rivalRows(pools, state, oss);
  if (rivals.length === 0) return null;
  const leads = rivals.every(r => oss > r.median);
  return {
    headline: leads ? LEAD_HEADLINE : NEUTRAL_HEADLINE,
    rows: [{ bucket: 'oss', median: oss, ossRatio: null }, ...rivals],
    max: Math.max(oss, ...rivals.map(r => r.median)),
    caption: caption(state, pulledAt),
  };
}
