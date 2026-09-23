/**
 * Validates src/data/snapshot.json against the shape in src/lib/types.ts.
 * Runs before every build (pnpm check:data). Exits 1 on the first schema error.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { BUCKETS, LEVELS, TOGGLES, YEARS, YOES, type Snapshot } from '../src/lib/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '../src/data/snapshot.json');
const errors: string[] = [];

function fail(where: string, message: string) {
  errors.push(`${where}: ${message}`);
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function checkPct(where: string, v: unknown) {
  if (typeof v !== 'object' || v === null) return fail(where, 'Pct must be an object');
  const p = v as Record<string, unknown>;
  if (!isNum(p.p25)) fail(where, 'p25 must be a number');
  if (p.p50 !== null && !isNum(p.p50)) fail(where, 'p50 must be a number or null');
  if (!isNum(p.p75)) fail(where, 'p75 must be a number');
  if (!Number.isInteger(p.n) || (p.n as number) < -1) fail(where, 'n must be an integer >= -1');
  if (p.approx !== undefined && typeof p.approx !== 'boolean') fail(where, 'approx must be boolean');
}

function checkKeyed(where: string, v: unknown, keys: readonly string[], check: (w: string, x: unknown) => void) {
  if (v === null) return;
  if (typeof v !== 'object') return fail(where, 'must be an object or null');
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (!keys.includes(k)) fail(where, `unknown key ${k}`);
    check(`${where}.${k}`, x);
  }
}

function checkMetric(where: string, v: unknown) {
  if (typeof v !== 'object' || v === null) return fail(where, 'must be an object');
  const m = v as Record<string, unknown>;
  checkPct(`${where}.all`, m.all);
  checkKeyed(`${where}.byLevel`, m.byLevel, LEVELS, checkPct);
  checkKeyed(`${where}.byYoe`, m.byYoe, YOES, checkPct);
}

function checkEquityRow(where: string, v: unknown) {
  const r = v as Record<string, unknown>;
  for (const k of ['base', 'stock', 'bonus']) if (!isNum(r[k])) fail(where, `${k} must be a number`);
  if (!Number.isInteger(r.n)) fail(where, 'n must be an integer');
}

function checkOfficeLevel(where: string, v: unknown) {
  const r = v as Record<string, unknown>;
  if (!isNum(r?.p50) || !Number.isInteger(r?.n)) fail(where, 'needs p50 and integer n');
}

function checkRemote(where: string, r: Record<string, unknown>) {
  if (!isNum(r?.remoteRows) || !isNum(r?.allRows) || !isNum(r?.tcP50)) fail(where, 'needs remoteRows, allRows, tcP50');
  if (r.officeRows !== undefined && !Number.isInteger(r.officeRows)) fail(where, 'officeRows must be an integer');
  if (r.officeP50 !== undefined && !isNum(r.officeP50)) fail(where, 'officeP50 must be a number');
  if (r.officeByLevel !== undefined) checkKeyed(`${where}.officeByLevel`, r.officeByLevel, LEVELS, checkOfficeLevel);
}

function checkPool(where: string, v: unknown) {
  if (v === null) return;
  if (typeof v !== 'object') return fail(where, 'pool must be an object or null');
  const p = v as Record<string, unknown>;
  if (!Number.isInteger(p.n)) fail(where, 'n must be an integer');
  checkMetric(`${where}.tc`, p.tc);
  checkMetric(`${where}.base`, p.base);
  if (p.equity !== null) checkKeyed(`${where}.equity.byLevel`, (p.equity as Record<string, unknown>)?.byLevel, LEVELS, checkEquityRow);
  if (p.remote !== null) checkRemote(`${where}.remote`, p.remote as Record<string, unknown>);
  if (p.rowsPerYear !== null) {
    const r = p.rowsPerYear as Record<string, unknown>;
    for (const y of YEARS) if (!Number.isInteger(r?.[y])) fail(`${where}.rowsPerYear`, `${y} must be an integer`);
  }
}

function checkSnapshot(s: Snapshot) {
  if (!s.meta || s.meta.window !== '0-60' || !isNum(s.meta.inrPerUsd)) fail('meta', 'window must be 0-60 and inrPerUsd a number');
  if (JSON.stringify(s.meta.toggles) !== JSON.stringify(TOGGLES)) fail('meta.toggles', `must equal ${TOGGLES.join(',')}`);
  if (s.companies.length !== 24) fail('companies', `expected 24, got ${s.companies.length}`);
  for (const c of s.companies) {
    if (!BUCKETS.includes(c.bucket)) fail(`companies.${c.slug}`, `bad bucket ${c.bucket}`);
    if (c.tc !== null) {
      checkPct(`companies.${c.slug}.tc`, c.tc);
      if (c.tc.byYoe !== undefined) checkKeyed(`companies.${c.slug}.tc.byYoe`, c.tc.byYoe, YOES, checkPct);
    }
    if (c.base !== null) checkPct(`companies.${c.slug}.base`, c.base);
  }
  for (let mask = 0; mask < 16; mask += 1) {
    const bit = (i: number) => ((mask >> i) & 1 ? '1' : '0');
    const key = `oss:rh${bit(3)}-cf${bit(2)}-db${bit(1)}-am${bit(0)}`;
    if (!(key in s.pools)) fail('pools', `missing key ${key}`);
  }
  for (const k of ['faang', 'inp', 'insvc']) if (!(k in s.pools)) fail('pools', `missing key ${k}`);
  if (!s.pools['oss:rh1-cf1-db1-am1']) fail('pools', 'the all-on OSS pool must not be null');
  for (const [key, pool] of Object.entries(s.pools)) checkPool(`pools.${key}`, pool);
  for (const e of s.external) {
    if (!e.company || !e.policy || !e.floor || !/^https?:\/\//.test(e.url)) fail(`external.${e.company}`, 'needs company, policy, floor, http url');
  }
}

const snapshot = JSON.parse(readFileSync(file, 'utf8')) as Snapshot;
checkSnapshot(snapshot);
if (errors.length) {
  console.error(`snapshot.json failed validation (${errors.length}):\n${errors.map(e => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
const filled = Object.values(snapshot.pools).filter(Boolean).length;
console.log(`snapshot.json ok: ${snapshot.companies.length} companies, ${filled}/${Object.keys(snapshot.pools).length} pools filled, ${snapshot.external.length} policies`);
