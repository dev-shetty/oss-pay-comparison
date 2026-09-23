import { useState } from 'react';
import { DISCLAIMER } from '@/lib/cards';

const STORAGE_KEY = 'oss-pay-explorer:disclaimer-hidden';

function readHidden(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeHidden(hidden: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, hidden ? '1' : '0');
  } catch {
    return;
  }
}

export function DisclaimerBanner() {
  const [hidden, setHidden] = useState(readHidden);
  const toggle = () => { writeHidden(!hidden); setHidden(!hidden); };
  const half = Math.ceil(DISCLAIMER.length / 2);
  const columns = [DISCLAIMER.slice(0, half), DISCLAIMER.slice(half)];
  return (
    <aside className="mx-auto mt-4 max-w-[1100px] px-4" aria-label="Read this before the numbers">
      <div className="rounded-lg border border-border bg-muted/60 px-4 py-3 text-ink">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-extrabold">Read this before the numbers</h2>
          <button type="button" onClick={toggle} aria-expanded={!hidden}
            className="rounded text-xs font-bold text-primary outline-none underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring/60">
            {hidden ? 'Show' : 'Hide'}
          </button>
        </div>
        {!hidden && (
          <div className="mt-2 grid gap-x-8 gap-y-1 text-xs text-sub sm:grid-cols-2">
            {columns.map((items, ci) => (
              <ol key={ci} start={ci * half + 1} className="list-decimal space-y-1 pl-5">
                {items.map(sentence => <li key={sentence}>{sentence}</li>)}
              </ol>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
