import poster from '@/assets/mangalorefoss-2.png';
import { TextCard, type TextCardProps } from './TextCards';

export function ClosingCard({ id, title, present }: Omit<TextCardProps, 'children'>) {
  return (
    <TextCard id={id} title={title} present={present} hideHeader>
      <div className={`mx-auto grid h-full min-h-0 w-full max-w-[1200px] items-center md:grid-cols-[1fr_auto] ${present ? 'gap-16 px-6' : 'gap-10'}`}>
        <div className="flex flex-col gap-4">
          <p className={`font-extrabold text-ink ${present ? 'text-[4.25rem] leading-[1.05] tracking-[-0.03em]' : 'text-3xl leading-tight'}`}>Thank you, IndiaFOSS!</p>
          <p className={`font-bold leading-snug text-sub ${present ? 'text-[1.75rem]' : 'text-lg'}`}>See you next at MangaloreFOSS 2.0</p>
        </div>
        <img
          src={poster}
          alt="MangaloreFOSS 2.0 poster: 16 to 17 January 2027, NITK Surathkal, Mangalore. Tickets at fossunited.org/mangalorefoss"
          className={`aspect-square rounded-xl object-contain shadow-card ${present ? 'max-h-[min(calc(100dvh-280px),600px)] w-auto' : 'w-full max-w-[360px]'}`}
        />
      </div>
    </TextCard>
  );
}
