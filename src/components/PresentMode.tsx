import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { presentOrder, type CardDef } from '@/lib/cards';
import type { FilterState } from '@/lib/types';
import { Brand } from './Brand';

interface PresentModeProps {
  state: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  renderCard: (card: CardDef) => React.ReactNode;
}

/** Slides with many rows skip the 900px cap so each row stays readable. */
const TALL_SLIDES = ['per-company'];

export function PresentMode({ state, onChange, renderCard }: PresentModeProps) {
  const cards = presentOrder();
  const index = Math.min(state.card, cards.length - 1);
  const card = cards[index];
  const step = (delta: number) => onChange({ card: Math.max(0, Math.min(cards.length - 1, index + delta)) });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') step(1);
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'Escape') onChange({ present: false, card: 0 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="present-root fixed inset-0 z-40 flex flex-col justify-center overflow-hidden bg-background">
      <div className="mx-auto flex h-16 w-[min(90vw,1440px)] shrink-0 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-[3.25rem] text-base font-bold text-mute tabular-nums">{index + 1} / {cards.length}</span>
          <span className="h-5 w-px bg-border" aria-hidden />
          <Brand />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous card" onClick={() => step(-1)} disabled={index === 0}><ChevronLeft /></Button>
          <Button variant="ghost" size="icon" aria-label="Next card" onClick={() => step(1)} disabled={index === cards.length - 1}><ChevronRight /></Button>
          <Button variant="ghost" size="icon" aria-label="Exit present mode" onClick={() => onChange({ present: false, card: 0 })}><X /></Button>
        </div>
      </div>
      <div className={`mx-auto w-[min(90vw,1440px)] shrink-0 overflow-hidden ${TALL_SLIDES.includes(card.id) ? 'h-[calc(100dvh-88px)]' : 'h-[min(calc(100dvh-88px),900px)]'}`}>
        {renderCard(card)}
      </div>
    </div>
  );
}
