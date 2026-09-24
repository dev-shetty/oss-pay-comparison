import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BUCKET_COLORS, BUCKET_LABELS } from '@/lib/theme';
import { BUCKETS, TOGGLES, type Bucket, type FilterState, type Snapshot, type ToggleSlug } from '@/lib/types';
import { DEFAULT_STATE, toggleBucket } from '@/lib/urlState';
import { salaries } from '@/lib/companies';
import { formatPct } from '@/lib/format';
import { share } from '@/lib/pools';

interface FiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: Snapshot;
  state: FilterState;
  ossN: number | null;
  onChange: (patch: Partial<FilterState>) => void;
}

function Group({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-extrabold text-ink">{label}</h3>
      <p className="text-xs leading-snug text-sub">{help}</p>
      {children}
    </section>
  );
}

interface PillsProps<T extends string> { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }

function Pills<T extends string>({ value, options, onChange }: PillsProps<T>) {
  return (
    <ToggleGroup value={[value]} onValueChange={next => { if (next[0]) onChange(next[0] as T); }} variant="outline" size="sm" spacing={0}>
      {options.map(o => (
        <ToggleGroupItem key={o.value} value={o.value} className="data-pressed:bg-primary data-pressed:text-primary-foreground">{o.label}</ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

interface ChipProps { label: string; color: string; active: boolean; onClick: () => void }

function Chip({ label, color, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={active ? { backgroundColor: color, borderColor: color } : { color, borderColor: color }}
      className={`h-7 rounded-full border px-3 text-xs font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 ${active ? 'text-white' : 'bg-white opacity-70 hover:opacity-100'}`}
    >
      {label}
    </button>
  );
}

function toggleShare(snapshot: Snapshot): string {
  const oss = snapshot.companies.filter(c => c.bucket === 'oss');
  const part = oss.filter(c => TOGGLES.includes(c.slug as ToggleSlug)).reduce((s, c) => s + salaries(c), 0);
  return formatPct(share(part, oss.reduce((s, c) => s + salaries(c), 0)));
}

function companyName(snapshot: Snapshot, slug: ToggleSlug): string {
  return snapshot.companies.find(c => c.slug === slug)?.name ?? slug;
}

export function FiltersSheet({ open, onOpenChange, snapshot, state, ossN, onChange }: FiltersSheetProps) {
  const bucketLabel = (b: Bucket) => (b === 'oss' && ossN !== null ? `OSS (${ossN})` : BUCKET_LABELS[b]);
  const reset = () => onChange({ metric: DEFAULT_STATE.metric, cut: DEFAULT_STATE.cut, buckets: [...BUCKETS], toggles: { ...DEFAULT_STATE.toggles }, sort: DEFAULT_STATE.sort });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-0 right-0 left-auto flex h-full max-w-sm translate-x-0 translate-y-0 flex-col gap-6 [&>section]:gap-1.5 overflow-y-auto rounded-none rounded-l-xl p-6 data-open:slide-in-from-right data-closed:slide-out-to-right data-open:zoom-in-100 data-closed:zoom-out-100 motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8">
            <DialogTitle className="text-lg font-extrabold">Filters</DialogTitle>
            <button type="button" onClick={reset} className="text-xs font-bold text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring/60 rounded outline-none">Reset</button>
          </div>
          <DialogDescription className="sr-only">Filters for every chart.</DialogDescription>
        </DialogHeader>
        <Group label="Metric" help="Total comp = base + stock + bonus. Base = cash salary only.">
          <Pills value={state.metric} onChange={metric => onChange({ metric })} options={[{ value: 'tc', label: 'Total comp' }, { value: 'base', label: 'Base' }]} />
        </Group>
        <Group label="Cut" help="All levels pools every salary. By level uses Levels.fyi normalized L1–L5. By experience uses years since first job.">
          <Pills value={state.cut} onChange={cut => onChange({ cut })} options={[{ value: 'all', label: 'All levels' }, { value: 'level', label: 'By level' }, { value: 'yoe', label: 'By experience' }]} />
        </Group>
        <Group label="Buckets" help="Show or hide a bucket on every chart.">
          <div className="flex flex-wrap gap-2">
            {BUCKETS.map(b => (
              <Chip key={b} label={bucketLabel(b)} color={BUCKET_COLORS[b]} active={state.buckets.includes(b)} onClick={() => onChange({ buckets: toggleBucket(state, b) })} />
            ))}
          </div>
        </Group>
        <Group label="In the OSS pool" help={`Turn a company off and every OSS number recomputes from the pre-computed pools. These four are ${toggleShare(snapshot)} of OSS salaries.`}>
          <div className="flex flex-wrap gap-2">
            {TOGGLES.map(slug => (
              <Chip key={slug} label={companyName(snapshot, slug)} color={BUCKET_COLORS.oss} active={state.toggles[slug]}
                onClick={() => onChange({ toggles: { ...state.toggles, [slug]: !state.toggles[slug] } })} />
            ))}
          </div>
        </Group>
        <Group label="Sort" help="Per-company card only.">
          <Pills value={state.sort} onChange={sort => onChange({ sort })} options={[{ value: 'value', label: 'By value' }, { value: 'bucket', label: 'By bucket' }]} />
        </Group>
        <p className="mt-auto pt-4 text-xs text-mute">Changes apply live and stay in the page link.</p>
      </DialogContent>
    </Dialog>
  );
}
