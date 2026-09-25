import { buildByLevel } from '@/components/charts/byLevel';
import { buildByYoe } from '@/components/charts/byYoe';
import { buildEquity } from '@/components/charts/equity';
import { buildGroups } from '@/components/charts/groups';
import { buildHeadline } from '@/components/charts/headline';
import { buildIndiaVsUs } from '@/components/charts/indiaVsUs';
import { buildPerCompany } from '@/components/charts/perCompany';
import { buildRemote } from '@/components/charts/remote';
import { buildRowsPerYear } from '@/components/charts/rowsPerYear';
import type { ChartContext, ChartSpec } from '@/components/charts/shared';

export type CardKind = 'chart' | 'answer' | 'disclaimer' | 'policies' | 'companies' | 'method' | 'terms' | 'closing' | 'questions';

export interface CardDef {
  id: string;
  kind: CardKind;
  /** One title for both modes, phrased as the question the card answers. */
  poll: string;
  build?: (ctx: ChartContext) => ChartSpec;
  /** Speaker's key points, shown under the title. */
  takeaways?: string[];
  /** Questions for the room; Present mode shows each as its own slide after this card. */
  questions?: string[];
}

export const DISCLAIMER = [
  'Self-reported by engineers who chose to share.',
  'Leans high: people with good offers share more.',
  'Few senior and small-company salaries.',
  'Under 10 salaries is too few to trust.',
];

export const CARDS: CardDef[] = [
  { id: 'answer', kind: 'answer', poll: 'The answer' },
  { id: 'method', kind: 'method', poll: 'Where do these numbers come from?' },
  { id: 'terms', kind: 'terms', poll: 'How to read the charts' },
  { id: 'companies', kind: 'companies', poll: 'Which companies count as open source here?' },
  { id: 'headline', kind: 'chart', poll: 'Do OSS companies pay less?', build: buildHeadline },
  { id: 'groups', kind: 'chart', poll: 'Which kind of OSS company pays more?', build: buildGroups },
  {
    id: 'by-level', kind: 'chart', poll: 'Does the gap change with level?', build: buildByLevel,
    takeaways: ['At the same level, OSS is close to FAANG+. The gap grows as you go up.'],
    questions: ['Few senior OSS engineers in India share their pay, or few such roles exist?'],
  },
  {
    id: 'by-experience', kind: 'chart', poll: 'How does pay grow with experience?', build: buildByYoe,
    takeaways: ['Freshers in OSS earn more than freshers at FAANG+.'],
    questions: ['OSS is a great place to start. Is it a place to stay?', 'OSS pay stops growing after about 8 years. FAANG+ keeps growing? Is it coz of equity?'],
  },
  {
    id: 'equity', kind: 'chart', poll: 'How much of the pay is stock?', build: buildEquity,
    takeaways: ['OSS uses stock as much as FAANG+ does, and more than Indian companies.'],
  },
  {
    id: 'remote', kind: 'chart', poll: 'Does remote work change the pay?', build: buildRemote,
    takeaways: ['Almost half of OSS jobs in India are remote, compared with 3% at FAANG+.', 'Remote OSS jobs pay 1.5× office OSS jobs, and more than the FAANG+ median.'],
    questions: ['Open source is the path to a global remote job from India?'],
  },
  {
    id: 'india-vs-us', kind: 'chart', poll: 'How does India pay compare to the US?', build: buildIndiaVsUs,
    takeaways: ['Most companies pay India about a quarter of US pay. GitLab pays almost half, because it publishes a location formula.'],
    questions: ['Is 25% of US pay fair, given cost of living?'],
  },
  {
    id: 'per-company', kind: 'chart', poll: 'Do all OSS companies pay alike?', build: buildPerCompany,
    takeaways: ['OSS company medians go from $23.2K (Red Hat) to $100K (Automattic), a 4× range.'],
  },
  {
    id: 'rows-per-year', kind: 'chart', poll: 'How recent is this data?', build: buildRowsPerYear,
    takeaways: ['Most of the data is from 2024 to 2026, so the medians describe the current market.'],
  },
  { id: 'disclaimer', kind: 'disclaimer', poll: 'Before the numbers' },
  { id: 'closing', kind: 'closing', poll: 'Thank you' },
  { id: 'policies', kind: 'policies', poll: 'Who publishes their pay formula?', questions: ['Should OSS companies be open about pay, and how can Levels.fyi help?'] },
];

/** Setup cards live in the About panel in Explore mode; Present mode keeps them as slides. */
export const EXPLORE_HIDDEN: CardKind[] = ['answer', 'disclaimer', 'method', 'closing', 'questions'];

/** One slide per question, so each gets the room's full attention. */
function withQuestions(card: CardDef): CardDef[] {
  const slides = (card.questions ?? []).map((q, i): CardDef => ({ id: `${card.id}-question-${i + 1}`, kind: 'questions', poll: 'Question for the room', questions: [q] }));
  return [card, ...slides];
}

/** Present-only opener: the room answers the question before the next slide shows the numbers. */
const WARM_UP: CardDef = { id: 'warm-up', kind: 'questions', poll: '', questions: ['Do open source companies pay competitively in India?'] };

export function presentOrder(): CardDef[] {
  const answer = CARDS.find(c => c.kind === 'answer')!;
  const disclaimer = CARDS.find(c => c.kind === 'disclaimer')!;
  const method = CARDS.find(c => c.kind === 'method')!;
  const companies = CARDS.find(c => c.kind === 'companies')!;
  const terms = CARDS.find(c => c.kind === 'terms')!;
  return [WARM_UP, ...[answer, disclaimer, method, terms, companies, ...CARDS.filter(c => c.kind === 'chart'), CARDS.find(c => c.kind === 'policies')!, CARDS.find(c => c.kind === 'closing')!].flatMap(withQuestions)];
}
