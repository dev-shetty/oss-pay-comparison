import { EXAMPLE, EXAMPLE_SALARIES, OTHER_TERMS, zoneOf, type Zone } from '@/lib/terms';
import { TextCard, type TextCardProps } from './TextCards';

const W = 1000;
const PLOT_LEFT = 270;
const PLOT_RIGHT = 975;
const ROW_H = 58;
const TOP = 24;
const x = (lakhs: number) => PLOT_LEFT + (lakhs / EXAMPLE.max) * (PLOT_RIGHT - PLOT_LEFT);
const rowY = (i: number) => TOP + i * ROW_H;

const BLUE = '#0060B9';
const ZONE_FILL: Record<Zone, string> = { mid50: BLUE, mid80: '#7FAEDC', outer: '#C9CDD1' };
const INK = '#1A1712';
const SUB = '#5B6268';
const RULE = '#E4E2DA';

const ROWS = [
  { term: '20 engineers', note: 'sorted by pay' },
  { term: 'p50 (median)', note: `₹${EXAMPLE.median}L · 10 below, 10 above` },
  { term: 'p25 – p75', note: `₹${EXAMPLE.mid50[0]}L to ₹${EXAMPLE.mid50[1]}L` },
  { term: 'p10 – p90', note: `₹${EXAMPLE.mid80[0]}L to ₹${EXAMPLE.mid80[1]}L` },
  { term: 'On a chart', note: 'dot · thick bar · thin line' },
];

function RowLabel({ i }: { i: number }) {
  const y = rowY(i);
  return (
    <g>
      <text x="0" y={y - 2} fontSize="20" fontWeight="800" fill={INK}>{ROWS[i].term}</text>
      <text x="0" y={y + 20} fontSize="15" fontWeight="600" fill={SUB}>{ROWS[i].note}</text>
      {i > 0 && <line x1="0" y1={y - 30} x2={PLOT_RIGHT} y2={y - 30} stroke={RULE} strokeWidth="1" />}
    </g>
  );
}

function Span({ from, to, y }: { from: number; to: number; y: number }) {
  return <path d={`M${x(from)} ${y - 9} V${y} H${x(to)} V${y - 9}`} fill="none" stroke={SUB} strokeWidth="2.5" />;
}

function ExampleSvg() {
  const count = EXAMPLE_SALARIES.length;
  const axisY = rowY(ROWS.length) - 14;
  return (
    <svg viewBox={`0 0 ${W} ${axisY + 30}`} className="w-full" role="img" aria-label="Twenty example salaries, their p50 (median), p25 to p75 and p10 to p90, and how a chart draws them">
      {ROWS.map((_, i) => <RowLabel key={i} i={i} />)}
      <line x1={x(EXAMPLE.median)} y1={rowY(0) - 22} x2={x(EXAMPLE.median)} y2={rowY(4) + 14} stroke={INK} strokeWidth="2" strokeDasharray="5 4" />
      {EXAMPLE_SALARIES.map((s, i) => (
        <circle key={`${s}-${i}`} cx={x(s)} cy={rowY(0) + 4} r="8" fill={ZONE_FILL[zoneOf(i, count)]} stroke="#fff" strokeWidth="1.5" />
      ))}
      <circle cx={x(EXAMPLE.median)} cy={rowY(1) + 4} r="9" fill={INK} />
      <Span from={EXAMPLE.mid50[0]} to={EXAMPLE.mid50[1]} y={rowY(2) + 10} />
      <Span from={EXAMPLE.mid80[0]} to={EXAMPLE.mid80[1]} y={rowY(3) + 10} />
      <line x1={x(EXAMPLE.mid80[0])} y1={rowY(4) + 4} x2={x(EXAMPLE.mid80[1])} y2={rowY(4) + 4} stroke={BLUE} strokeWidth="2.5" />
      <rect x={x(EXAMPLE.mid50[0])} y={rowY(4) - 7} width={x(EXAMPLE.mid50[1]) - x(EXAMPLE.mid50[0])} height="22" rx="11" fill={BLUE} opacity="0.55" />
      <circle cx={x(EXAMPLE.median)} cy={rowY(4) + 4} r="10" fill={BLUE} stroke="#fff" strokeWidth="3" />
      <line x1={PLOT_LEFT} y1={axisY} x2={PLOT_RIGHT} y2={axisY} stroke={RULE} strokeWidth="1.5" />
      {[0, 10, 20, 30, 40, 50, 60, 70].map(v => <text key={v} x={x(v)} y={axisY + 24} fontSize="15" textAnchor="middle" fill={SUB}>₹{v}L</text>)}
    </svg>
  );
}

export function TermsCard({ id, title, present }: Omit<TextCardProps, 'children'>) {
  return (
    <TextCard id={id} title={title} present={present}>
      <div className={`mx-auto flex w-full flex-col ${present ? 'max-w-[1240px] gap-8' : 'gap-6'}`}>
        <ExampleSvg />
        <dl className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${present ? 'text-lg' : 'text-sm'}`}>
          {OTHER_TERMS.map(t => (
            <div key={t.term} className="rounded-lg bg-muted/60 px-4 py-3">
              <dt className="font-extrabold text-ink">{t.term}</dt>
              <dd className="mt-1 text-sub">{t.meaning}</dd>
            </div>
          ))}
        </dl>
      </div>
    </TextCard>
  );
}
