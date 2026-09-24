import { BUCKET_COLORS, BUCKET_LABELS, SMALL_N } from '@/lib/theme';
import { isExcluded, salaries } from '@/lib/companies';
import { formatSalaries } from '@/lib/format';
import { BUCKETS, type Bucket, type Company, type FilterState, type SubBucket } from '@/lib/types';

const SUB_LABELS: Record<SubBucket, string> = {
  eoss: 'Enterprise OSS',
  pure: 'Pure OSS',
  'oss-heavy': 'OSS-heavy',
};

const BUCKET_NOTES: Record<Bucket, string> = {
  oss: 'Sells or builds on an open source product.',
  faang: 'Big Tech with India engineering offices.',
  inp: 'Indian-headquartered product companies.',
  insvc: 'Indian IT services companies.',
};

function CompanyRow({ company, excluded, present }: { company: Company; excluded: boolean; present: boolean }) {
  const n = salaries(company);
  return (
    <li className={`flex items-baseline justify-between gap-3 ${present ? 'text-xl py-1' : 'text-sm py-0.5'} ${excluded ? 'line-through opacity-50' : ''}`}>
      <span className="font-bold text-ink">
        {company.name}
        {company.sub && <span className="ml-2 text-xs font-semibold text-mute">{SUB_LABELS[company.sub]}</span>}
      </span>
      <span className={`tabular-nums ${n < SMALL_N ? 'text-mute' : 'font-bold text-ink'}`}>{n === 0 ? 'no salaries' : formatSalaries(n)}</span>
    </li>
  );
}

function BucketColumn({ bucket, companies, state, present }: { bucket: Bucket; companies: Company[]; state: FilterState; present: boolean }) {
  const rows = companies.filter(c => c.bucket === bucket).sort((a, b) => salaries(b) - salaries(a));
  const total = rows.reduce((sum, c) => sum + salaries(c), 0);
  return (
    <section className="min-w-0">
      <h3 className={`flex items-center gap-2 font-extrabold text-ink ${present ? 'text-2xl' : 'text-base'}`}>
        <span className="inline-block size-2.5 rounded-sm" style={{ background: BUCKET_COLORS[bucket] }} />
        {BUCKET_LABELS[bucket]}
      </h3>
      <p className={`mt-1 mb-2 text-sub ${present ? 'text-base' : 'text-xs'}`}>
        {BUCKET_NOTES[bucket]} <span className="font-semibold text-mute tabular-nums">{rows.length} companies, {formatSalaries(total)}.</span>
      </p>
      <ul className="divide-y divide-border">
        {rows.map(c => <CompanyRow key={c.slug} company={c} excluded={isExcluded(c, state)} present={present} />)}
      </ul>
    </section>
  );
}

export function CompanyTable({ companies, state, present }: { companies: Company[]; state: FilterState; present: boolean }) {
  return (
    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
      {BUCKETS.map(b => <BucketColumn key={b} bucket={b} companies={companies} state={state} present={present} />)}
    </div>
  );
}
