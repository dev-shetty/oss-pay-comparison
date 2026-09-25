import { DISCLAIMER } from '@/lib/cards';

function DisclaimerSlide() {
  return (
    <ol className="mx-auto flex w-full max-w-[1000px] list-none flex-col divide-y divide-border">
      {DISCLAIMER.map((line, i) => (
        <li key={line} className="flex items-baseline gap-8 py-7">
          <span aria-hidden className="w-10 shrink-0 text-2xl font-extrabold text-primary tabular-nums">{String(i + 1).padStart(2, '0')}</span>
          <span className="text-[2.25rem] leading-tight font-bold tracking-[-0.015em] text-ink">{line}</span>
        </li>
      ))}
    </ol>
  );
}

export function DisclaimerList({ present }: { present: boolean }) {
  if (present) return <DisclaimerSlide />;
  return (
    <ul className="flex list-none flex-col gap-2 text-base leading-snug font-semibold text-sub">
      {DISCLAIMER.map(line => (
        <li key={line} className="flex items-start gap-[0.6em]">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-mute" />
          {line}
        </li>
      ))}
    </ul>
  );
}
