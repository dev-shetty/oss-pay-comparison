# OSS Pay Explorer

Interactive page for the IndiaFOSS 2026 BoF "Do Open Source Companies Pay Competitively?".
It shows Levels.fyi pay data for OSS companies vs FAANG+ vs Indian product vs Indian services
(Software Engineer, India, last 5 years). Spec: `docs/spec.md`.

The page never computes a median. It selects pre-computed pools from `src/data/snapshot.json`.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

## Check and build

```bash
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm check:data   # validates src/data/snapshot.json against src/lib/types.ts
pnpm build        # runs check:data, then tsc + vite build into dist/
```

## Open offline

`pnpm build` writes one self-contained file: `dist/index.html`. Fonts, the logo, the data and
all scripts are inlined. Double-click it, or run `open dist/index.html`. No server and no
network are needed.

Filter state lives in the URL query string. Example:
`dist/index.html?metric=base&cut=level&cur=inr&rh=0`

| Param | Values |
|---|---|
| `metric` | `tc` (default), `base` |
| `cut` | `all` (default), `level`, `yoe` |
| `cur` | `usd` (default), `inr` |
| `b` | visible buckets, comma list of `oss,faang,inp,insvc` |
| `rh`, `cf`, `db`, `am` | `0` removes Red Hat, Confluent, Databricks, Automattic from the OSS pool |
| `sort` | `value` (default), `bucket` |
| `present`, `card` | `present=1` opens Present mode at card index `card` |

Present mode: `←` `→` step cards, `Esc` exits. The disclaimer card is always first.

## Refresh the data

`scripts/pull.ts` is the only writer of `src/data/snapshot.json`.

1. Print the Levels MCP call plan (tool name + exact params for every pool, company batch
   and US reference):

   ```bash
   pnpm pull
   ```

2. Run the calls with the `levels-mcp-comp-benchmark` MCP. Call `amazon` and `microsoft`
   alone; batching them drops the transport.
3. Fill the matching pool in `src/data/snapshot.json`. Pool keys: `oss:rh1-cf1-db1-am1`
   (1 = company included), `faang`, `inp`, `insvc`. A pool that is not pulled yet stays
   `null` and the UI shows "Not pulled yet".
4. `pnpm check:data`, then `pnpm build`.

Seed status (2026-09-20): `oss:rh1-cf1-db1-am1`, `oss:rh0-cf1-db1-am1`, `faang`, `inp` and
`insvc` are filled from `research/05-five-year-data.md`. The other 14 OSS toggle pools are
`null`. `base.byYoe` is `null` for every bucket. `insvc` has only `tc.all` (approx, median
of the TCS and Infosys medians), `base.all` (same method) and `tc.byYoe`.

## Deploy

The build is static. Any static host works.

**Vercel**

```bash
vercel --prod
```

Use framework preset "Vite", build command `pnpm build`, output directory `dist`.

**GitHub Pages**

`vite.config.ts` sets `base: './'`, so the build works from any sub-path.

```bash
pnpm build
git subtree push --prefix explorer/dist origin gh-pages
```

Or copy `dist/index.html` into the Pages branch by hand; it is the whole site.

## Layout

```
docs/spec.md                 design spec
docs/screens/                screenshots from the acceptance run
scripts/pull.ts              MCP call plan; future writer of snapshot.json
scripts/check-snapshot.ts    schema check, runs before every build
src/data/snapshot.json       the data
src/lib/types.ts             JSON schema and filter state types
src/lib/pools.ts             selectPool(): the only mapping from filters to numbers
src/lib/format.ts            USD / INR (lakh, crore) formatting
src/lib/urlState.ts          URL <-> filter state
src/lib/cards.ts             card registry: takeaway titles, poll questions, chart builders
src/components/charts/       one pure builder per chart, returns an ECharts option + table
src/components/              FilterBar, ChartCard, PresentMode, TextCards
```
