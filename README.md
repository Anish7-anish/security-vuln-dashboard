# Security Vulnerability Dashboard

React + Vite dashboard for exploring a very large vulnerability dataset. We fetch a JSON snapshot, stream it through a web worker into IndexedDB, and drive the UI from Redux so filters stay in sync across screens.

---

**Quick start**
```bash
git clone https://github.com/anish/security-vuln-dashboard.git
cd security-vuln-dashboard
npm install
npm run dev
```


## Getting Started

### Prerequisites
- Node.js 18+
- npm (bundled with Node). 

### Install
```bash
npm install
```

### Run locally
```bash
npm run dev
```
Two notes when you run it the first time:
1. The backend-free build pulls the public data straight from GitHub’s LFS mirror. If you want to point at your own copy, set `VITE_DATA_URL` before you start Vite. Dropping the file in `public/ui_demo.json` still works; just point `VITE_DATA_URL` back to `/ui_demo.json`.
2. The worker streams the whole 389 MB JSON into IndexedDB. The banner spinner will show how many rows have landed; once it hits ~236k you’re cached and reloads are instant.
3. Because of that streaming, expect the dev server to sit on a loading spinner for a bit on first boot—same story as production.

Example with a custom URL:
```bash
VITE_DATA_URL=https://example.com/ui_demo.json npm run dev
```

### Build for production
```bash
npm run build
```
Artifacts land in `dist/`.

### Resetting the local dataset
We persist the full JSON into IndexedDB. To force a fresh import:
1. Open DevTools → **Application** → **IndexedDB**.
2. Right-click `vuln-db` → **Delete database**.
3. Reload the app; the worker will stream `public/ui_demo.json` again.

---

## Architecture Overview

```
public/ui_demo.json  →  jsonStreamer.worker.ts  →  IndexedDB (vuln-db)
                                         ↓
                              src/data/loader.ts
                                         ↓
                         Redux store (features/vulns)
                                         ↓
                   Components & pages render via selectors
```

- **Entry point**: `src/main.tsx` wraps `App` with the Redux provider.
- **Routing**: `App.tsx` uses React Router (`/` dashboard, `/search`, `/vuln/:id`) and Ant Design’s layout.
- **State**: `src/features/vulns/slice.ts` stores the raw dataset plus derived filter state (query text, kai filters, severity set, date/CVSS ranges, etc.). `enableMapSet()` lets Immer handle our `Set` fields.
- **Selectors & metrics**: `src/features/vulns/selectors.ts` and `src/utils/vulnMetrics.ts` compute KPIs, chart data, and table slices on demand.
- **Data ingestion**:
  - `jsonStreamer.worker.ts` streams the JSON so the main thread never freezes. We chunk 20 000 records at a time and enrich each vuln with `groupName`, `repoName`, `imageName`.
  - Each record gets a **composite ID**: `group|repo|image|sourceId|ordinal`. That preserves CVEs that appear in multiple repos instead of overwriting them.
  - `src/data/loader.ts` manages IndexedDB (`idb` wrapper). `streamIntoDB` launches the worker, `getAllVulnerabilities` reads everything back.
- **UI**:
  - `Dashboard.tsx` bootstraps the data (stream if DB empty, otherwise hydrate). It also persists “show/hide” preferences in `localStorage`.
  - Reusable components live under `src/components/` (filters, charts, KPIs, tables, comparisons).
  - `SearchPage` reuses the filter + table stack on a white canvas for focused querying.
  - `VulnDetail` shows an individual record, falling back to IndexedDB if the Redux cache hasn’t loaded yet.

---

## Component Architecture & Data Flow

### FilterBar
- Central control surface: search, kai status toggles, multi-select filters, date range, CVSS slider, sort controls.
- Dispatches Redux actions on every change (`setQuery`, `toggleKaiFilter`, `setKaiStatuses`, `setRiskFactors`, etc.). The slice recomputes `filtered` immediately.
- Renders “active filter” chips; closing a chip dispatches the inverse action.
- Why dual kai controls? We keep the legacy “Analysis / AI Analysis” buttons as **exclusions**, and added the multi-select for “only show these kai statuses”. Both feed through the same slice so interactions stay predictable.

