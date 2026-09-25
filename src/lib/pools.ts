import { GROUP_PARAM } from './groups';
import { OSS_GROUPS, type Bucket, type FilterState, type OssGroup, type Pool, type Snapshot } from './types';

export function ossPoolKey(groups: Record<OssGroup, boolean>): string {
  return `oss:${OSS_GROUPS.map(g => `${GROUP_PARAM[g]}${groups[g] ? '1' : '0'}`).join('-')}`;
}

export function allGroupsOff(state: FilterState): boolean {
  return OSS_GROUPS.every(g => !state.groups[g]);
}

/** The only place that maps filter state to a pre-computed pool. Nothing else computes a median. */
export function selectPool(snapshot: Snapshot, state: FilterState, bucket: Bucket): Pool | null {
  const key = bucket === 'oss' ? ossPoolKey(state.groups) : bucket;
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
