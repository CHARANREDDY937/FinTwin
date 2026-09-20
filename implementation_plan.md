# Implementation Plan

## Overview

Make the **`frontend/` Vite + React app** production-ready by adding tooling (ESLint, Prettier, Vitest), eliminating dead code and duplicated utilities, replacing the monolithic prop-drilled `App.jsx` state hub with a Context provider and route-level code splitting, hardening the API layer and error handling, adding meta/SEO and accessibility fundamentals, and **removing the unused `dashboard/` Next.js scaffold** from the repository. The goal is a clean, maintainable, linted, and test-covered single frontend that builds deterministically, while preserving the existing visual design and the local/resilient twin simulation behavior that already powers the app without a live backend.

Scope: `frontend/` (the real app) and repo hygiene around `dashboard/` removal. The **backend, agents, and ML pipeline are out of scope** and must be treated as a frozen external dependency (the Vite app currently `fetch`es `http://localhost:8000`).

Context: The app already works â€” it renders 7 routes, persists `user`/`months`/`chat`/`theme` to localStorage, polls `/health`, and falls back to local "simulation engines" when the backend is offline. The priority is *hardening*, not feature work or redesign. Avoid large CSS rewrites (3608-line `styles.css` + 1070-line `LandingPage.css` carry the visual design); consolidate only where it fixes the runtime-injected Navbar styles.

---

## Types

The project is plain JavaScript (JSX). There is no TypeScript; converting to TS is explicitly out-of-scope for this pass. Below are the canonical data shapes the frontend already relies on, plus the PropTypes contracts that should be added to enforce them at the component boundaries.

### `FinancialMonth` (camelCase, frontend value object)
```js
{
  id: string,            // e.g. "2024-01-0.4821" (client-generated)
  month: string,         // "YYYY-MM"
  activeIncome: number,
  passiveIncome: number,
  creditScore: number,   // 0..900
  loansOutstanding: number,
  emiMonthly: number,
  miscellaneousCharges: number,
  moneySpent: number,
}
```
Serialized via `toBackendMonth()` in `api.js` to the snake_case backend `FinancialMonth` (see `backend/schemas.py` â€” mirror of those fields).

### `TwinProfile` (computed, in-memory)
```js
{
  monthsTracked: number,
  income: number,        // activeIncome+passiveIncome of latest month
  outflow: number,       // moneySpent+emiMonthly+miscellaneousCharges
  savings: number,       // income - outflow
  creditScore: number,
  loanBalance: number,
  emi: number,
  avgIncome: number, avgOutflow: number, avgSpent: number,
  avgMisc: number, avgEmi: number,
  spendingTrend: number, // latest vs previous month delta ratio
}
```

### `ForecastPoint`
```js
{ month: string, income: number, expense: number, savings: number, netWorth: number }
```
`simulateLocalScenario()` adds `index: number` and `debtDrag: number` per point.

### `AgentVerdict`
```js
{
  id: 'spending'|'investment'|'risk'|'goal',
  name: string, icon: string, color: string,
  score: number,         // 0..100
  status: string, headline: string,
  analysis: string, recommendation: string,
}
```

### `ScenarioPreset` and `ModelOption`
Stable-shaped config objects already exported from `api.js` as `SCENARIO_PRESETS` and `MODEL_OPTIONS` (fields `id/name/badge/icon/color/description/incomeShock/expenseShock/debtShock` and `id/name/tag/speed` respectively). These moves verbatim into `lib/twinEngine.js`.

### PropTypes contracts (new)
Add `prop-types` and declare `PropTypes.shape({...})` on the pages/components that currently accept the broad `commonProps` bag, documenting which props each page actually consumes (e.g. `RecordsPage` needs only `months`, `setMonths`, `demoMonths`). Pages that spread `{...commonProps}` should be changed to list explicit props (already done in `DashboardPage`, `AgentsPage`, `ScenariosPage`, `RecordsPage`, `AuthPage`; `ChatPage`/`LandingPage` keep a curated explicit list).

---

## Files

### New files

