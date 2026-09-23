import { useCallback, useEffect, useState } from 'react';
import type { CardOptions, LevelView } from './cardOptions.types';
import { replaceQuery } from './urlState';

const KEYS = ['mc', 'lv'];

export const DEFAULT_OPTIONS: CardOptions = { medianOfCompanies: false, levelView: 'slope' };

export function parseOptions(search: string): CardOptions {
  const q = new URLSearchParams(search);
  const levelView: LevelView = q.get('lv') === 'bars' ? 'bars' : 'slope';
  return {
    medianOfCompanies: q.get('mc') === '1',
    levelView,
  };
}

export function optionParams(options: CardOptions): URLSearchParams {
  const q = new URLSearchParams();
  if (options.medianOfCompanies) q.set('mc', '1');
  if (options.levelView !== 'slope') q.set('lv', options.levelView);
  return q;
}

export function useCardOptions(): [CardOptions, (patch: Partial<CardOptions>) => void] {
  const [options, setOptions] = useState<CardOptions>(() => parseOptions(window.location.search));

  useEffect(() => {
    const onPop = () => setOptions(parseOptions(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const update = useCallback((patch: Partial<CardOptions>) => {
    setOptions(prev => {
      const next = { ...prev, ...patch };
      replaceQuery(KEYS, optionParams(next));
      return next;
    });
  }, []);

  return [options, update];
}
