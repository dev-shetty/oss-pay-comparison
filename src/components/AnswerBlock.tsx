import type { Answer, HeroRow } from '@/lib/answer';
import { formatMoney, formatRatio } from '@/lib/format';
import { BUCKET_COLORS, BUCKET_LABELS, HERO_TITLE } from '@/lib/theme';
import type { Currency } from '@/lib/types';

interface AnswerBlockProps {
  answer: Answer | null;
  cur: Currency;
  present: boolean;
}

/** The longest bar stops short of the track end so its value label always fits after it. */
const BAR_SPAN = 76;

const SIZES = {
  explore: {
    root: 'flex flex-col gap-6 pt-6 pb-2 sm:pt-10',
    headline: 'text-[2rem] sm:text-[3rem]',
    list: 'gap-3',
    grid: 'sm:grid-cols-[10rem_1fr_8.5rem]',
    name: 'text-sm sm:text-base',
    bar: 'h-7',
    value: 'text-lg sm:text-[1.375rem]',
    chip: 'text-xs px-2.5 py-0.5',
    caption: 'text-[13px] sm:text-sm',
  },
  present: {
    root: 'flex h-full flex-col justify-center gap-12 rounded-[20px] bg-card px-20 shadow-slide ring-1 ring-black/[0.04]',
    headline: 'text-[4.5rem]',
    list: 'gap-5',
    grid: 'sm:grid-cols-[14rem_1fr_11rem]',
    name: 'text-2xl',
    bar: 'h-12',
    value: 'text-4xl',
    chip: 'text-lg px-4 py-1',
    caption: 'text-lg border-t border-border pt-6',
  },
} as const;

type Sizes = (typeof SIZES)[keyof typeof SIZES];

interface RowProps {
  row: HeroRow;
  max: number;
  cur: Currency;
  sizes: Sizes;
}

function StripRow({ row, max, cur, sizes }: RowProps) {
  const width = `${(row.median / max) * BAR_SPAN}%`;
  return (
    <li className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 [grid-template-areas:'name_chip''bar_bar'] sm:[grid-template-areas:'name_bar_chip'] ${sizes.grid}`}>
      <span className={`${sizes.name} font-bold text-ink [grid-area:name]`}>{BUCKET_LABELS[row.bucket]}</span>
      <div className="flex min-w-0 items-center gap-3 [grid-area:bar]">
        <div aria-hidden className={`hero-bar ${sizes.bar} shrink-0 rounded-[6px]`} style={{ width, backgroundColor: BUCKET_COLORS[row.bucket] }} />
        <span className={`${sizes.value} font-extrabold tracking-[-0.01em] text-ink tabular-nums`}>{formatMoney(row.median, cur)}</span>
      </div>
      <span className="justify-self-end [grid-area:chip]">
        {row.ossRatio !== null && (
          <span className={`${sizes.chip} inline-block rounded-full bg-muted font-bold whitespace-nowrap text-sub tabular-nums`}>
            OSS is {formatRatio(row.ossRatio)}
          </span>
        )}
      </span>
    </li>
  );
}

export function AnswerBlock({ answer, cur, present }: AnswerBlockProps) {
  if (!answer) return null;
  const sizes = present ? SIZES.present : SIZES.explore;
  return (
    <section aria-label="The answer" className={sizes.root}>
      <h1 style={present ? { viewTransitionName: HERO_TITLE } : undefined} className={`${sizes.headline} leading-[1.05] font-extrabold tracking-[-0.02em] text-balance text-ink`}>{answer.headline}</h1>
      <ul className={`flex flex-col ${sizes.list}`}>
        {answer.rows.map(row => <StripRow key={row.bucket} row={row} max={answer.max} cur={cur} sizes={sizes} />)}
      </ul>
      <p className={`${sizes.caption} font-semibold text-balance text-mute`}>{answer.caption}</p>
    </section>
  );
}
