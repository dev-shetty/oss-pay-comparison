# OSS Pay Explorer: design spec

Date: 2026-09-20. Owner: Deveesh Shetty. For the IndiaFOSS 2026 BoF "Do Open Source Companies Pay Competitively?" (26–27 Sep 2026, Bengaluru).

## Goal

An interactive, offline-capable web page that shows Levels.fyi pay data for open source companies vs FAANG+ vs Indian product vs Indian services, Software Engineer, India, last 5 years. It runs on a projector during a 60-minute discussion and is hosted publicly later. The UX model is https://artificialanalysis.ai/#intelligence: a filter row, then chart cards that re-animate when a filter changes.

## Non-goals

- No live API calls. No server. No auth.
- No per-data-point outlier removal. Only company toggles.
- No slide deck. This replaces it.

## Stack

- Vite + React 18 + TypeScript. Static build. Must open from `dist/index.html` with no internet.
- Tailwind + shadcn/ui for controls, cards, tabs, tooltips, toggles.
- ECharts (`echarts` + `echarts-for-react`) for every chart. Use animated transitions on data change.
- No Next.js. No backend.
- Theme: match the Levels.fyi site. Read tokens from `/Users/levels/Work/levelsfyi-mono/apps/frontend/community/src` (font family, primary colors, radii, card shadows). Fallback tokens from the Levels charts skill: cream `#F4F3EC`, ink `#1A1712`, sub `#5B6268`, mute `#A39C90`, blue `#0060B9`, navy `#00407B`, sky `#4F9BDC`, green `#1E9E6A`, amber `#E08A1E`, red `#D1495B`, slate `#808C93`, gray bar `#CBC5B6`. Font: Nunito (copy TTFs from `/Users/levels/OSS/indiafoss-bof/research/html/assets/`). Levels watermark: `levels_logo_grey.png` from the same folder, bottom-right of every card.
- Bucket colors are fixed and never change with filters: OSS blue, FAANG+ amber, Indian product green, Indian services slate.

## Data

One file: `src/data/snapshot.json`. The UI never computes a median. It only selects pre-computed pools.

```
meta: { pulledAt, window: "0-60", jobFamily: "software-engineer", location: "india", inrPerUsd: 95, toggles: ["red-hat","confluent","databricks","automattic"] }
companies[]: { slug, name, bucket: "oss"|"faang"|"inp"|"insvc", sub: "pure"|"open-core"|"oss-heavy"|null, tc: {p25,p50,p75,n, byYoe?: {"0-1".."16+": Pct}}, base: {p25,p50,p75,n}, remoteShare?, usP50? }
pools: { [key]: Pool }   // key = "oss:rh1-cf1-db1-am1" (1 = included), "faang", "inp", "insvc"
Pool: {
  n, tc: { all: Pct, byLevel: {L1..L5: Pct}, byYoe: {"0-1".."16+": Pct} },
  base: { all: Pct, byLevel, byYoe },
  equity: { byLevel: { L1..L5: {base, stock, bonus, n} } },
  remote: { remoteRows, allRows, tcP50, officeRows?, officeP50?, officeByLevel?: {L1..L5: {p50, n}} },
  rowsPerYear: { "2021":..,"2026":.. }
}
Pct: { p25, p50, p75, n }   // n = -1 means predicted, not measured; UI greys it
external[]: { company, policy, floor, url }
```

Bucket membership:

- OSS (10): gitlab hashicorp elastic mongodb confluent red-hat automattic posthog grafana databricks. Toggleable: red-hat, confluent, databricks, automattic → 16 pools. The other 6 are always in.
- FAANG+ (6): google microsoft amazon meta apple netflix.
- Indian product (6): flipkart swiggy razorpay phonepe zoho freshworks.
- Indian services (2): infosys tata-consultancy-services.

### Pull script

`scripts/pull.ts` (run with `npx tsx`). It is the only thing that writes `snapshot.json`. Phase 1 for the first build: seed the JSON by hand from `/Users/levels/OSS/indiafoss-bof/research/05-five-year-data.md` and `02-company-buckets.md` for the all-on pool and per-company rows, and mark the 15 other toggle pools as `null`. Phase 2: an agent with the Levels MCP fills every pool using the recipes in `05-five-year-data.md` section 1 (`get-salary-percentiles`, `get-salaries-by-experience`, `get-salary-trends`, `get-company-comparison`, all with `timeRange: "0-60"`, `locationSlugs: ["india"]`, `jobFamilySlug: "software-engineer"`). Call `amazon` and `microsoft` alone. The UI must handle a `null` pool: show the card greyed with "not pulled yet".

