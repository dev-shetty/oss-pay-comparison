import { useMemo, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CardControls } from '@/components/CardControls';
import { ChartCard } from '@/components/ChartCard';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { FiltersSheet } from '@/components/FiltersSheet';
import { TopNav } from '@/components/TopNav';
import { PresentMode } from '@/components/PresentMode';
import { DisclaimerCard, PoliciesCard } from '@/components/TextCards';
import type { ChartContext } from '@/components/charts/shared';
import snapshotJson from '@/data/snapshot.json';
import { useCardOptions } from '@/lib/cardOptions';
import { CARDS, type CardDef } from '@/lib/cards';
import { selectPools } from '@/lib/pools';
import { type FilterState, type Snapshot, type ToggleSlug } from '@/lib/types';
import { activeFilterCount, useUrlState } from '@/lib/urlState';

const snapshot = snapshotJson as Snapshot;
const PRESENT_SCALE = 1.4;

/** Chart clicks arrive as a slug (bar) or an axis label such as "Red Hat (out)". */
function toggleCompany(state: FilterState, slugOrName: string): Partial<FilterState> | null {
  const label = slugOrName.replace(/ \(out\)$/, '');
  const company = snapshot.companies.find(c => c.slug === slugOrName || c.name === label);
  if (!company || !snapshot.meta.toggles.includes(company.slug as ToggleSlug)) return null;
  const key = company.slug as ToggleSlug;
  return { toggles: { ...state.toggles, [key]: !state.toggles[key] } };
}

function cardHeight(card: CardDef, present: boolean): number | string {
  if (present) return 'calc(100vh - 260px)';
  return card.id === 'per-company' ? 640 : 380;
}

export default function App() {
  const [state, update] = useUrlState();
  const [options, updateOptions] = useCardOptions();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const pools = useMemo(() => selectPools(snapshot, state), [state]);
  const ctx: ChartContext = useMemo(
    () => ({ snapshot, state, pools, visible: state.buckets, scale: state.present ? PRESENT_SCALE : 1, options }),
    [state, pools, options],
  );

  const renderCard = (card: CardDef, present: boolean) => {
    const title = present ? card.poll : card.title(ctx);
    const height = cardHeight(card, present);
    if (card.kind === 'disclaimer') return <DisclaimerCard key={card.id} id={card.id} title={title} present={present} />;
    if (card.kind === 'policies') return <PoliciesCard key={card.id} id={card.id} title={title} present={present} external={snapshot.external} />;
    const onClickName = card.id === 'per-company'
      ? (name: string) => { const patch = toggleCompany(state, name); if (patch) update(patch); }
      : undefined;
    const controls = <CardControls cardId={card.id} present={present} options={options} onChange={updateOptions} />;
    return (
      <ChartCard key={card.id} id={card.id} title={title} ctx={ctx} build={card.build!} present={present} height={height} controls={controls} onClickName={onClickName} />
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
          <DisclaimerBanner />
          <main className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 py-6">
            {CARDS.filter(card => card.kind !== 'disclaimer').map(card => renderCard(card, false))}
            <footer className="py-6 text-center text-xs text-mute">
              Data pulled {snapshot.meta.pulledAt} from the Levels.fyi comp benchmark. INR at ₹{snapshot.meta.inrPerUsd} per USD.
            </footer>
          </main>
        </>
      )}
    </TooltipProvider>
  );
}
