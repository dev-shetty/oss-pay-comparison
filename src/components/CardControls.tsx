import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { CardOptions, LevelView } from '@/lib/cardOptions.types';

interface ControlsProps {
  cardId: string;
  options: CardOptions;
  onChange: (patch: Partial<CardOptions>) => void;
}

interface PillProps<T extends string> { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }

function Pills<T extends string>({ value, options, onChange }: PillProps<T>) {
  return (
    <ToggleGroup value={[value]} onValueChange={next => { if (next[0]) onChange(next[0] as T); }} variant="outline" size="sm" spacing={0}>
      {options.map(o => (
        <ToggleGroupItem key={o.value} value={o.value} className="data-pressed:bg-primary data-pressed:text-primary-foreground">{o.label}</ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function CardControls({ cardId, options, onChange }: ControlsProps) {
  if (cardId === 'headline') {
    return (
      <label className="flex items-center gap-2 text-xs font-bold text-sub">
        Show company-median dot
        <Switch checked={options.medianOfCompanies} onCheckedChange={medianOfCompanies => onChange({ medianOfCompanies })} />
      </label>
    );
  }
  if (cardId === 'by-level') {
    return (
      <Pills<LevelView> value={options.levelView} onChange={levelView => onChange({ levelView })}
        options={[{ value: 'slope', label: 'Slope' }, { value: 'bars', label: 'Bars' }]} />
    );
  }
  return null;
}
