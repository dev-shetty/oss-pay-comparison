import { windowText } from './format';
import type { Snapshot } from './types';

export interface MethodRow {
  label: string;
  value: string;
}

export function methodRows(snapshot: Snapshot): MethodRow[] {
  return [
    { label: 'Source', value: 'Levels.fyi salary submissions' },
    { label: 'Who', value: 'Software engineers in India' },
    { label: 'When', value: windowText(snapshot.meta.pulledAt) },
    { label: 'Pay', value: 'Base + stock + bonus, yearly' },
  ];
}
