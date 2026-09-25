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
| `pu`, `oc`, `op`, `sa` | `0` removes an OSS group: Pure OSS, Open core, Proprietary on OSS, Source-available |
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
3. Fill the matching pool in `src/data/snapshot.json`. OSS pool keys: `oss:pu1-oc1-op1-sa1`
   (1 = group included; all 15 non-empty combinations), then `faang`, `inp`, `insvc`.
4. `pnpm check:data`, then `pnpm build`. The check fails if an OSS pool's `n` is not the sum of
   its companies' `n`.

OSS groups (rule: grouped by the license of the product sold, at least 5 India salaries in 5 years):

| Group | Companies |
|---|---|
| Pure OSS | Red Hat, Canonical, SUSE, Automattic |
| Open core | GitLab, Elastic |
| Proprietary on OSS | Confluent, Databricks, Cloudera, Acquia |
| Source-available | HashiCorp, MongoDB |

Pulled 2026-09-25: all 15 OSS group pools and the 12 OSS company rows. `faang`, `inp`, `insvc` are
from 2026-09-21. Left out for fewer than 5 India salaries: PostHog (0), Grafana Labs (2), Mozilla (0).

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
