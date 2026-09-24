import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WATERMARK } from '@/lib/theme';
import type { External } from '@/lib/types';
import { CardActions } from './CardActions';
import { DisclaimerList } from './DisclaimerList';

export interface TextCardProps {
  id: string;
  title: string;
  present: boolean;
  children: React.ReactNode;
}

function copyLink(id: string) {
  return navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${window.location.search}#${id}`);
}

export function TextCard({ id, title, present, children }: TextCardProps) {
  const titleClass = present ? 'text-[2.4rem] leading-tight font-extrabold' : 'text-xl leading-tight font-extrabold';
  return (
    <Card id={id} className={`scroll-mt-40 shadow-card ring-0 ${present ? 'h-full' : ''}`}>
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-start justify-between gap-4">
          <h2 className={`${titleClass} text-ink`}>{title}</h2>
          {!present && <CardActions onCopyLink={() => copyLink(id)} />}
        </div>
      </CardHeader>
      <CardContent className={`relative pt-4 pb-8 ${present ? 'flex min-h-0 flex-1 flex-col justify-center' : ''}`}>
        {children}
        <img src={WATERMARK} alt="Levels.fyi" className="absolute right-6 bottom-2 h-5 opacity-60" />
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
  const cell = present ? 'text-lg py-3' : 'text-sm';
  return (
    <TextCard id={id} title={title} present={present}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={cell}>Company</TableHead>
            <TableHead className={cell}>Public policy</TableHead>
            <TableHead className={cell}>Floor / band</TableHead>
            <TableHead className={cell}>Read more</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {external.map(row => (
            <TableRow key={row.company}>
              <TableCell className={`${cell} font-bold`}>{row.company}</TableCell>
              <TableCell className={`${cell} whitespace-normal`}>{row.policy}</TableCell>
              <TableCell className={`${cell} whitespace-normal`}>{row.floor}</TableCell>
              <TableCell className={`${cell} whitespace-normal`}>
                {row.links.map(link => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="mr-3 text-primary underline underline-offset-2">{link.label}</a>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className={`${present ? 'text-base' : 'text-xs'} text-mute mt-4`}>Context only. These come from company handbooks and job posts, not from the salary data. Companies that publish nothing beyond a careers page are left out. Pages checked September 2026; "Not found" means the page did not state it.</p>
    </TextCard>
  );
}
