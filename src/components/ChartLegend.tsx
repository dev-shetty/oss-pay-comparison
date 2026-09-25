import type { KeyItem } from '@/lib/chartKey';
import { BUCKET_COLORS, BUCKET_LABELS } from '@/lib/theme';
import type { Bucket } from '@/lib/types';
import { ChartKey } from './ChartKey';

interface ChartLegendProps {
  buckets: Bucket[];
  hidden: Bucket[];
  items: KeyItem[];
  present: boolean;
  onToggle: (bucket: Bucket) => void;
}

interface SwatchProps {
  bucket: Bucket;
  off: boolean;
  text: string;
  onToggle: (bucket: Bucket) => void;
}

function BucketSwatch({ bucket, off, text, onToggle }: SwatchProps) {
  const color = BUCKET_COLORS[bucket];
  return (
    <button
      type="button"
      aria-pressed={!off}
      onClick={() => onToggle(bucket)}
      className={`flex items-center gap-2 rounded font-bold text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${text} ${off ? 'opacity-60' : ''}`}
    >
      <span
        className="inline-block size-2.5 rounded-[3px] in-[.present-root]:size-3 border-2"
        style={{ borderColor: color, backgroundColor: off ? 'transparent' : color }}
      />
      {BUCKET_LABELS[bucket]}
    </button>
  );
}

/** Plain HTML so hover blur inside the canvas never touches it. Bucket toggles are local to the card. */
export function ChartLegend({ buckets, hidden, items, present, onToggle }: ChartLegendProps) {
  if (buckets.length === 0 && items.length === 0) return null;
  const text = present ? 'text-lg' : 'text-[13px]';
  const keyText = present ? 'text-base' : 'text-xs sm:text-[13px]';
  return (
    <div className={`relative flex flex-wrap items-center gap-y-1.5 ${present ? 'gap-x-6' : 'gap-x-4'}`}>
      {buckets.length > 0 && (
        <div className={`flex flex-wrap items-center gap-y-1 ${present ? 'gap-x-5' : 'gap-x-4'}`} role="group" aria-label="Legend">
          {buckets.map(b => <BucketSwatch key={b} bucket={b} off={hidden.includes(b)} text={text} onToggle={onToggle} />)}
        </div>
      )}
      {buckets.length > 0 && items.length > 0 && <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />}
      <div className={`flex flex-wrap items-center gap-y-1 font-semibold text-sub ${present ? 'gap-x-5' : 'gap-x-3.5'} ${keyText}`}>
        <ChartKey items={items} present={present} />
      </div>
    </div>
  );
}
