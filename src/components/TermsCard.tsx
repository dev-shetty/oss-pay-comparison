import { EXAMPLE, EXAMPLE_SALARIES, OTHER_TERMS, zoneOf, type Zone } from '@/lib/terms';
import { TextCard, type TextCardProps } from './TextCards';

const W = 1000;
const PLOT_LEFT = 200;
const PLOT_RIGHT = 975;
const TICKS = [0, 10, 20, 30, 40, 50, 60, 70];
const x = (lakhs: number) => PLOT_LEFT + (lakhs / EXAMPLE.max) * (PLOT_RIGHT - PLOT_LEFT);

const MEDIAN_LABEL_Y = 20;
const DOTS_Y = 62;
const MARK_Y = 124;
const MID50_DIM_Y = 166;
const MID80_DIM_Y = 198;
const AXIS_Y = 236;
/** Both range labels start on one edge, just past the widest span. */
const LABEL_X = 16;

const BLUE = '#0060B9';
const BAND = '#8DB6E0';
const ZONE_FILL: Record<Zone, string> = { mid50: BLUE, mid80: '#7FAEDC', outer: '#C9CDD1' };
const INK = '#1A1712';
const SUB = '#5B6268';
const MUTE = '#A39C90';
const RULE = '#E3E6EA';
const GUIDE = '#C9CDD1';

/** A white halo keeps annotation text readable over the guides. */
const HALO = { stroke: '#fff', strokeWidth: 6, paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };

function Dimension({ from, to, y }: { from: number; to: number; y: number }) {
  const x1 = x(from);
  const x2 = x(to);
  return (
    <g stroke={SUB} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={`M${x1} ${y - 7} V${y + 7} M${x2} ${y - 7} V${y + 7}`} />
      <path d={`M${x1 + 2} ${y} H${x2 - 2}`} />
      <path d={`M${x1 + 8} ${y - 4.5} L${x1 + 2} ${y} L${x1 + 8} ${y + 4.5} M${x2 - 8} ${y - 4.5} L${x2 - 2} ${y} L${x2 - 8} ${y + 4.5}`} />
    </g>
  );
}

interface AnnotationProps { at: number; y: number; term: string; value: string; anchor?: 'middle' | 'start' }

function Annotation({ at, y, term, value, anchor = 'middle' }: AnnotationProps) {
  const dx = anchor === 'start' ? LABEL_X : 0;
  return (
    <text x={x(at) + dx} y={y} textAnchor={anchor} dominantBaseline={anchor === 'start' ? 'central' : 'auto'} {...HALO}>
      <tspan fontSize="15" fontWeight="800" fill={INK}>{term}</tspan>
      <tspan fontSize="12.5" fontWeight="600" fill={SUB} dx="6">{value}</tspan>
    </text>
  );
}

function RowLabel({ y, term, note }: { y: number; term: string; note: string }) {
  return (
    <g>
      <text x="0" y={y - 2} fontSize="18" fontWeight="800" fill={INK}>{term}</text>
      <text x="0" y={y + 17} fontSize="13" fontWeight="600" fill={SUB}>{note}</text>
    </g>
  );
}

function ExampleSvg() {
  const count = EXAMPLE_SALARIES.length;
  const [p10, p90] = EXAMPLE.mid80;
  const [p25, p75] = EXAMPLE.mid50;
  return (
    <svg viewBox={`0 0 ${W} ${AXIS_Y + 28}`} className="w-full" role="img" aria-label="Twenty example salaries and the chart mark drawn from them: the dot is the p50 (median), the thick bar spans p25 to p75, the thin line spans p10 to p90">
      <RowLabel y={DOTS_Y} term="20 engineers" note="sorted by pay" />
      <RowLabel y={MARK_Y} term="On a chart" note="dot · thick bar · thin line" />

      {[[p25, MID50_DIM_Y], [p75, MID50_DIM_Y], [p10, MID80_DIM_Y], [p90, MID80_DIM_Y]].map(([v, end]) => (
        <line key={v} x1={x(v)} y1={DOTS_Y + 12} x2={x(v)} y2={end} stroke={GUIDE} strokeWidth="1.25" strokeDasharray="3 3" />
      ))}
      <line x1={x(EXAMPLE.median)} y1={MEDIAN_LABEL_Y + 8} x2={x(EXAMPLE.median)} y2={MARK_Y} stroke={INK} strokeWidth="1.5" strokeDasharray="4 4" />

      {EXAMPLE_SALARIES.map((s, i) => (
        <circle key={`${s}-${i}`} cx={x(s)} cy={DOTS_Y} r="7.5" fill={ZONE_FILL[zoneOf(i, count)]} stroke="#fff" strokeWidth="1.5" />
      ))}

      <line x1={x(p10)} y1={MARK_Y} x2={x(p90)} y2={MARK_Y} stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" />
      <rect x={x(p25)} y={MARK_Y - 11} width={x(p75) - x(p25)} height="22" rx="11" fill={BAND} />
      <circle cx={x(EXAMPLE.median)} cy={MARK_Y} r="10" fill={BLUE} stroke="#fff" strokeWidth="3" />

      <Annotation at={EXAMPLE.median} y={MEDIAN_LABEL_Y} term="p50 (median)" value={`₹${EXAMPLE.median}L · 10 below, 10 above`} />
      <Dimension from={p25} to={p75} y={MID50_DIM_Y} />
      <Annotation at={p90} y={MID50_DIM_Y} anchor="start" term="p25 – p75" value={`₹${p25}L to ₹${p75}L`} />
      <Dimension from={p10} to={p90} y={MID80_DIM_Y} />
      <Annotation at={p90} y={MID80_DIM_Y} anchor="start" term="p10 – p90" value={`₹${p10}L to ₹${p90}L`} />

      <line x1={PLOT_LEFT} y1={AXIS_Y} x2={PLOT_RIGHT} y2={AXIS_Y} stroke={RULE} strokeWidth="1.5" />
      {TICKS.map(v => (
        <g key={v}>
          <line x1={x(v)} y1={AXIS_Y} x2={x(v)} y2={AXIS_Y + 5} stroke={RULE} strokeWidth="1.5" />
          <text x={x(v)} y={AXIS_Y + 22} fontSize="13" fontWeight="600" textAnchor="middle" fill={MUTE}>₹{v}L</text>
        </g>
      ))}
    </svg>
  );
}

export function TermsCard({ id, title, present }: Omit<TextCardProps, 'children'>) {
  return (
    <TextCard id={id} title={title} present={present}>
      <div className={`mx-auto flex w-full flex-col ${present ? 'max-w-[1240px] gap-10' : 'gap-6'}`}>
        <ExampleSvg />
        <dl className={`grid sm:grid-cols-2 lg:grid-cols-4 ${present ? 'gap-4 text-lg' : 'gap-3 text-sm'}`}>
          {OTHER_TERMS.map(t => (
            <div key={t.term} className={present ? 'rounded-2xl border border-border bg-muted/40 px-6 py-5' : 'rounded-lg bg-muted/60 px-4 py-3'}>
              <dt className={present ? 'text-sm font-extrabold tracking-[0.12em] text-primary uppercase' : 'font-extrabold text-ink'}>{t.term}</dt>
              <dd className={present ? 'mt-2 leading-snug font-semibold text-ink' : 'mt-1 text-sub'}>{t.meaning}</dd>
            </div>
          ))}
        </dl>
      </div>
    </TextCard>
  );
}
