import type { Bucket } from './types';
import watermarkUrl from '@/assets/levels_logo_grey.png';

export const COLORS = {
  cream: '#F4F3EC',
  ink: '#1A1712',
  sub: '#5B6268',
  mute: '#A39C90',
  blue: '#0060B9',
  navy: '#00407B',
  sky: '#4F9BDC',
  green: '#1E9E6A',
  amber: '#E08A1E',
  red: '#D1495B',
  slate: '#808C93',
  grayBar: '#CBC5B6',
  grid: '#E6E3DA',
} as const;

export const BUCKET_COLORS: Record<Bucket, string> = {
  oss: COLORS.blue,
  faang: COLORS.amber,
  inp: COLORS.green,
  insvc: COLORS.slate,
};

export const BUCKET_LABELS: Record<Bucket, string> = {
  oss: 'OSS',
  faang: 'FAANG+',
  inp: 'Indian product',
  insvc: 'Indian services',
};

export const FONT_FAMILY = "'Nunito', -apple-system, BlinkMacSystemFont, 'Avenir Next', Arial, sans-serif";

export const SMALL_N = 20;
export const STORY_N = 10;
export const STORY_OPACITY = 0.35;
export const ANIMATION_MS = 600;

export const WATERMARK = watermarkUrl;

export function px(base: number, scale: number): number {
  return Math.round(base * scale);
}

export function withAlpha(hex: string, alpha: number): string {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function lighten(hex: string, amount: number): string {
  const v = hex.replace('#', '');
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix(parseInt(v.slice(0, 2), 16));
  const g = mix(parseInt(v.slice(2, 4), 16));
  const b = mix(parseInt(v.slice(4, 6), 16));
  return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}
