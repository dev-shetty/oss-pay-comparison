/** One frame for every Present slide, so titles, legends and sources share a left edge. */
export const SLIDE = {
  card: 'h-full gap-0 rounded-[20px] py-0 shadow-slide ring-1 ring-black/[0.04]',
  header: 'gap-0 px-14 pt-10 pb-5',
  content: 'px-14',
  eyebrow: 'mb-2 text-sm font-extrabold tracking-[0.14em] text-primary uppercase',
  title: 'text-[2.75rem] leading-[1.1] font-extrabold tracking-[-0.025em]',
  takeaway: 'text-[1.375rem] leading-snug font-semibold text-sub',
  watermark: 'absolute right-14 bottom-8 h-5 opacity-50',
} as const;