### KPIs & Progress
- `KPIs.tsx` pulls aggregate counts via `selectKPI`. The short progress bar gives quick “filters removed X%” feedback.

### Charts
- `Charts.tsx` exports the visualisations:
  - `SeverityChart` donut
  - `RiskFactorChart`
  - `TrendChart`
  - `AiManualChart`
  - `CriticalHighlights`
- All charts rely on selectors → metrics utilities, so they update whenever `filtered` changes. Layout uses Ant Design cards to keep consistent sizing.

### RepoBar & Comparison
- `RepoBar.tsx` aggregates vulns per repo, sliced to the top 15, and colours bars green to align with our palette.
- `VulnComparison.tsx` lets you pick up to three rows and inspect severity, CVSS, and risk factors side-by-side.

### Tables & Detail View
- `VulnTable.tsx` renders the filtered list with pagination and severity colouring. Clicking a row links to `/vuln/:id`.
- `VulnDetail.tsx` loads the record from Redux or IndexedDB, shows badges, risk factors, and links out to NVD when we have a CVE.

### Preference Toggles
- Stored under `svd-dashboard-preferences` in `localStorage`, so the dashboard remembers which tiles you’ve hidden. Each toggle simply flips a boolean in local component state; the state persists on layout changes.

---

## Decisions & Trade-offs

- **Stream + cache the dataset**: The JSON dump is huge, so we offload parsing to a web worker and keep the result in IndexedDB. This avoids blowing up memory on reload and keeps the UI responsive. Trade-off: initial load still takes time, but it’s a one-off hit.
- **Composite vulnerability IDs**: The source reuses IDs per CVE. We generate `group|repo|image|sourceId|ordinal` before storing so a CVE appearing in 20 repos yields 20 rows. This fixed the “stuck at 140k” total and preserved per-repo metrics.
- **Redux Toolkit for shared state**: Filters and totals need to stay in sync across Dashboard, Search, and the detail view, so a global store felt simplest. Immer’s `enableMapSet()` lets us rely on native `Set`s for filters (clean ergonomics) without rolling our own serializer.
- **Ant Design + Recharts**: Chosen for velocity. AntD provides polished cards/tables while Recharts handles most chart types with minimal ceremony. The cost is bundle size, but Vite’s dev experience stays snappy.
- **Kai status UX**: We kept the original “Analysis” exclude buttons for muscle memory, but added an inclusive multi-select so analysts can focus on specific statuses. Both interact nicely because the slice differentiates between `kaiExclude` and `kaiStatuses`.
- **Local preference persistence**: Rather than a backend profile, we stash layout toggles in `localStorage`. Easy to implement, and users tend to run this locally, so syncing isn’t critical.
- **Header restyle**: Dark blue background made the default header disappear. We switched to a gradient + subtle shadow so navigation stays readable against the deep dashboard canvas.
- **Virtual scroll > always-on pagination**: Paging through hundreds of CVEs was painful, so big result sets stay in a single, virtualized scroll while smaller ones keep the familiar paginated view. Feels more fluid and the DOM stays lean.
- **Lazy chunks for charts/routes**: Pulled the chart bundle, repo comparison, and secondary pages behind `React.lazy` so the dashboard boots faster and streams in the heavy stuff only when we actually visit it, with Suspense spinners covering the gap.

---

## Development Notes

- Dataset lives in `public/ui_demo.json`. Refresh the browser database whenever you change it.
- Workers are cached by the browser. If you touch `jsonStreamer.worker.ts`, clear IndexedDB or hard-reload (`Cmd+Shift+R`) so the new code runs.
- Tests aren’t wired yet. When we stabilise the dataset, we can add store-level tests to verify filtering math.

Happy dashboarding!
### Deployment
- Vercel: https://security-vuln-dashboard.vercel.app (first visit may take ~30s while the JSON streams into IndexedDB)
