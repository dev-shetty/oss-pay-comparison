/** Twenty example salaries (₹ lakhs a year), sorted, chosen so every cut lands on a whole person. */
export const EXAMPLE_SALARIES = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 34, 38, 42, 48, 56, 70];

export const EXAMPLE = {
  median: 23,
  mid50: [14, 34] as const,
  mid80: [8, 48] as const,
  max: 75,
};

export type Zone = 'outer' | 'mid80' | 'mid50';

/** Which band a salary at sorted position `i` falls in: 2 people each side sit outside the middle 80%, 5 outside the middle 50%. */
export function zoneOf(i: number, count: number): Zone {
  const fromEdge = Math.min(i, count - 1 - i);
  if (fromEdge < 2) return 'outer';
  if (fromEdge < 5) return 'mid80';
  return 'mid50';
}

export interface Term {
  term: string;
  meaning: string;
}

export const OTHER_TERMS: Term[] = [
  { term: 'Total comp', meaning: 'Base salary + yearly stock + bonus' },
  { term: 'Base', meaning: 'Fixed cash salary only' },
  { term: 'L1 to L5', meaning: 'Levels.fyi levels: L1 fresher, L3 senior, L5 principal' },
  { term: 'Salaries (n)', meaning: 'How many engineers the number comes from' },
];
