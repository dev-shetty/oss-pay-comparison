import { SLIDE } from '@/lib/slide';
import { HERO_TITLE, WATERMARK } from '@/lib/theme';
import { Speaker } from './Speaker';
import { TextCard, type TextCardProps } from './TextCards';

interface QuestionsCardProps extends Omit<TextCardProps, 'children'> {
  questions: string[];
  /** Shared with the answer headline so the warm-up question morphs into it. */
  heroTitle?: boolean;
}

export function QuestionsCard({ id, title, present, questions, heroTitle = false }: QuestionsCardProps) {
  return (
    <TextCard id={id} title={title} present={present} hideHeader>
      <div className={`mx-auto flex h-full max-w-[1100px] flex-col items-center justify-center text-center ${present ? 'gap-8' : 'gap-10'}`}>
        {title && <p className={present ? 'rounded-full bg-primary/[0.08] px-4 py-1.5 text-base font-extrabold tracking-[0.14em] text-primary uppercase' : 'text-sm font-bold tracking-wide text-mute uppercase'}>{title}</p>}
        <ul className="flex flex-col gap-8">
          {questions.map(q => (
            <li key={q} style={heroTitle ? { viewTransitionName: HERO_TITLE } : undefined} className={`font-extrabold text-balance text-ink ${present ? 'text-[3.5rem] leading-[1.12] tracking-[-0.025em]' : 'text-2xl leading-tight'}`}>{q}</li>
          ))}
        </ul>
      </div>
      {present && heroTitle && <Speaker />}
      <img src={WATERMARK} alt="Levels.fyi" className={present ? SLIDE.watermark : 'absolute right-6 bottom-2 h-5 opacity-60'} />
    </TextCard>
  );
}
