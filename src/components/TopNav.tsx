import { Presentation, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Brand } from './Brand';
import type { Currency, FilterState } from '@/lib/types';

interface TopNavProps {
  state: FilterState;
  filterCount: number;
  onOpenFilters: () => void;
  onChange: (patch: Partial<FilterState>) => void;
}

export function TopNav({ state, filterCount, onOpenFilters, onChange }: TopNavProps) {
  return (
    <div className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-4 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Brand />
        </div>
        <Button variant="outline" size="sm" onClick={onOpenFilters} aria-label={`Filters, ${filterCount} active`}>
          <SlidersHorizontal data-icon="inline-start" />
          Filters
          {filterCount > 0 && (
            <span className="ml-1 rounded-full bg-primary px-1.5 text-[11px] font-bold leading-4 text-primary-foreground">{filterCount}</span>
          )}
        </Button>
        <ToggleGroup value={[state.cur]} onValueChange={next => { if (next[0]) onChange({ cur: next[0] as Currency }); }} variant="outline" size="sm" spacing={0} aria-label="Currency">
          <ToggleGroupItem value="usd" className="data-pressed:bg-primary data-pressed:text-primary-foreground">USD</ToggleGroupItem>
          <ToggleGroupItem value="inr" className="data-pressed:bg-primary data-pressed:text-primary-foreground">INR</ToggleGroupItem>
        </ToggleGroup>
        <Button variant="ghost" size="sm" onClick={() => onChange({ present: true, card: 0 })}>
          <Presentation data-icon="inline-start" />
          Present
        </Button>
      </div>
    </div>
  );
}
