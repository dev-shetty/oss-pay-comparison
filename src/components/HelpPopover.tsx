import { useId, useState } from 'react';
import { Info } from 'lucide-react';

interface HelpPopoverProps {
  lines: string[];
  present: boolean;
}

/** Opens on hover and focus, and click pins it so touch and projector use both work. */
export function HelpPopover({ lines, present }: HelpPopoverProps) {
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const id = useId();
  const open = pinned || hover;
  const text = present ? 'text-base' : 'text-xs';
  return (
    <span className="relative inline-flex" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        aria-label="How to read this chart"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setPinned(p => !p)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        className="rounded-full text-mute outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <Info className={present ? 'size-5' : 'size-4'} />
      </button>
      {open && (
        <div id={id} role="tooltip" className={`absolute top-full left-0 z-40 mt-2 w-80 rounded-lg border border-border bg-white p-3 text-ink shadow-card ${text}`}>
          <p className="mb-1 font-extrabold">How to read</p>
          <ul className="space-y-1 text-sub">
            {lines.map(line => <li key={line}>{line}</li>)}
          </ul>
        </div>
      )}
    </span>
  );
}
