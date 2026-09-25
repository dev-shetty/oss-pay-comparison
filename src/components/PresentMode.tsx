import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Maximize, Minimize, X } from 'lucide-react';
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

function useFullscreen(): [boolean, () => void] {
  const [on, setOn] = useState(() => document.fullscreenElement !== null);
  useEffect(() => {
    const sync = () => setOn(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };
  return [on, toggle];
}

/** Fullscreen drops the 64px bar, so the slide takes the whole screen minus a margin. */
function slideHeight(id: string, fullscreen: boolean): string {
  if (fullscreen) return 'h-[calc(100dvh-48px)]';
  return TALL_SLIDES.includes(id) ? 'h-[calc(100dvh-88px)]' : 'h-[min(calc(100dvh-88px),900px)]';
}

export function PresentMode({ state, onChange, renderCard }: PresentModeProps) {
  const [fullscreen, toggleFullscreen] = useFullscreen();
  const exit = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    onChange({ present: false, card: 0 });
  };
  const cards = presentOrder();
  const index = Math.min(state.card, cards.length - 1);
  const card = cards[index];
  const step = (delta: number) => {
    const next = Math.max(0, Math.min(cards.length - 1, index + delta));
    if (next === index) return;
    const heroSwap = cards[index].id === 'warm-up' || cards[next].id === 'warm-up';
    if (!heroSwap || !document.startViewTransition) return onChange({ card: next });
    document.startViewTransition(() => flushSync(() => onChange({ card: next })));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') step(1);
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'Escape' && !document.fullscreenElement) exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="present-root fixed inset-0 z-40 flex flex-col justify-center overflow-hidden bg-background">
      {!fullscreen && <div className="mx-auto flex h-16 w-[min(90vw,1440px)] shrink-0 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-[3.25rem] text-base font-bold text-mute tabular-nums">{index + 1} / {cards.length}</span>
          <span className="h-5 w-px bg-border" aria-hidden />
          <Brand />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous card" onClick={() => step(-1)} disabled={index === 0}><ChevronLeft /></Button>
          <Button variant="ghost" size="icon" aria-label="Next card" onClick={() => step(1)} disabled={index === cards.length - 1}><ChevronRight /></Button>
          <Button variant="ghost" size="icon" aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen (F)'} onClick={toggleFullscreen}>{fullscreen ? <Minimize /> : <Maximize />}</Button>
          <Button variant="ghost" size="icon" aria-label="Exit present mode" onClick={exit}><X /></Button>
        </div>
      </div>}
      <div className={`mx-auto w-[min(90vw,1440px)] shrink-0 overflow-hidden ${slideHeight(card.id, fullscreen)}`}>
        {renderCard(card)}
      </div>
    </div>
  );
}
