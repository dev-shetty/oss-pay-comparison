import type { Bucket, FilterState, Pool, Snapshot } from './types';

export function ossPoolKey(state: FilterState): string {
  const t = state.toggles;
  const bit = (on: boolean) => (on ? '1' : '0');
  return `oss:rh${bit(t['red-hat'])}-cf${bit(t.confluent)}-db${bit(t.databricks)}-am${bit(t.automattic)}`;
}

/** The only place that maps filter state to a pre-computed pool. Nothing else computes a median. */
export function selectPool(snapshot: Snapshot, state: FilterState, bucket: Bucket): Pool | null {
  const key = bucket === 'oss' ? ossPoolKey(state) : bucket;
  return snapshot.pools[key] ?? null;
}

export type PoolMap = Record<Bucket, Pool | null>;

export function selectPools(snapshot: Snapshot, state: FilterState): PoolMap {
  return {
    oss: selectPool(snapshot, state, 'oss'),
    faang: selectPool(snapshot, state, 'faang'),
    inp: selectPool(snapshot, state, 'inp'),
    insvc: selectPool(snapshot, state, 'insvc'),
  };
}

export function isMeasured(n: number): boolean {
  return n >= 0;
}

export function ratio(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a === null || a === undefined || b === null || b === undefined || b === 0) return null;
  return a / b;
}

export function share(part: number, total: number): number {
  return total === 0 ? 0 : part / total;
}