| Path | Purpose |
|------|---------|
| `frontend/eslint.config.js` | ESLint flat config (Vite React: `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `eslint-plugin-jsx-a11y`). Lints `src/**`. |
| `frontend/.prettierrc.json` | Prettier config (single quote, semi, trailing comma, printWidth 120 to match existing style). |
| `frontend/.prettierignore` | Ignore `node_modules`, `dist`, `package-lock.json`. |
| `frontend/vitest.setup.js` | Imports `@testing-library/jest-dom`. |
| `frontend/src/lib/format.js` | Canonical pure formatting helpers (`currency`, `toNumber`, `ensureRupees`, `formatMonthLabel`, `average`, `latestByMonth`, `sortByMonthAsc`). Single source of truth; deletes ~7 duplicate definitions. |
| `frontend/src/lib/twinEngine.js` | The **local twin simulation engine** â€” moves `buildProfile`, `buildForecast`, `buildInsight`, `simulateLocalScenario`, `evaluateLocalAgents`, `SCENARIO_PRESETS`, `MODEL_OPTIONS`, and `demoMonths` out of `App.jsx` and `api.js`. Pure functions â†’ unit-testable. |
| `frontend/src/lib/hooks.js` | `usePageTitle(title)` (sets `document.title`) and `useLocalStorage(key, initial)` (state synced to localStorage). |
| `frontend/src/store/FinTwinContext.jsx` | `FinTwinProvider` + `useFinTwin()` hook. Owns all app state & actions currently in `App.jsx` (user/months/chat/theme/backendOnline/graph/question/modelAnswer + persistence + heartbeat + quick demo + question send). |
| `frontend/src/components/ErrorBoundary.jsx` | Class component with `componentDidCatch`; friendly fallback with "Reload" button + error detail. |
| `frontend/src/components/PageFallback.jsx` | `<Suspense>` fallback (branded skeleton). |
| `frontend/public/favicon.svg` | App favicon (twin/gem mark, lavender palette). Creates missing `public/` dir. |
| `frontend/src/__tests__/*.test.js(x)` | New test files (see Testing section). |

### Modified files

| Path | Change |
|------|--------|
| `frontend/src/App.jsx` | Slash the monolith: consume `useFinTwin()`, drop local `buildProfile/buildForecast/buildInsight/demoMonths` and the localStorage `useEffect`s, import engine pieces from `lib/twinEngine.js`, make `handleQuestionSend`/`handleQuickDemo` thin consumers of the context. Add `React.lazy` per page, wrap routes in `<ErrorBoundary>` + `<Suspense fallback={<PageFallback/>}>`. |
| `frontend/src/api.js` | Strip simulation engines/constants into `lib/twinEngine.js`. Keep only network fns (`askChat`, `healthCheck`, `loginUser`, `registerUser`, `fetchTwinProfile`, `simulateScenarioAPI`, `fetchDatasetsSummary`). Add shared `request(path, opts)` helper (AbortController timeout, JSON guard, error normalization, optional `Authorization` from `localStorage['fintwinai:token']`). Wire or remove `fetchTwinProfile`. |
| `frontend/src/main.jsx` | Wrap `<App/>` in `<FinTwinProvider>` (inside `BrowserRouter`). |
| `frontend/src/ChatPage.jsx` | Use `lib/format.js` for `ensureRupees`/`currency`; consume context or explicit props; add `aria-live="polite"` on answer, semantic/`aria-pressed` graph toggle buttons. |
| `frontend/src/DashboardPage.jsx` | Use `lib/format.js` for `currency`/`formatMonthLabel`; add `usePageTitle('Dashboard')`. |
| `frontend/src/pages/RecordsPage.jsx` | Use `lib/format.js`; move inline table-action `style` objects into `styles.css` classes; add `usePageTitle('Records')`. |
| `frontend/src/pages/ScenariosPage.jsx` | Use `lib/format.js`; drop unused `simulateScenarioAPI` import; add `usePageTitle('Scenarios')`. |
| `frontend/src/pages/AgentsPage.jsx` | Use `lib/format.js`; add `usePageTitle('Agents')`. |
| `frontend/src/pages/AuthPage.jsx` | Centralize token write via shared helper; add `usePageTitle('Sign In')`; add `autoComplete` attrs. |
| `frontend/src/pages/LandingPage.jsx` | Use `lib/format.js` for `currency`; add `usePageTitle('FinTwinAI')`. |
| `frontend/src/components/Navbar.jsx` | Remove runtime `STYLE_ID`/`FTNAV_CSS` `<style>` injection; move `ftnav-*` CSS into `styles.css`. Behavior unchanged. |
| `frontend/src/components/FinancialHealthGauge.jsx` | Add `role="img"` + `aria-label` (score) on gauge container. No visual change. |
| `frontend/src/styles.css` | Append `ftnav-*` block; add global `:focus-visible` outline + `.sr-only` utility. Do NOT refactor the 3608-line body. |
| `frontend/index.html` | Add `lang="en"`, meta description, `theme-color`, Open Graph/Twitter, canonical, font `preconnect`/`dns-prefetch`, `<link rel="icon" href="/favicon.svg">`, no-JS fallback. |
| `frontend/vite.config.js` | Add `test` block (Vitest: `environment:'jsdom'`, `setupFiles:'./vitest.setup.js'`, `globals:true`, `css:false`). Keep alias/server. |
| `frontend/package.json` | Scripts `lint`, `lint:fix`, `format`, `format:check`, `test`, `test:watch`. Remove `@react-spring/web`. Add `prop-types` + devDeps. |
| `.gitignore` | Add `dashboard/`, `coverage/`, `frontend/coverage/`. |
| `README.md` | Single-frontend architecture, new lint/test commands, note `dashboard/` removed. |
| `package.json` (root) | Runner scripts (`dev:frontend`, `build:frontend`, `lint:frontend`, `test:frontend`); clear description. |

### Deleted files

| Path | Reason |
|------|--------|
| `dashboard/**` (whole dir incl. `app/`, `public/`, configs, `.next`, `node_modules`, lockfiles, `AGENTS.md`, `CLAUDE.md`, `README.md`) | Unused `create-next-app` scaffold; duplicates `frontend/`. `git rm -r dashboard` + remove untracked build dirs. No source references it. |
| `frontend/src/pages/LandingPage.css` | **Stretch/optional:** merge safely into `styles.css` only after visual diff; otherwise keep. |

### Repo hygiene (git-level)

| Path | Reason |
|------|--------|
| 40+ deleted root `*.png` screenshots | Working tree already has them deleted; commit the removal to stop repo bloat (or move to `docs/screenshots`). Final decision in Implementation Order step 1. |
---

## Functions

### New (in `frontend/src/lib/format.js`)
Pure, exported, unit-tested (moved from App.jsx and page files to remove ~7 duplicates):
- `currency(value)` — INR formatter.
- `toNumber(value)` — finite number or 0.
- `ensureRupees(text)` — replaces $/USD with INR.
- `formatMonthLabel(month)` — "Jan 2024".
- `average(values)`, `latestByMonth(months)`, `sortByMonthAsc(months)`.

### New (in `frontend/src/lib/twinEngine.js`)
Moved verbatim (were `App.jsx:81/126/151/26` and `api.js:209/244`):
- `buildProfile(months)`, `buildForecast(profile, months, span)`, `buildInsight(question, profile, forecast)`.
- `simulateLocalScenario(profile, months, scenarioKey, modelKey, horizon)`, `evaluateLocalAgents(profile, months)`.
- Constants `scenarioPresets` (was `SCENARIO_PRESETS`), `modelOptions` (was `MODEL_OPTIONS`), `demoMonths`.

### New (in `frontend/src/lib/hooks.js`)
- `usePageTitle(title)` — sets `document.title`.
- `useLocalStorage(key, initial)` — localStorage-backed state (replaces `readJson`/`writeJson`).

### New (in `frontend/src/api.js`)
- `request(path, { method='GET', body, timeout=8000, auth=true })` — AbortController timeout, JSON guard, error normalization, optional Authorization header. Backs all API fns.

### Modified
- `App.jsx` `handleQuestionSend`/`handleQuickDemo` → thin wrappers delegating to context; keep the local-fallback-first behavior for offline demos.
- `api.js` `askChat/healthCheck/registerUser/loginUser/fetchTwinProfile/simulateScenarioAPI/fetchDatasetsSummary` → reimplement over `request()`; keep `toBackendMonth`.
- `Navbar.jsx` → drop the runtime style-tag injection effect; keep `isRouteActive`/`go`/theme/logout, now reading from context.
- `FinTwinContext.jsx` → owns/defines `toggleTheme`, `handleQuickDemo`, `handleQuestionSend`, `handleLogout`.

### Removed
- Duplicate `currency`/`toNumber`/`formatMonthLabel`/`ensureRupees` across `App.jsx`, `ChatPage.jsx`, `DashboardPage.jsx`, `RecordsPage.jsx`, `ScenariosPage.jsx`, `AgentsPage.jsx`, `LandingPage.jsx` → migrated to `lib/format.js`.
- Dead `fetchTwinProfile` / `fetchDatasetsSummary` (no caller) → delete `fetchDatasetsSummary`; wire-or-delete `fetchTwinProfile`.
- Unused `simulateScenarioAPI` import in `ScenariosPage.jsx`.

---

## Classes (Components)

### New
- `ErrorBoundary.jsx` (class comp) — `getDerivedStateFromError`/`componentDidCatch`; fallback UI with Reload button. Wraps `<Routes>`.
- `FinTwinProvider` + `useFinTwin()` hook in `FinTwinContext.jsx` (provided in `main.jsx`; throws if used outside).

### Modified
- `App.jsx` — thin router shell (context + lazy pages + Suspense + ErrorBoundary).
- `Navbar.jsx` — context-driven, no runtime `<style>` injection.

### Removed
- `dashboard/app/page.tsx`, `dashboard/app/layout.tsx`, `dashboard/app/globals.css` — deleted with scaffold; no replacement.

---

## Dependencies

Scope: `frontend/` only.

- **Remove:** `@react-spring/web` (never imported; verified).
- **Add (runtime):** `prop-types`.
- **Add (dev):** `eslint`, `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y`, `prettier`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
- **Keep (used):** `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `tailwindcss`, `react`, `react-dom`, `react-router-dom`, `recharts`, `lucide-react`, `framer-motion`, `clsx`, `tailwind-merge`.
- Config files to add: `frontend/eslint.config.js`, `frontend/.prettierrc.json`, `frontend/.prettierignore`, `frontend/vitest.setup.js`. Add a Vitest `test` block to `vite.config.js` (`jsdom`, `setupFiles`, `globals`, `css:false`).

---

## Testing

- Pure logic (format + twin engine) via Vitest; components via React Testing Library + `MemoryRouter`; mocked `fetch` keeps tests hermetic (no backend).
- Test files: `format.test.js`, `twinEngine.test.js`, `FinTwinContext.test.jsx`, `AuthPage.test.jsx`, `Navbar.test.jsx`, `App.test.jsx` (under `frontend/src/__tests__/`).
- Cover: INR formatting/ensureRupees; profile+forecast+scenario+agents math; theme/demo persistence; login/register + error banner; navbar active/toggle/logout; app route smoke + 404 redirect.
- Scripts in `frontend/package.json`: `lint`, `lint:fix`, `format`, `format:check`, `test` (vitest run), `test:watch`.
- Validation gates: `lint` 0 errors, `test` green, `build` success, `preview` smoke-test of every route + offline chat fallback.

---

## Implementation Order

1. Repo hygiene baseline: commit/move the deleted screenshot PNGs; update root `package.json` scripts/description; update `.gitignore`.
2. Remove `dashboard/` (`git rm -r dashboard`, drop untracked `.next`/`node_modules`); confirm no references; update `README.md`.
3. Add tooling (ESLint/Prettier/Vitest configs + deps + scripts); baseline-fix real lint errors; commit.
4. Extract `lib/format.js`; swap all duplicate imports; delete local copies; commit.
5. Extract `lib/twinEngine.js`; move engine/constants from `App.jsx`/`api.js`; remove `@react-spring/web`; commit.
6. Harden `api.js` (`request()` helper; remove dead fns/imports; keep `toBackendMonth`); commit.
7. Refactor state into `FinTwinContext`; provide in `main.jsx`; thin `App.jsx` with lazy routes + Suspense + ErrorBoundary; update `Navbar`; manual smoke test; commit.
8. Meta/SEO/a11y: `index.html`, `public/favicon.svg`, `usePageTitle` on pages, move Navbar CSS out of runtime injection, `:focus-visible`/`.sr-only`, gauge/chat/records a11y; commit.
9. Add tests (Vitest config + setup + scripts, `prop-types`, 6 test files); run green; commit.
10. Final validation & docs: `lint`, `test`, `build`, `preview`; update `README.md`; final commit; re-run searches to confirm no dashboard refs, no @react-spring, no dead imports.

> Risks/guard-rails: (1) Do NOT refactor the CSS bodies of `styles.css`/`LandingPage.css` (preserve visual design; move Navbar block verbatim). (2) Keep local-first fallback so the app works offline during demos. (3) `LandingPage.css` deletion is optional and gated behind a visual diff. (4) Keep lint rules permissive (hooks/jsx-a11y/refresh) — no stylistic max-lines that could block existing clean code.
