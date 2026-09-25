import { useCallback, useEffect, useState } from 'react';
import { GROUP_PARAM } from './groups';
import { BUCKETS, OSS_GROUPS, type Bucket, type FilterState } from './types';

export const DEFAULT_STATE: FilterState = {
  metric: 'tc',
  cut: 'all',
  cur: 'usd',
  buckets: [...BUCKETS],
  groups: { pure: true, 'open-core': true, 'oss-projects': true, 'source-available': true },
  sort: 'value',
  present: false,
  card: 0,
};

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parseState(search: string): FilterState {
  const q = new URLSearchParams(search);
  const bucketsRaw = q.get('b');
  const buckets = bucketsRaw === null
    ? [...BUCKETS]
    : BUCKETS.filter(b => bucketsRaw.split(',').includes(b));
  const groups = { ...DEFAULT_STATE.groups };
  for (const g of OSS_GROUPS) groups[g] = q.get(GROUP_PARAM[g]) !== '0';
  const card = Number.parseInt(q.get('card') ?? '0', 10);
  return {
    metric: pick(q.get('metric'), ['tc', 'base'], 'tc'),
    cut: pick(q.get('cut'), ['all', 'level', 'yoe'], 'all'),
    cur: pick(q.get('cur'), ['usd', 'inr'], 'usd'),
    buckets,
    groups,
    sort: pick(q.get('sort'), ['value', 'bucket'], 'value'),
    present: q.get('present') === '1',
    card: Number.isFinite(card) && card >= 0 ? card : 0,
  };
}

const FILTER_KEYS = ['metric', 'cut', 'cur', 'b', ...Object.values(GROUP_PARAM), 'sort', 'present', 'card'];

/** Writes `next` over the current query, keeping every key outside `managed` (other hooks own those). */
export function replaceQuery(managed: string[], next: URLSearchParams) {
  const q = new URLSearchParams(window.location.search);
  for (const key of managed) q.delete(key);
  for (const [key, value] of next) q.set(key, value);
  const s = q.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${s ? `?${s}` : ''}${window.location.hash}`);
}

export function stateParams(state: FilterState): URLSearchParams {
  const q = new URLSearchParams();
  if (state.metric !== 'tc') q.set('metric', state.metric);
  if (state.cut !== 'all') q.set('cut', state.cut);
  if (state.cur !== 'usd') q.set('cur', state.cur);
  if (state.buckets.length !== BUCKETS.length) q.set('b', state.buckets.join(','));
  for (const g of OSS_GROUPS) if (!state.groups[g]) q.set(GROUP_PARAM[g], '0');
  if (state.sort !== 'value') q.set('sort', state.sort);
  if (state.present) q.set('present', '1');
  if (state.present && state.card > 0) q.set('card', String(state.card));
  return q;
}

export function serializeState(state: FilterState): string {
  const s = stateParams(state).toString();
  return s ? `?${s}` : '';
}

export function useUrlState(): [FilterState, (patch: Partial<FilterState>) => void] {
  const [state, setState] = useState<FilterState>(() => parseState(window.location.search));

  useEffect(() => {
    const onPop = () => setState(parseState(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const update = useCallback((patch: Partial<FilterState>) => {
    setState(prev => {
      const next = { ...prev, ...patch };
      replaceQuery(FILTER_KEYS, stateParams(next));
      return next;
    });
  }, []);

  return [state, update];
}

export function toggleBucket(state: FilterState, bucket: Bucket): Bucket[] {
  if (state.buckets.includes(bucket)) return state.buckets.filter(b => b !== bucket);
  return BUCKETS.filter(b => b === bucket || state.buckets.includes(b));
}

/** Filters that live in the sheet; currency and present sit in the nav and never count. */
export function activeFilterCount(state: FilterState): number {
  let count = 0;
  if (state.metric !== DEFAULT_STATE.metric) count += 1;
  if (state.cut !== DEFAULT_STATE.cut) count += 1;
  if (state.buckets.length !== BUCKETS.length) count += 1;
  count += OSS_GROUPS.filter(g => !state.groups[g]).length;
  if (state.sort !== DEFAULT_STATE.sort) count += 1;
  return count;
}
