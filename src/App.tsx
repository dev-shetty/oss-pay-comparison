import { useEffect, useMemo, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CardControls } from '@/components/CardControls';
import { ChartCard } from '@/components/ChartCard';
import { AboutPanel } from '@/components/AboutPanel';
import { AnswerBlock } from '@/components/AnswerBlock';
import { FiltersSheet } from '@/components/FiltersSheet';
import { TopNav } from '@/components/TopNav';
import { PresentMode } from '@/components/PresentMode';
import { CompaniesCard } from '@/components/CompaniesCard';
import { MethodCard } from '@/components/MethodCard';
import { TermsCard } from '@/components/TermsCard';
import { ClosingCard } from '@/components/ClosingCard';
import { QuestionsCard } from '@/components/QuestionsCard';
import { DisclaimerCard, PoliciesCard } from '@/components/TextCards';
import type { ChartContext } from '@/components/charts/shared';
import snapshotJson from '@/data/snapshot.json';
import { useCardOptions } from '@/lib/cardOptions';
import { buildAnswer } from '@/lib/answer';
import { scrollToHashCard } from '@/lib/cardLink';
import { CARDS, EXPLORE_HIDDEN, type CardDef } from '@/lib/cards';
import { selectPools } from '@/lib/pools';
import { type FilterState, type Snapshot } from '@/lib/types';
import { activeFilterCount, useUrlState } from '@/lib/urlState';
import { formatPulledAt } from '@/lib/format';
import { useMediaQuery } from '@/lib/useMediaQuery';

const snapshot = snapshotJson as Snapshot;
const PRESENT_SCALE = 1.4;

/** Chart clicks arrive as a slug (bar) or an axis label (company name). A click flips the company's whole group. */
function toggleCompanyGroup(state: FilterState, slugOrName: string): Partial<FilterState> | null {
  const group = snapshot.companies.find(c => c.slug === slugOrName || c.name === slugOrName)?.group;
  if (!group) return null;
  return { groups: { ...state.groups, [group]: !state.groups[group] } };
}

function cardHeight(card: CardDef): number {
  return card.id === 'per-company' ? 640 : 380;
}

export default function App() {
  const [state, update] = useUrlState();
  const [options, updateOptions] = useCardOptions();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const pools = useMemo(() => selectPools(snapshot, state), [state]);
  const phone = useMediaQuery('(max-width: 639px)');
  const narrow = phone && !state.present;
  const ctx: ChartContext = useMemo(
    () => ({ snapshot, state, pools, visible: state.buckets, scale: state.present ? PRESENT_SCALE : 1, options, narrow }),
    [state, pools, options, narrow],
  );

  useEffect(() => {
    scrollToHashCard();
    window.addEventListener('hashchange', scrollToHashCard);
    return () => window.removeEventListener('hashchange', scrollToHashCard);
  }, []);

  const answer = useMemo(() => buildAnswer(pools, state, snapshot.meta.pulledAt), [pools, state]);

  const renderCard = (card: CardDef, present: boolean) => {
    const title = card.poll;
    if (card.kind === 'answer') return <AnswerBlock key={card.id} answer={answer} cur={state.cur} present={present} />;
    if (card.kind === 'disclaimer') return <DisclaimerCard key={card.id} id={card.id} title={title} present={present} />;
    if (card.kind === 'questions') return <QuestionsCard key={card.id} id={card.id} title={title} present={present} questions={card.questions ?? []} heroTitle={card.id === 'warm-up'} />;
    if (card.kind === 'closing') return <ClosingCard key={card.id} id={card.id} title={title} present={present} />;
    if (card.kind === 'terms') return <TermsCard key={card.id} id={card.id} title={title} present={present} />;
    if (card.kind === 'method') return <MethodCard key={card.id} id={card.id} title={title} present={present} snapshot={snapshot} />;
    if (card.kind === 'companies') return <CompaniesCard key={card.id} id={card.id} title={title} present={present} snapshot={snapshot} state={state} />;
    if (card.kind === 'policies') return <PoliciesCard key={card.id} id={card.id} title={title} present={present} external={snapshot.external} />;
    const onClickName = card.id === 'per-company'
      ? (name: string) => { const patch = toggleCompanyGroup(state, name); if (patch) update(patch); }
      : undefined;
    const controls = present ? undefined : <CardControls cardId={card.id} options={options} onChange={updateOptions} />;
    return (
      <ChartCard key={card.id} id={card.id} title={title} ctx={ctx} build={card.build!} present={present} height={cardHeight(card)} controls={controls} onClickName={onClickName} takeaways={card.takeaways} />
    );
  };

  return (
    <TooltipProvider>
      {state.present ? (
        <PresentMode state={state} onChange={update} renderCard={card => renderCard(card, true)} />
      ) : (
        <>
          <TopNav state={state} filterCount={activeFilterCount(state)} onOpenFilters={() => setFiltersOpen(true)} onChange={update} />
          <FiltersSheet open={filtersOpen} onOpenChange={setFiltersOpen} snapshot={snapshot} state={state} ossN={pools.oss?.n ?? null} onChange={update} />
          <main className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 py-6">
            <div className="flex flex-col gap-5">
              <AnswerBlock answer={answer} cur={state.cur} present={false} />
              <AboutPanel snapshot={snapshot} />
            </div>
            {CARDS.filter(card => !EXPLORE_HIDDEN.includes(card.kind)).map(card => renderCard(card, false))}
            <footer className="py-6 text-center text-xs text-mute">
              Data pulled on {formatPulledAt(snapshot.meta.pulledAt)} from the Levels.fyi comp benchmark. INR at ₹{snapshot.meta.inrPerUsd} per USD.
            </footer>
          </main>
        </>
      )}
    </TooltipProvider>
  );
}
