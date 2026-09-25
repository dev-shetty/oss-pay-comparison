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
      <div className="mx-auto flex h-full max-w-[1000px] flex-col items-center justify-center gap-10 text-center">
        {title && <p className={`font-bold tracking-wide text-mute uppercase ${present ? 'text-xl' : 'text-sm'}`}>{title}</p>}
        <ul className="flex flex-col gap-8">
          {questions.map(q => (
            <li key={q} style={heroTitle ? { viewTransitionName: HERO_TITLE } : undefined} className={`font-extrabold leading-tight text-balance text-ink ${present ? 'text-5xl' : 'text-2xl'}`}>{q}</li>
          ))}
        </ul>
      </div>
      {present && heroTitle && <Speaker />}
      <img src={WATERMARK} alt="Levels.fyi" className="absolute right-6 bottom-2 h-5 opacity-60" />
    </TextCard>
  );
}
