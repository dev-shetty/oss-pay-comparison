import type { Currency, Pct } from './types';

export const INR_PER_USD = 95;

function trimZero(value: string): string {
  return value.replace(/\.0$/, '');
}

export function formatUsd(usd: number): string {
  if (usd >= 1_000_000) return `$${trimZero((usd / 1_000_000).toFixed(2))}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${Math.round(usd)}`;
}

export function formatInr(usd: number, rate = INR_PER_USD): string {
  const inr = usd * rate;
  if (inr >= 1e7) return `₹${trimZero((inr / 1e7).toFixed(2))} Cr`;
  if (inr >= 1e5) return `₹${trimZero((inr / 1e5).toFixed(1))}L`;
  return `₹${Math.round(inr).toLocaleString('en-IN')}`;
}

export function formatMoney(usd: number | null | undefined, cur: Currency): string {
  if (usd === null || usd === undefined) return '–';
  return cur === 'inr' ? formatInr(usd) : formatUsd(usd);
}

export function toDisplay(usd: number, cur: Currency): number {
  return cur === 'inr' ? usd * INR_PER_USD : usd;
}

export function axisMoney(value: number, cur: Currency): string {
  if (cur === 'inr') {
    if (value >= 1e7) return `₹${trimZero((value / 1e7).toFixed(1))}Cr`;
    return `₹${trimZero((value / 1e5).toFixed(0))}L`;
  }
  return `$${trimZero((value / 1000).toFixed(0))}K`;
}

export function formatPct(share: number, digits = 0): string {
  return `${(share * 100).toFixed(digits)}%`;
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}x`;
}

export function formatN(n: number): string {
  if (n < 0) return 'predicted';
  return `n=${n.toLocaleString('en-US')}`;
}

export function pctLabel(p: Pct, cur: Currency): string {
  const mid = formatMoney(p.p50, cur);
  return `${formatMoney(p.p25, cur)} · ${mid} · ${formatMoney(p.p75, cur)} (${formatN(p.n)})`;
}

export function roundTo(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