## Controls (global filter row, sticky under the header)

- Metric: Total comp | Base.
- Cut: All levels | By level | By experience.
- Currency: USD | INR. INR = USD × 95, shown as ₹ lakhs (`₹53.9L`) and crores above 1 Cr.
- Buckets: chips for OSS, FAANG+, Indian product, Indian services. Toggle visibility.
- Companies: chips for Red Hat, Confluent, Databricks, Automattic. Toggle in/out of the OSS pool. Show "OSS (n)" with the live n.
- Sort: By value | By bucket (per-company card only).
- Present mode switch: hides the filter row, enlarges type ~1.4x, shows the poll question as each card's title, adds keyboard ←/→ to step cards full-screen.
- Filter state lives in the URL query string. Reload or share reproduces the view.

## Cards (in order)

Each card: takeaway title (Explore) or poll question (Present), one-line subtitle with the encoding, the chart, a source line with n, the watermark, and three icon buttons: copy link, save PNG (ECharts `getDataURL`), show table (a shadcn table of the same numbers).

1. Headline. Dumbbell per bucket: p25–p75 box, median tick, label `p25 · p50 · p75 (n=…)`. Respects Metric and Currency. By level / By experience: one row per band, buckets stacked inside as thin p25–p75 sub-rows with a median dot and a value-only label (n in the tooltip); height grows ~90px per band.
2. By level. Grouped bars L1–L3 (L4+ only if n ≥ 10). Ratio callouts OSS/FAANG and OSS/Indian product above each group.
3. By experience. Lines, one per bucket, direct end labels, small dots where n < 20. Respects Metric.
4. Equity split. 100% stacked base/stock/bonus by level per bucket. Not affected by Metric.
5. Remote share. Bars, label `45% (116 of 259 rows)`. The hollow dot is the office / hybrid median (`remote.officeP50`, from `remoteFilter: exclude`); pools without it fall back to the all-rows median.
6. India vs US. Bars, per company, share of US p50.
7. Per company. Dumbbells, one row per company, colored by bucket, greyed when n < 20. Sort control applies. Clicking a toggle company row toggles it. Cut = By experience swaps to one sparkline row per company (median dots across YoE bands on one shared scale, from `companies[].tc.byYoe`); companies with fewer than 2 bands sink to the bottom as "not enough rows by experience".
8. Rows per year. Bars per bucket, share of 5-year total.
9. Disclaimer (text card, always first in Present mode): the six-sentence stage disclaimer from `research/04-bias-and-references.md`.
10. Public pay policies (text card): table of company, policy, floor, link from `external[]`.

Poll questions for Present mode, in order 1–8:

1. "OSS pays less than Flipkart, Swiggy, Razorpay. Agree?"
2. "Google India fresher vs GitLab India fresher. Who pays more?"
3. "Does the OSS lead survive at 10 years of experience?"
4. "What share of a Google India L2 package is stock? Guess."
5. "How many of you work fully remote today?"
6. "If GitLab pays $234K in the US, what does it pay in India?"
7. "Red Hat vs Confluent, India. Same ballpark?"
8. "Five years of data. How much of it is from the last 18 months?"

## Behaviour rules

- A pool with `n < 10` for a bar renders the bar at 35% opacity with a "story, not a statistic" tooltip.
- Predicted values (`n = -1`) are never drawn.
- Changing any filter animates every card (ECharts `animationDurationUpdate: 600`).
- All charts have a hover tooltip with value, p25–p75 where present, and n.
- Nothing scrolls horizontally. Cards stack in one column, max width 1100px.
- Present mode text passes a 4-metre read test: chart labels ≥ 18px, titles ≥ 32px.

## Project layout

```
explorer/
  docs/spec.md
  scripts/pull.ts
  src/
    data/snapshot.json
    lib/{format.ts, pools.ts, urlState.ts, theme.ts}
    components/{FilterBar, ChartCard, charts/*, PresentMode}
    App.tsx, main.tsx
  index.html, vite.config.ts, tailwind.config.ts, package.json
```

`pools.ts` exposes `selectPool(state) → Pool` and nothing else computes numbers.

## Acceptance

- `pnpm build` then open `dist/index.html` from the file system with WiFi off: all 10 cards render, toggles work.
- Toggling Red Hat off changes card 1 OSS median from $74.7K to $87.0K.
- URL `?metric=base&cut=level&cur=inr&rh=0` reproduces that view on reload.
- Present mode: ←/→ steps cards, Esc exits.
- `pnpm typecheck` and `pnpm lint` pass.
