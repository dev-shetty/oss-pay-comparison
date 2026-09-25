import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { copyCardLink } from '@/lib/cardLink';
import { SLIDE } from '@/lib/slide';
import { WATERMARK } from '@/lib/theme';
import type { External } from '@/lib/types';
import { CardActions } from './CardActions';
import { DisclaimerList } from './DisclaimerList';

export interface TextCardProps {
  id: string;
  title: string;
  present: boolean;
  children: React.ReactNode;
  /** Full-bleed slides (the closing poster) carry their own heading and branding. */
  hideHeader?: boolean;
}

export function TextCard({ id, title, present, children, hideHeader = false }: TextCardProps) {
  return (
    <Card id={id} className={`scroll-mt-40 shadow-card ring-0 ${present ? SLIDE.card : ''}`}>
      {!hideHeader && <CardHeader className={present ? SLIDE.header : 'border-b border-border pb-3'}>
        <div className="flex items-start justify-between gap-4">
          <h2 className={`${present ? SLIDE.title : 'text-xl leading-tight font-extrabold'} text-ink`}>{title}</h2>
          {!present && <CardActions onCopyLink={() => copyCardLink(id)} />}
        </div>
      </CardHeader>}
      <CardContent className={`relative ${present ? `flex min-h-0 flex-1 flex-col justify-center pt-4 pb-16 ${SLIDE.content}` : 'pt-4 pb-8'}`}>
        {children}
        {!hideHeader && <img src={WATERMARK} alt="Levels.fyi" className={present ? SLIDE.watermark : 'absolute right-6 bottom-2 h-5 opacity-60'} />}
      </CardContent>
    </Card>
  );
}

export function DisclaimerCard({ id, title, present }: Omit<TextCardProps, 'children'>) {
  return (
    <TextCard id={id} title={title} present={present}>
      <div className={present ? 'mx-auto' : ''}>
        <DisclaimerList present={present} />
      </div>
    </TextCard>
  );
}

export function PoliciesCard({ id, title, present, external }: Omit<TextCardProps, 'children'> & { external: External[] }) {
  const cell = present ? 'text-xl py-5 align-top' : 'text-sm';
  const head = present ? 'h-auto pb-4 text-sm font-extrabold tracking-[0.12em] text-mute uppercase' : 'text-sm';
  return (
    <TextCard id={id} title={title} present={present}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={head}>Company</TableHead>
            <TableHead className={head}>Public policy</TableHead>
            <TableHead className={head}>Floor / band</TableHead>
            <TableHead className={head}>Read more</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {external.map(row => (
            <TableRow key={row.company}>
              <TableCell className={`${cell} font-extrabold text-ink`}>{row.company}</TableCell>
              <TableCell className={`${cell} whitespace-normal ${present ? 'pr-10 text-sub' : ''}`}>{row.policy}</TableCell>
              <TableCell className={`${cell} whitespace-normal ${present ? 'pr-10 font-semibold text-ink' : ''}`}>{row.floor}</TableCell>
              <TableCell className={`${cell} whitespace-normal`}>
                {row.links.map(link => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="mr-3 font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{link.label}</a>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TextCard>
  );
}
