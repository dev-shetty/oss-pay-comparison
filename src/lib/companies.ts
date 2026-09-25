import type { Company, FilterState } from './types';

export function salaries(company: Company): number {
  return company.tc?.n ?? 0;
}

export function isExcluded(company: Company, state: FilterState): boolean {
  return company.bucket === 'oss' && company.group !== null && !state.groups[company.group];
}
