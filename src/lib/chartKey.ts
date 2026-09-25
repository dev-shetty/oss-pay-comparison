export type Glyph =
  | 'band'
  | 'tintBand'
  | 'dot'
  | 'smallDot'
  | 'filledDot'
  | 'hollowDot'
  | 'dotSizes'
  | 'tick'
  | 'tintBar'
  | 'dashed'
  | 'shades'
  | 'lightChip'
  | 'value'
  | 'filterTag';

/** One mark in a chart's visual key. `value` shows `text` the way the chart prints its labels. */
export interface KeyItem {
  glyph: Glyph;
  label: string;
  text?: string;
  tone?: 'blue' | 'ink';
}

export const RANGE_KEY: KeyItem[] = [
  { glyph: 'band', label: 'p25 – p75' },
  { glyph: 'dot', label: 'p50' },
  { glyph: 'tintBand', label: 'under 20 salaries' },
];

export const LIGHT_CHIP_KEY: KeyItem[] = [{ glyph: 'lightChip', label: 'under 20 salaries' }];
