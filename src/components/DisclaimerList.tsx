import { DISCLAIMER } from '@/lib/cards';

export function DisclaimerList({ present }: { present: boolean }) {
  const text = present ? 'text-[2.5rem] leading-tight gap-7 font-bold text-ink' : 'text-base leading-snug gap-2 font-semibold text-sub';
  const dot = present ? 'size-3 mt-[19px]' : 'size-1.5 mt-2';
  return (
    <ul className={`flex list-none flex-col ${text}`}>
      {DISCLAIMER.map(line => (
        <li key={line} className="flex items-start gap-[0.6em]">
          <span aria-hidden className={`${dot} shrink-0 rounded-full bg-mute`} />
          {line}
        </li>
      ))}
    </ul>
  );
}
