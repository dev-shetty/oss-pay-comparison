import type { OssGroup } from './types';

export const GROUP_LABELS: Record<OssGroup, string> = {
  pure: 'Pure OSS',
  'open-core': 'Open core',
  'oss-projects': 'Proprietary on OSS',
  'source-available': 'Source-available',
};

export const GROUP_NOTES: Record<OssGroup, string> = {
  pure: 'The product they sell is under an OSI license.',
  'open-core': 'OSI-licensed core, paid proprietary features.',
  'oss-projects': 'Sells a proprietary platform that runs a foundation-owned OSS project it leads.',
  'source-available': 'Code is public, but the license (BSL, SSPL) is not OSI-approved.',
};

/** Axis badges on the per-company chart, where the full label does not fit. */
export const GROUP_SHORT: Record<OssGroup, string> = {
  pure: 'Pure OSS',
  'open-core': 'Open core',
  'oss-projects': 'Prop. on OSS',
  'source-available': 'Source-avail.',
};

/** Short keys for the URL and the pool key: `oss:pu1-oc1-op1-sa1`. */
export const GROUP_PARAM: Record<OssGroup, string> = {
  pure: 'pu',
  'open-core': 'oc',
  'oss-projects': 'op',
  'source-available': 'sa',
};
