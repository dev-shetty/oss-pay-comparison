import { WATERMARK } from '@/lib/theme';

export function Brand() {
  return (
    <>
      <img src={WATERMARK} alt="Levels.fyi" className="h-6 w-auto" />
      <span className="h-5 w-px bg-border" aria-hidden />
      <span className="truncate text-base font-extrabold text-ink">OSS Pays</span>
    </>
  );
}
