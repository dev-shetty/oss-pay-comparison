import { BUCKET_COLORS, BUCKET_LABELS } from '@/lib/theme';
import type { Bucket } from '@/lib/types';

interface ChartLegendProps {
  buckets: Bucket[];
  hidden: Bucket[];
  present: boolean;
  onToggle: (bucket: Bucket) => void;
}

/** Plain HTML so hover blur inside the canvas never touches it. Toggles are local to the card. */
export function ChartLegend({ buckets, hidden, present, onToggle }: ChartLegendProps) {
  if (buckets.length === 0) return null;
  const text = present ? 'text-lg' : 'text-[13px]';
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1" role="group" aria-label="Legend">
      {buckets.map(b => {
        const off = hidden.includes(b);
        const color = BUCKET_COLORS[b];
        return (
          <button
            key={b}
            type="button"
            aria-pressed={!off}
            onClick={() => onToggle(b)}
            className={`flex items-center gap-1.5 rounded font-bold text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${text} ${off ? 'opacity-60' : ''}`}
          >
            <span
              className="inline-block size-2.5 rounded-[3px] border-2"
              style={off ? { borderColor: color, backgroundColor: 'transparent' } : { borderColor: color, backgroundColor: color }}
            />
            {BUCKET_LABELS[b]}
          </button>
        );
      })}
    </div>
  );
}
