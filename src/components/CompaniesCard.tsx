import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { isExcluded, salaries } from '@/lib/companies';
import { formatSalaries } from '@/lib/format';
import { BUCKET_COLORS, BUCKET_LABELS, SMALL_N, lighten } from '@/lib/theme';
import { BUCKETS, type Bucket, type Company, type FilterState, type Snapshot } from '@/lib/types';
import { LIGHT_CHIP_KEY } from '@/lib/chartKey';
import { ChartKey } from './ChartKey';
import { CompanyTable } from './CompanyTable';
import { TextCard, type TextCardProps } from './TextCards';

interface CompaniesCardProps extends Omit<TextCardProps, 'children'> {
  snapshot: Snapshot;
  state: FilterState;
}

function Chip({ company, color, excluded, present }: { company: Company; color: string; excluded: boolean; present: boolean }) {
  const thin = salaries(company) < SMALL_N;
  const style = { backgroundColor: lighten(color, thin ? 0.93 : 0.82) };
  return (
    <li
      style={style}
      title={`${company.name}: ${formatSalaries(salaries(company))}${excluded ? ', removed from OSS' : ''}`}
      className={`rounded-full px-2.5 py-0.5 font-bold ${present ? 'text-lg' : 'text-xs'} ${thin ? 'text-sub' : 'text-ink'} ${excluded ? 'line-through opacity-60' : ''}`}
    >
      {company.name}
    </li>
  );
}

function BucketLine({ bucket, companies, state, present }: { bucket: Bucket; companies: Company[]; state: FilterState; present: boolean }) {
  const rows = companies.filter(c => c.bucket === bucket).sort((a, b) => salaries(b) - salaries(a));
  const total = rows.filter(c => !isExcluded(c, state)).reduce((sum, c) => sum + salaries(c), 0);
  const color = BUCKET_COLORS[bucket];
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap ${present ? 'py-6 text-xl' : 'py-4 text-sm'}`}>
      <span className={`flex shrink-0 items-center gap-2 font-extrabold text-ink ${present ? 'w-56' : 'w-32'}`}>
        <span className="inline-block size-2.5 rounded-sm" style={{ background: color }} />
        {BUCKET_LABELS[bucket]}
      </span>
      <ul className="order-last flex min-w-0 basis-full flex-wrap gap-1.5 sm:order-none sm:basis-auto sm:flex-1">
        {rows.map(c => <Chip key={c.slug} company={c} color={color} excluded={isExcluded(c, state)} present={present} />)}
      </ul>
      <span className="ml-auto shrink-0 font-bold text-ink tabular-nums">{formatSalaries(total)}</span>
    </div>
  );
}

function FullList({ snapshot, state }: { snapshot: Snapshot; state: FilterState }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setExpanded(e => !e)} aria-expanded={expanded}
        className="mt-3 flex items-center gap-1 rounded text-xs font-bold text-primary outline-none underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring/60">
        {expanded ? 'Hide the full list' : 'See all companies'}
        <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-4">
          <CompanyTable companies={snapshot.companies} state={state} present={false} />
          <p className="mt-4 text-xs text-mute">
            Salaries = India software engineer salaries, last 5 years. Enterprise OSS sells to companies (subscriptions, enterprise edition, or cloud). Pure OSS has no enterprise sales.
          </p>
        </div>
      )}
    </>
  );
}

export function CompaniesCard({ id, title, present, snapshot, state }: CompaniesCardProps) {
  return (
    <TextCard id={id} title={title} present={present}>
      <div className={present ? 'px-10' : 'px-2 sm:px-6'}>
      <div className={`flex flex-wrap items-center gap-x-3.5 font-semibold text-sub ${present ? 'text-base' : 'text-xs sm:text-[13px]'}`}>
        <ChartKey items={LIGHT_CHIP_KEY} present={present} />
      </div>
      <div className="mt-3 divide-y divide-border">
        {BUCKETS.map(b => <BucketLine key={b} bucket={b} companies={snapshot.companies} state={state} present={present} />)}
      </div>
      {!present && <FullList snapshot={snapshot} state={state} />}
      </div>
    </TextCard>
  );
}
