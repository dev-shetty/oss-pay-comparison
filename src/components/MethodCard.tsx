import { methodRows, type MethodRow } from '@/lib/method';
import type { Snapshot } from '@/lib/types';
import { TextCard, type TextCardProps } from './TextCards';

interface MethodCardProps extends Omit<TextCardProps, 'children'> {
  snapshot: Snapshot;
}

export function MethodList({ rows }: { rows: MethodRow[] }) {
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[8.5rem_1fr]">
      {rows.map(row => (
        <div key={row.label} className="contents">
          <dt className="font-bold text-ink">{row.label}</dt>
          <dd className="text-sub">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function MethodTiles({ rows }: { rows: MethodRow[] }) {
  return (
    <dl className="mx-auto grid w-full max-w-[1120px] grid-cols-2 gap-6">
      {rows.map(row => (
        <div key={row.label} className="flex min-h-[11rem] flex-col justify-between gap-6 rounded-2xl border border-border bg-muted/40 px-9 py-8">
          <dt className="text-sm font-extrabold tracking-[0.14em] text-primary uppercase">{row.label}</dt>
          <dd className="text-[2.25rem] leading-[1.15] font-extrabold tracking-[-0.02em] text-balance text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MethodCard({ id, title, present, snapshot }: MethodCardProps) {
  const rows = methodRows(snapshot);
  return (
    <TextCard id={id} title={title} present={present}>
      {present ? <MethodTiles rows={rows} /> : <MethodList rows={rows} />}
    </TextCard>
  );
}
