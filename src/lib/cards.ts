import { buildByLevel } from '@/components/charts/byLevel';
import { buildByYoe } from '@/components/charts/byYoe';
import { buildEquity } from '@/components/charts/equity';
import { buildHeadline } from '@/components/charts/headline';
import { buildIndiaVsUs } from '@/components/charts/indiaVsUs';
import { buildPerCompany } from '@/components/charts/perCompany';
import { buildRemote } from '@/components/charts/remote';
import { buildRowsPerYear } from '@/components/charts/rowsPerYear';
import type { ChartContext, ChartSpec } from '@/components/charts/shared';
import { formatPct, formatRatio } from './format';
import { ratio, share } from './pools';

export type CardKind = 'chart' | 'disclaimer' | 'policies';

export interface CardDef {
  id: string;
  kind: CardKind;
  title: (ctx: ChartContext) => string;
  poll: string;
  build?: (ctx: ChartContext) => ChartSpec;
}

function headlineTitle(ctx: ChartContext): string {
  const oss = ctx.pools.oss?.[ctx.state.metric].all.p50;
  const vsFaang = ratio(oss, ctx.pools.faang?.[ctx.state.metric].all.p50);
  const vsInp = ratio(oss, ctx.pools.inp?.[ctx.state.metric].all.p50);
  const metric = ctx.state.metric === 'tc' ? 'total comp' : 'base';
  if (!vsFaang || !vsInp) return `Median ${metric}: OSS vs FAANG+ vs Indian product vs services`;
  return `OSS median ${metric}: ${formatRatio(vsFaang)} FAANG+, ${formatRatio(vsInp)} Indian product`;
}

function remoteTitle(ctx: ChartContext): string {
  const oss = ctx.pools.oss?.remote;
  const faang = ctx.pools.faang?.remote;
  if (!oss || !faang) return 'Remote share by bucket';
  return `${formatPct(share(oss.remoteRows, oss.allRows))} of OSS rows are remote, vs ${formatPct(share(faang.remoteRows, faang.allRows))} at FAANG+`;
}

export const DISCLAIMER = [
  'This is self-reported data from people who chose to submit to Levels.fyi.',
  'They skew toward people who negotiate.',
  'Senior rows are thin.',
  'Small OSS companies are missing.',
  'Equity at private companies is a paper number.',
  'I will show n on every bar, base and TC separately, and India-only cuts.',
  'When n is under 10, treat it as a story, not a statistic.',
];

export const CARDS: CardDef[] = [
  { id: 'headline', kind: 'chart', title: headlineTitle, poll: 'OSS pays less than Flipkart, Swiggy, Razorpay. Agree?', build: buildHeadline },
  { id: 'by-level', kind: 'chart', title: () => 'OSS leads FAANG+ at L1–L3; the gap narrows with level', poll: 'Google India fresher vs GitLab India fresher. Who pays more?', build: buildByLevel },
  { id: 'by-experience', kind: 'chart', title: () => 'The OSS lead holds to 8–11 years, then the sample thins', poll: 'Does the OSS lead survive at 10 years of experience?', build: buildByYoe },
  { id: 'equity', kind: 'chart', title: () => 'Stock is a bigger slice of OSS pay than FAANG+ pay at L1–L3', poll: 'What share of a Google India L2 package is stock? Guess.', build: buildEquity },
  { id: 'remote', kind: 'chart', title: remoteTitle, poll: 'How many of you work fully remote today?', build: buildRemote },
  { id: 'india-vs-us', kind: 'chart', title: () => 'India pays 25–45% of the US median at the same company', poll: 'If GitLab pays $234K in the US, what does it pay in India?', build: buildIndiaVsUs },
  { id: 'per-company', kind: 'chart', title: () => 'Confluent and Red Hat hold 64% of OSS rows and sit at opposite ends', poll: 'Red Hat vs Confluent, India. Same ballpark?', build: buildPerCompany },
  { id: 'rows-per-year', kind: 'chart', title: () => 'Five years of data, but most rows are from the last two', poll: 'Five years of data. How much of it is from the last 18 months?', build: buildRowsPerYear },
  { id: 'disclaimer', kind: 'disclaimer', title: () => 'Read this before the numbers', poll: 'Read this before the numbers' },
  { id: 'policies', kind: 'policies', title: () => 'Public pay policies at OSS companies', poll: 'Who publishes their pay formula?' },
];

export function presentOrder(): CardDef[] {
  const disclaimer = CARDS.find(c => c.kind === 'disclaimer')!;
  return [disclaimer, ...CARDS.filter(c => c.kind === 'chart'), CARDS.find(c => c.kind === 'policies')!];
}
