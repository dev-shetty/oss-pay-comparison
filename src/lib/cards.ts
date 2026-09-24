import { buildByLevel } from '@/components/charts/byLevel';
import { buildByYoe } from '@/components/charts/byYoe';
import { buildEquity } from '@/components/charts/equity';
import { buildHeadline } from '@/components/charts/headline';
import { buildIndiaVsUs } from '@/components/charts/indiaVsUs';
import { buildPerCompany } from '@/components/charts/perCompany';
import { buildRemote } from '@/components/charts/remote';
import { buildRowsPerYear } from '@/components/charts/rowsPerYear';
import type { ChartContext, ChartSpec } from '@/components/charts/shared';
import { formatPct } from './format';
import { share } from './pools';
import { BUCKET_LABELS } from './theme';
import type { Bucket } from './types';

export type CardKind = 'chart' | 'answer' | 'disclaimer' | 'policies' | 'companies' | 'method';

export interface CardDef {
  id: string;
  kind: CardKind;
  title: (ctx: ChartContext) => string;
  poll: string;
  build?: (ctx: ChartContext) => ChartSpec;
}

function topBy(ctx: ChartContext, score: (b: Bucket) => number | null): Bucket | null {
  const scored = ctx.visible.map(b => ({ b, v: score(b) })).filter((x): x is { b: Bucket; v: number } => x.v !== null);
  if (scored.length === 0) return null;
  return scored.reduce((best, x) => (x.v > best.v ? x : best)).b;
}

function headlineTitle(ctx: ChartContext): string {
  const all = (b: Bucket) => ctx.pools[b]?.[ctx.state.metric].all ?? null;
  const top = topBy(ctx, b => all(b)?.p50 ?? null);
  const widest = topBy(ctx, b => { const p = all(b); return p ? p.p75 - p.p25 : null; });
  if (!top || !widest) return 'Pay by bucket';
  if (top === widest) return `${BUCKET_LABELS[top]} pays the most and has the widest pay range`;
  return `${BUCKET_LABELS[top]} pays the most; ${BUCKET_LABELS[widest]} has the widest range`;
}


function remoteTitle(ctx: ChartContext): string {
  const oss = ctx.pools.oss?.remote;
  const faang = ctx.pools.faang?.remote;
  if (!oss || !faang) return 'Remote share by bucket';
  return `${formatPct(share(oss.remoteRows, oss.allRows))} of OSS salaries are remote, vs ${formatPct(share(faang.remoteRows, faang.allRows))} at FAANG+`;
}

export const DISCLAIMER = [
  'Self-reported by engineers who chose to share.',
  'Leans high: people with good offers share more.',
  'Few senior and small-company salaries.',
  'Under 10 salaries is too few to trust.',
];

export const CARDS: CardDef[] = [
  { id: 'answer', kind: 'answer', title: () => 'The answer', poll: 'The answer' },
  { id: 'method', kind: 'method', title: () => 'How this data was built', poll: 'Where do these numbers come from?' },
  { id: 'companies', kind: 'companies', title: () => 'The companies behind these numbers', poll: 'Which companies count as open source here?' },
  { id: 'headline', kind: 'chart', title: headlineTitle, poll: 'Do OSS companies pay less?', build: buildHeadline },
  { id: 'by-level', kind: 'chart', title: () => 'OSS leads FAANG+ at L1–L3; the gap narrows with level', poll: 'Does the gap change with level?', build: buildByLevel },
  { id: 'by-experience', kind: 'chart', title: () => 'OSS pays more than FAANG+ for the first 11 years', poll: 'How does pay grow with experience?', build: buildByYoe },
  { id: 'equity', kind: 'chart', title: () => 'Stock is a bigger slice of OSS pay than FAANG+ pay at L1–L3', poll: 'How much of the pay is stock?', build: buildEquity },
  { id: 'remote', kind: 'chart', title: remoteTitle, poll: 'Does remote work change the pay?', build: buildRemote },
  { id: 'india-vs-us', kind: 'chart', title: () => 'India pays 25–45% of the US median at the same company', poll: 'How does India pay compare to the US?', build: buildIndiaVsUs },
  { id: 'per-company', kind: 'chart', title: () => 'Confluent and Red Hat: 64% of OSS salaries, far apart on pay', poll: 'Do all OSS companies pay alike?', build: buildPerCompany },
  { id: 'rows-per-year', kind: 'chart', title: () => 'Most salaries in this data are from 2024 onward', poll: 'How recent is this data?', build: buildRowsPerYear },
  { id: 'disclaimer', kind: 'disclaimer', title: () => 'Before the numbers', poll: 'Before the numbers' },
  { id: 'policies', kind: 'policies', title: () => 'Four of five public OSS pay formulas adjust pay by location', poll: 'Who publishes their pay formula?' },
];

/** Setup cards live in the About panel in Explore mode; Present mode keeps them as slides. */
export const EXPLORE_HIDDEN: CardKind[] = ['answer', 'disclaimer', 'method'];

export function presentOrder(): CardDef[] {
  const answer = CARDS.find(c => c.kind === 'answer')!;
  const disclaimer = CARDS.find(c => c.kind === 'disclaimer')!;
  const method = CARDS.find(c => c.kind === 'method')!;
  const companies = CARDS.find(c => c.kind === 'companies')!;
  return [answer, disclaimer, method, companies, ...CARDS.filter(c => c.kind === 'chart'), CARDS.find(c => c.kind === 'policies')!];
}
