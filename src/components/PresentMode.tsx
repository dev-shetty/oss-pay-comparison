import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { presentOrder, type CardDef } from '@/lib/cards';
import type { FilterState } from '@/lib/types';

interface PresentModeProps {
  state: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  renderCard: (card: CardDef) => React.ReactNode;
}

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
    <div className="present-root fixed inset-0 z-40 flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 py-3">
        <span className="text-base font-bold text-mute">
          {index + 1} / {cards.length} · OSS Pay Explorer · Levels.fyi · IndiaFOSS 2026
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous card" onClick={() => step(-1)} disabled={index === 0}><ChevronLeft /></Button>
          <Button variant="ghost" size="icon" aria-label="Next card" onClick={() => step(1)} disabled={index === cards.length - 1}><ChevronRight /></Button>
          <Button variant="ghost" size="icon" aria-label="Exit present mode" onClick={() => onChange({ present: false, card: 0 })}><X /></Button>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1400px] flex-1 overflow-auto px-6 pb-6">
        {renderCard(card)}
      </div>
    </div>
  );
}
