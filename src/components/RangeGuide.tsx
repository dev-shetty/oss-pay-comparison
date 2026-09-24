interface RangeGuideProps {
  present: boolean;
  /** Per-company charts mark the median with a tick instead of a dot. */
  mark: 'dot' | 'tick';
}

const INK = '#1A1712';
const SUB = '#5B6268';
const BAND = '#8A9096';

/** A worked example of one band, so the reader learns the encoding without opening the help popover. */
export function RangeGuide({ present, mark }: RangeGuideProps) {
  const size = present ? 16 : 12;
  return (
    <figure className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-muted/60 px-4 py-3" aria-label="How to read the bands">
      <svg viewBox="0 0 260 44" className={present ? 'h-16 w-auto' : 'h-11 w-auto'} role="img" aria-hidden>
        {mark === 'dot' && <line x1="6" y1="30" x2="254" y2="30" stroke={BAND} strokeWidth="2" />}
        <rect x="70" y="24" width="120" height="12" rx="6" fill={BAND} opacity="0.55" />
        {mark === 'dot'
          ? <circle cx="112" cy="30" r="6" fill={INK} stroke="white" strokeWidth="2" />
          : <rect x="110" y="21" width="4" height="18" rx="2" fill={INK} />}
        <path d="M70 12 V17 M190 12 V17 M70 14.5 H190" stroke={SUB} strokeWidth="1.5" fill="none" />
        <text x="130" y="9" textAnchor="middle" fontSize="10" fontWeight="700" fill={SUB}>middle 50%</text>
      </svg>
      <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[auto_1fr]" style={{ fontSize: size }}>
        <dt className="font-extrabold text-ink">{mark === 'dot' ? 'Dot' : 'Tick'} = median</dt>
        <dd className="text-sub">Half the engineers earn less, half earn more.</dd>
        <dt className="font-extrabold text-ink">Thick bar = middle 50%</dt>
        <dd className="text-sub">Half the engineers are paid inside this range.</dd>
        {mark === 'dot' && <dt className="font-extrabold text-ink">Thin line</dt>}
        {mark === 'dot' && <dd className="text-sub">The rest, apart from extreme outliers.</dd>}
      </dl>
    </figure>
  );
}
