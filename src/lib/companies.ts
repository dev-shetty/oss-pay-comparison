import type { Company, FilterState, ToggleSlug } from './types';

export function salaries(company: Company): number {
  return company.tc?.n ?? 0;
}

export function isExcluded(company: Company, state: FilterState): boolean {
  return company.bucket === 'oss' && state.toggles[company.slug as ToggleSlug] === false;
}
