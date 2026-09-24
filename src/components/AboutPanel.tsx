import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { methodRows } from '@/lib/method';
import type { Snapshot } from '@/lib/types';
import { DisclaimerList } from './DisclaimerList';
import { MethodList } from './MethodCard';

const STORAGE_KEY = 'oss-pay-explorer:about-open';

function readOpen(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeOpen(open: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
  } catch {
    return;
  }
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-extrabold text-ink">{children}</h3>;
}

export function AboutPanel({ snapshot }: { snapshot: Snapshot }) {
  const [open, setOpen] = useState(readOpen);
  const toggle = () => { writeOpen(!open); setOpen(!open); };
  return (
    <section id="about" className="rounded-lg border border-border bg-card" aria-label="About this data">
      <button type="button" onClick={toggle} aria-expanded={open} aria-controls="about-body"
        className="flex w-full items-center justify-between gap-4 rounded-lg px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
        <span className="text-sm font-extrabold text-ink">About this data</span>
        <span className="flex items-center gap-1 text-xs font-bold text-primary">
          {open ? 'Hide' : 'Show'}
          <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <div id="about-body" className="grid gap-6 border-t border-border px-4 pt-4 pb-5 md:grid-cols-[1fr_1fr]">
          <div>
            <Heading>Before the numbers</Heading>
            <DisclaimerList present={false} />
          </div>
          <div>
            <Heading>How this data was built</Heading>
            <MethodList rows={methodRows(snapshot)} />
          </div>
        </div>
      )}
    </section>
  );
}
