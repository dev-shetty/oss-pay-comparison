/**
 * scripts/pull.ts: the only writer of src/data/snapshot.json.
 *
 * Phase 1 (now): the seed JSON was written by hand from research/05-five-year-data.md and
 * research/02-company-buckets.md. This script does not call the Levels MCP yet. Run it to
 * print the full call plan (every tool call, with exact params) and to re-validate the file.
 *
 * Phase 2: an agent with the `levels-mcp-comp-benchmark` MCP runs the plan below, pastes the
 * responses into `responses/<callId>.json`, then runs `pnpm pull` to assemble snapshot.json.
 * Until `responses/` exists this script only prints the plan.
 *
 *   npx tsx scripts/pull.ts            print the plan
 *   npx tsx scripts/pull.ts --write    assemble snapshot.json from responses/ (not implemented yet)
 *
 * Fixed filters on every data call:
 *   timeRange: "0-60", locationSlugs: ["india"], jobFamilySlug: "software-engineer"
 * Transport rule from the research notes: call `amazon` and `microsoft` alone. Batching them
 * with other FAANG slugs dropped the MCP transport twice.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ossPoolKey } from '../src/lib/pools';
import { OSS_GROUPS, type OssGroup, type Snapshot } from '../src/lib/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = path.resolve(here, '../src/data/snapshot.json');
const RESPONSES = path.resolve(here, 'responses');

const BASE = { timeRange: '0-60', locationSlugs: ['india'], jobFamilySlug: 'software-engineer' } as const;

/** Rule: grouped by the license of the product sold; at least 5 India salaries over 5 years. */
const OSS_GROUP_SLUGS: Record<OssGroup, string[]> = {
  pure: ['red-hat', 'canonical', 'suse', 'automattic'],
  'open-core': ['gitlab', 'elastic'],
  'oss-projects': ['confluent', 'databricks', 'cloudera', 'acquia'],
  'source-available': ['hashicorp', 'mongodb'],
};
const FAANG = ['google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix'];
const INP = ['flipkart', 'swiggy', 'razorpay', 'phonepe', 'zoho', 'freshworks'];
const INSVC = ['infosys', 'tata-consultancy-services'];

interface Call {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  into: string;
}

function ossSlugs(mask: number): { key: string; slugs: string[] } {
  const groups = Object.fromEntries(OSS_GROUPS.map((g, i) => [g, ((mask >> (OSS_GROUPS.length - 1 - i)) & 1) === 1])) as Record<OssGroup, boolean>;
  return { key: ossPoolKey(groups), slugs: OSS_GROUPS.filter(g => groups[g]).flatMap(g => OSS_GROUP_SLUGS[g]) };
}

/** One pool = 7 calls: this list plus get-salary-percentiles with remoteFilter "exclude" for remote.office*. */
function poolCalls(key: string, companySlugs: string[]): Call[] {
  const id = key.replace(':', '_');
  return [
    { id: `${id}__tc_pct`, tool: 'get-salary-percentiles', params: { ...BASE, companySlugs, salaryType: 'total_compensation' }, into: `${key}.tc.all + tc.byLevel (L1-L5 + "All Levels"; n = sampleSize, -1 = predicted)` },
    { id: `${id}__base_pct`, tool: 'get-salary-percentiles', params: { ...BASE, companySlugs, salaryType: 'base_salary' }, into: `${key}.base.all + base.byLevel` },
    { id: `${id}__tc_yoe`, tool: 'get-salaries-by-experience', params: { ...BASE, companySlugs, salaryType: 'total_compensation' }, into: `${key}.tc.byYoe (bands 0-1 .. 16+; bands with n<5 are omitted by the API)` },
    { id: `${id}__base_yoe`, tool: 'get-salaries-by-experience', params: { ...BASE, companySlugs, salaryType: 'base_salary' }, into: `${key}.base.byYoe` },
    { id: `${id}__remote`, tool: 'get-salary-percentiles', params: { ...BASE, companySlugs, salaryType: 'total_compensation', remoteFilter: 'only' }, into: `${key}.remote = { remoteRows: "All Levels".n, allRows: tc.all.n, tcP50: "All Levels".p50 }` },
    { id: `${id}__trends`, tool: 'get-salary-trends', params: { ...BASE, companySlugs, salaryType: 'total_compensation' }, into: `${key}.equity.byLevel from medianCompByLevel (base/stock/bonus/count); ${key}.rowsPerYear = sum of percentilesByMonth[].count per calendar year` },
  ];
}

