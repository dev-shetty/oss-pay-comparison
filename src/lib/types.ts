export type Bucket = 'oss' | 'faang' | 'inp' | 'insvc';
export type SubBucket = 'pure' | 'open-core' | 'oss-heavy';
export type Level = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type Yoe = '0-1' | '2-4' | '5-7' | '8-11' | '12-15' | '16+';
export type Year = '2021' | '2022' | '2023' | '2024' | '2025' | '2026';
export type ToggleSlug = 'red-hat' | 'confluent' | 'databricks' | 'automattic';

export const BUCKETS: Bucket[] = ['oss', 'faang', 'inp', 'insvc'];
export const LEVELS: Level[] = ['L1', 'L2', 'L3', 'L4', 'L5'];
export const YOES: Yoe[] = ['0-1', '2-4', '5-7', '8-11', '12-15', '16+'];
export const YEARS: Year[] = ['2021', '2022', '2023', '2024', '2025', '2026'];
export const TOGGLES: ToggleSlug[] = ['red-hat', 'confluent', 'databricks', 'automattic'];

/** n = -1 means the API predicted the row; the UI never draws it. p50 can be missing on thin slices. */
export interface Pct {
  p25: number;
  p50: number | null;
  p75: number;
  n: number;
  approx?: boolean;
}

export interface EquityRow {
  base: number;
  stock: number;
  bonus: number;
  n: number;
}

export interface MetricBlock {
  all: Pct;
  byLevel: Partial<Record<Level, Pct>> | null;
  byYoe: Partial<Record<Yoe, Pct>> | null;
}

export interface OfficeLevel {
  p50: number;
  n: number;
}

/** `office*` fields come from a later pull with `remoteFilter: exclude`; older pools carry only the first three. */
export interface RemoteBlock {
  remoteRows: number;
  allRows: number;
  tcP50: number;
  officeRows?: number;
  officeP50?: number;
  officeByLevel?: Partial<Record<Level, OfficeLevel>>;
}

export interface Pool {
  n: number;
  tc: MetricBlock;
  base: MetricBlock;
  equity: { byLevel: Partial<Record<Level, EquityRow>> } | null;
  remote: RemoteBlock | null;
  rowsPerYear: Record<Year, number> | null;
}

/** `byYoe` holds only the bands the API returned (it omits n < 5). */
export interface CompanyPct extends Pct {
  byYoe?: Partial<Record<Yoe, Pct>>;
}

export interface Company {
  slug: string;
  name: string;
  bucket: Bucket;
  sub: SubBucket | null;
  tc: CompanyPct | null;
  base: Pct | null;
  remoteShare?: number;
  usP50?: number;
}

export interface External {
  company: string;
  policy: string;
  floor: string;
  url: string;
}

export interface Meta {
  pulledAt: string;
  window: string;
  jobFamily: string;
  location: string;
  inrPerUsd: number;
  toggles: ToggleSlug[];
}

export interface Snapshot {
  meta: Meta;
  companies: Company[];
  pools: Record<string, Pool | null>;
  external: External[];
}

export type Metric = 'tc' | 'base';
export type Cut = 'all' | 'level' | 'yoe';
export type Currency = 'usd' | 'inr';
export type SortMode = 'value' | 'bucket';

export interface FilterState {
  metric: Metric;
  cut: Cut;
  cur: Currency;
  buckets: Bucket[];
  toggles: Record<ToggleSlug, boolean>;
  sort: SortMode;
  present: boolean;
  card: number;
}

export interface TableData {
  columns: string[];
  rows: (string | number)[][];
}
