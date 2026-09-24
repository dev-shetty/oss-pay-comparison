import type { ReactNode } from 'react';
import type { Glyph, KeyItem } from '@/lib/chartKey';
import { COLORS, lighten, withAlpha } from '@/lib/theme';

const INK = COLORS.sub;
const TINT = lighten(COLORS.sub, 0.68);

function wedge(fill: string, top: string, bottom: string): ReactNode {
  return (
    <>
      <polygon points="1,6 19,2 19,12 1,9" fill={withAlpha(fill, 0.25)} />
      <line x1="1" y1="6" x2="19" y2="2" stroke={top} strokeWidth="2" strokeLinecap="round" />
      <line x1="1" y1="9" x2="19" y2="12" stroke={bottom} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

const SVG_GLYPHS: Partial<Record<Glyph, ReactNode>> = {
  band: <rect x="1" y="4" width="18" height="6" rx="3" fill={withAlpha(INK, 0.85)} />,
  tintBand: <rect x="1" y="4" width="18" height="6" rx="3" fill={TINT} />,
  dot: <circle cx="10" cy="7" r="4.5" fill={INK} stroke="#fff" strokeWidth="1.5" />,
  smallDot: <circle cx="10" cy="7" r="2.8" fill={TINT} />,
  filledDot: <circle cx="10" cy="7" r="5" fill={INK} />,
  hollowDot: <circle cx="10" cy="7" r="4.5" fill="#fff" stroke={INK} strokeWidth="1.8" />,
  dotSizes: (
    <>
      <circle cx="3" cy="7" r="1.8" fill={INK} />
      <circle cx="8.6" cy="7" r="2.8" fill={INK} />
      <circle cx="15.4" cy="7" r="4" fill={INK} />
    </>
  ),
  tick: <rect x="8.8" y="1" width="2.4" height="12" rx="1.2" fill={INK} />,
  tintBar: <rect x="6" y="2" width="8" height="12" rx="1.5" fill={TINT} />,
  dashed: <line x1="1" y1="7" x2="19" y2="7" stroke={INK} strokeWidth="2" strokeDasharray="3.5 2.5" />,
  wedgeAhead: wedge(COLORS.blue, COLORS.blue, COLORS.amber),
  wedgeBehind: wedge(COLORS.amber, COLORS.amber, COLORS.blue),
  lightChip: <rect x="1" y="2.5" width="18" height="9" rx="4.5" fill={lighten(INK, 0.84)} />,
  shades: (
    <>
      <rect x="0.5" y="2" width="5.5" height="10" rx="1" fill={INK} />
      <rect x="7.25" y="2" width="5.5" height="10" rx="1" fill={lighten(INK, 0.45)} />
      <rect x="14" y="2" width="5.5" height="10" rx="1" fill={lighten(INK, 0.75)} />
    </>
  ),
};

function GlyphMark({ item, present }: { item: KeyItem; present: boolean }) {
  if (item.glyph === 'value') {
    return <span className={`leading-tight font-extrabold ${item.tone === 'blue' ? 'text-primary' : 'text-ink'}`}>{item.text}</span>;
  }
  if (item.glyph === 'filterTag') {
    return <span className="rounded-[3px] bg-oss/10 px-1 text-[0.85em] leading-tight font-bold text-primary">filter</span>;
  }
  return (
    <svg aria-hidden viewBox="0 0 20 14" className={present ? 'h-5 w-7' : 'h-4 w-[22px]'}>
      {SVG_GLYPHS[item.glyph]}
    </svg>
  );
}

interface ChartKeyProps {
  items: KeyItem[];
  present: boolean;
  trailing?: ReactNode;
}

/** Each mark gets a 1 to 3 word name; full sentences live in the help popover, passed as `trailing` so it never wraps alone. */
export function ChartKey({ items, present, trailing }: ChartKeyProps) {
  if (items.length === 0) return <>{trailing}</>;
  return (
    <ul className="contents" aria-label="Chart key">
      {items.map((item, i) => (
        <li key={`${item.glyph}-${item.label}`} className="flex items-center gap-1.5 whitespace-nowrap">
          <GlyphMark item={item} present={present} />
          {item.label}
          {i === items.length - 1 && trailing && <span className="ml-1 inline-flex">{trailing}</span>}
        </li>
      ))}
    </ul>
  );
}