/** get-company-comparison takes at most 7 slugs and silently drops companies with 0 rows. */
function companyCalls(): Call[] {
  const batches: [string, string[]][] = [
    ['oss_a', ['red-hat', 'canonical', 'suse', 'automattic', 'gitlab', 'elastic', 'confluent']],
    ['oss_b', ['databricks', 'cloudera', 'acquia', 'hashicorp', 'mongodb']],
    ['faang_a', ['google', 'meta', 'apple', 'netflix']],
    ['amazon', ['amazon']],
    ['microsoft', ['microsoft']],
    ['inp', INP],
    ['insvc', INSVC],
  ];
  return batches.flatMap(([name, slugs]) => (['total_compensation', 'base_salary'] as const).map(salaryType => ({
    id: `companies__${name}__${salaryType}`,
    tool: 'get-company-comparison',
    params: { ...BASE, compareToCompanies: slugs, salaryType },
    into: `companies[slug].${salaryType === 'total_compensation' ? 'tc' : 'base'} = { p25, p50, p75, n }`,
  })));
}

function usReferenceCalls(): Call[] {
  return ['google', 'amazon', 'meta', 'mongodb', 'gitlab', 'hashicorp', 'red-hat'].map(slug => ({
    id: `us__${slug}`,
    tool: 'get-salary-percentiles',
    params: { timeRange: '0-60', locationSlugs: ['united-states'], jobFamilySlug: 'software-engineer', companySlugs: [slug], salaryType: 'total_compensation' },
    into: `companies[${slug}].usP50 = "All Levels".p50`,
  }));
}

function plan(): Call[] {
  const calls: Call[] = [];
  for (let mask = 1; mask < 1 << OSS_GROUPS.length; mask += 1) {
    const { key, slugs } = ossSlugs(mask);
    calls.push(...poolCalls(key, slugs));
  }
  calls.push(...poolCalls('faang', FAANG));
  calls.push(...poolCalls('inp', INP));
  calls.push(...poolCalls('insvc', INSVC));
  calls.push(...companyCalls());
  calls.push(...usReferenceCalls());
  return calls;
}

function printPlan(calls: Call[], snapshot: Snapshot) {
  const done = new Set(Object.entries(snapshot.pools).filter(([, p]) => p).map(([k]) => k));
  console.log(`# Levels MCP call plan: ${calls.length} calls. ${done.size} pools already filled in snapshot.json.\n`);
  for (const call of calls) {
    const poolKey = call.id.split('__')[0].replace('oss_', 'oss:');
    const seeded = done.has(poolKey) || poolKey === 'companies' || poolKey === 'us';
    const status = seeded ? 'filled' : 'todo';
    console.log(`[${status}] ${call.id}\n  ${call.tool} ${JSON.stringify(call.params)}\n  -> ${call.into}`);
  }
  console.log('\nNotes: run amazon and microsoft alone. insvc byLevel comes from the base/tc percentile calls;');
  console.log('the seed marks insvc.tc.all approx:true because it is the median of the two company medians.');
}

const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as Snapshot;
const calls = plan();
if (process.argv.includes('--write')) {
  if (!existsSync(RESPONSES)) {
    console.error(`No ${RESPONSES} directory. Save each MCP response as responses/<callId>.json first.`);
    process.exit(1);
  }
  console.error('Assembling snapshot.json from responses/ is not implemented yet. Fill it by hand from the responses.');
  process.exit(1);
}
printPlan(calls, snapshot);
