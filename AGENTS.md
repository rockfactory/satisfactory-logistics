# Satisfactory Logistics — AGENTS.md

## Project Overview

**Satisfactory Logistics** is a React/TypeScript single-page application (SPA) for planning factories in the game [Satisfactory](https://www.satisfactorygame.com/). Key features:

- **Logistics tracking** — define factory inputs/outputs and visualize resource flows
- **Calculator** — an LP (linear programming) solver that computes optimal production chains given constraints
- **Charts** — Sankey diagrams and node graphs for resource flow visualization
- **Savegame import** — parse `.sav` game files to seed the planner with real in-game data
- **Cloud sync** — optional Supabase-backed authentication and remote save/load

Live site: https://satisfactory-logistics.xyz

---

## Requirements

- **Node.js v22+** — use [nvm](https://nvm.sh); `nvm use` picks the version from `.nvmrc`
- **npm 10.8.3** (declared in `packageManager` field)

---

## Quick Start

```bash
npm install
npm run dev        # starts Vite dev server at http://localhost:5173
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run Vitest unit tests |
| `npm run check-types` | TypeScript type check without emitting output |
| `npm run lint` | Biome check on `src/` (linting + formatting) |
| `npm run format` | Biome auto-format `src/` (write in place) |
| `npm run parse-docs` | Parse Satisfactory game data files into JSON (see below) |
| `npm run supabase:types` | Regenerate `src/core/database.types.ts` from Supabase schema |

---

## Project Structure

```
satisfactory-logistic/
├── src/
│   ├── auth/              # Supabase auth, session manager, remote sync
│   ├── core/              # Store setup, Zustand helpers, migrations, logger, Supabase client
│   ├── factories/         # Factory domain: list, detail, inputs/outputs, charts, store slices
│   ├── games/             # Game/save management: create, import, settings, store slices
│   ├── layout/            # App-level layout: Header, Footer, sticky elements
│   ├── recipes/           # Game data: items, recipes, buildings, schematics (JSON + types)
│   ├── routes/            # React Router route definitions
│   ├── solver/            # LP solver: algorithm, graph layout, share, store slices, tests
│   ├── third-party/       # External integrations (Ko-fi, feedback)
│   ├── utils/             # Shared utilities and components
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Entry point
│   └── theme.ts           # Mantine dark theme configuration
├── data/
│   ├── docs-en.json       # Raw English Satisfactory game docs (source for parse-docs)
│   ├── docs-it.json       # Italian variant
│   └── assets/            # Exported game textures (used by parse-docs --with-images)
├── scripts/
│   └── parseDocs.ts       # parse-docs script: generates JSON data in src/recipes/
├── public/                # Static assets (favicon, logo)
└── dist/                  # Build output (git-ignored)
```

---

## Architecture

### State Management (Zustand + Immer)

State is organised into **slices** composed into a single Zustand store. The helper utilities live in [src/core/zustand-helpers/](src/core/zustand-helpers/).

```
authSlice         → Supabase session
gamesSlice        → game list, selected game, per-game factory IDs
gameSaveSlice     → local/remote persistence state
factoriesSlice    → factory definitions (inputs, outputs, progress)
factoryViewSlice  → UI state (grid / spreadsheet / kanban view mode)
solversSlice      → LP solver instances, request params, node layout
chartsSlice       → chart visualization preferences
```

- Mutations use **Immer** (mutation-style code, immutable result).
- State is persisted to **IndexedDB** via `idb-keyval`.
- Migrations exist for versions v2 → v4 in [src/core/migrations/](src/core/migrations/).
- `gameSave` slice is excluded from persistence.

### Routing

React Router v6, defined in [src/routes/FactoriesRoutes.tsx](src/routes/FactoriesRoutes.tsx):

| Path | View |
|---|---|
| `/login` | Login page |
| `/privacy-policy` | Privacy policy |
| `/factories` | Factories list (grid / spreadsheet / kanban) |
| `/factories/:id` | Factory detail + inline calculator |
| `/factories/:id/calculator` | Factory's solver view |
| `/factories/charts` | Sankey / graph charts |
| `/factories/calculator` | Standalone LP calculator |
| `/factories/calculator/shared/:sharedId` | Shared solver import |
| `/games/*` | Game management pages |
| `*` | Redirect → `/factories` |

### LP Solver (HIGHS)

The calculator uses **HIGHS** (linear programming library compiled to WebAssembly) to compute optimal production chains. Key files:

- [src/solver/algorithm/solveProduction.ts](src/solver/algorithm/solveProduction.ts) — core solve logic
- [src/solver/page/useSolverSolution.ts](src/solver/page/useSolverSolution.ts) — React hook integrating HIGHS with the store
- [src/solver/store/solverSlice.ts](src/solver/store/solverSlice.ts) — solver state

### Game Data

Static JSON data lives in [src/recipes/](src/recipes/):

- `FactoryItems.json` — all in-game items
- `FactoryRecipes.json` — production recipes
- `FactoryBuildings.json` — machines, belts, pipes
- `FactorySchematics.json` — technology tree

These files are **generated** by `npm run parse-docs` from the raw `data/docs-en.json` (exported from the game). Do not edit them manually.

Loading pattern — direct JSON import + post-processing into lookup maps:

```typescript
import RawFactoryItems from './FactoryItems.json';
export const AllFactoryItems = RawFactoryItems as FactoryItem[];
export const AllFactoryItemsMap = Object.fromEntries(AllFactoryItems.map(i => [i.id, i]));
```

### Savegame Parsing

Savegame files (`.sav`) are parsed using `@etothepii/satisfactory-file-parser` inside a **Web Worker** ([src/recipes/savegame/parseSavegameWorker.ts](src/recipes/savegame/parseSavegameWorker.ts)) to avoid blocking the main thread.

---

## Code Conventions

### Definition of Done (for agents and humans)

Before declaring any code change complete (and before reporting "done" to the user), run **both** of these on the touched files / project:

```bash
npm run lint          # Biome (formatting + linting)
npm run check-types   # tsc --noEmit
```

If either fails:

1. Fix the issues (use `npm run format` or `npx biome check --write <files>` for autofixable formatting).
2. Re-run both commands until clean.
3. Only then summarise the change to the user.

For a focused check on just the files you touched, scope biome explicitly: `npx biome check --write <paths…>`. Do **not** rely solely on a focused check — a final `npm run lint && npm run check-types` is the contract.

If tests cover the touched area, also run `npm test -- --run`.

### Writing Style

- **Do not use em dashes (`—`)** in code comments, UI copy, notification messages, commit messages, or any text that ships to users. Prefer commas, parentheses, colons, or separate sentences. Applies to both source code and generated text.

### TypeScript

- Strict mode is enabled (`tsconfig.json`).
- Path alias `@/*` maps to `src/*` — always use it for cross-directory imports.
- `noExplicitAny` is **off** in Biome (but avoid `any` where possible).
- `noUnusedVariables` is **off** in Biome (TypeScript itself handles this).

### Formatting & Linting (Biome)

Biome handles both formatting and linting via [`biome.json`](biome.json):

```json
{ "quoteStyle": "single", "trailingCommas": "all", "arrowParentheses": "asNeeded" }
```

Run `npm run format` before committing. Run `npm run lint` to check for errors.

- File extensions must be **omitted** in imports (except `.json` which must always be included).
- `useExhaustiveDependencies` is set to **warn** — use `biome-ignore lint/correctness/useExhaustiveDependencies: <reason>` to suppress when intentional.
- Import organization is handled automatically by Biome.

### Naming Conventions

| Kind | Convention | Example |
|---|---|---|
| Components | PascalCase | `FactoryPage`, `ChartsTab` |
| Store slices | camelCase | `factoriesSlice`, `solversSlice` |
| Hooks | `use` prefix | `useGameSettings`, `useSolverSolution` |
| Types / Interfaces | PascalCase | `Factory`, `FactoryInput` |
| Actions | verb-first camelCase | `createFactory`, `updateGameSettings` |

### File Organisation

- Co-locate component, styles (CSS Modules), and types in the same directory.
- Domain slices live next to their domain: `factories/store/`, `solver/store/`, etc.
- Shared utilities go in `src/core/` (store helpers, logger, i18n) or `src/utils/` (UI utilities).

---

## Testing

Framework: **Vitest**. Test files use the `*.test.ts` suffix.

Test locations:

- [src/solver/test/](src/solver/test/) — LP solver correctness (solveProduction, maximize, inputConstraints, etc.)
- [src/core/state-utils/toggleAsSet.test.ts](src/core/state-utils/toggleAsSet.test.ts) — utility unit tests

Run tests:

```bash
npm test              # watch mode
npm test -- --run     # single run (CI)
```

Tests import production code directly via `@/` alias. No mocking of Zustand stores or HIGHS; tests call the real solver.

---

## Game Data Workflows

### Updating Game Data (new Satisfactory patch)

1. Export the updated `Docs.json` from the game (via FModel or game files).
2. Copy it to `data/docs-en.json`.
3. Run `npm run parse-docs` to regenerate `src/recipes/*.json`.
4. Commit the updated JSON data files.

### Regenerating Item Icons

1. Export icons from FModel using the filter `.*(_256|_512)`.
2. Copy the `FactoryGame/` folder to `data/assets/FactoryGame/`.
3. Run `npm run parse-docs -- --with-images` to generate optimised images.

### Regenerating Supabase Types

```bash
npm run supabase:types
```

This overwrites [src/core/database.types.ts](src/core/database.types.ts). Requires Supabase CLI configured with the project ID.

---

## Tutorials

The in-app guided tour lives in [src/tutorial/](src/tutorial/) and is built on top of [`driver.js`](https://driverjs.com/). It is the first thing a new user sees (welcome modal on first mount) and stays accessible from the `?` icon in the header.

### Architecture

- **Chapters**: declarative units in [src/tutorial/chapters/](src/tutorial/chapters/). Each chapter exports a `TutorialChapter` ([types.ts](src/tutorial/chapters/types.ts)) with: `id`, `title`, `description`, optional `nextChapterId`, optional `setup()` (seeds state — e.g. demo factories), optional `outroBody` (custom recap shown in the outro modal), and one or more `segments`.
- **Segments**: bound to a `route` (string, RegExp, or function of context). With `autoNavigate: true` the runner navigates there programmatically; with `autoNavigate: false` it waits for the user to navigate. Each segment is a series of `DriveStep`s (driver.js shape).
- **Step targets** use `data-tutorial-id="…"` attributes on real DOM elements. **Never** rely on Mantine class names or React structure — those break across upgrades.
- **Step helpers** live in [chapters/stepHelpers.ts](src/tutorial/chapters/stepHelpers.ts): `clickSelector`, `ensurePresent`, `ensureAbsent`, `chainHooks`, `rehighlightWhenAvailable`, `openAndRehighlight`. Use these for preconditions (drawer must be open, action popover must be mounted, etc.) so back/forward navigation stays consistent.
- **Demo factories**: shared `ensureDemoFactory` / `ensureConsumerFactory` / `removeDemoFactories` in [chapters/demoFactories.ts](src/tutorial/chapters/demoFactories.ts). Chapters that need a populated state call them from `setup()`. The runner removes them in a `finally` when the tour ends so users do not get orphan factories.
- **Runner**: [useTutorial.ts](src/tutorial/useTutorial.ts) drives chapter execution (segments, location bus, driver lifecycle). Between chapters it pauses on `ChapterOutroModal` (Mantine) and lets the user pick continue / done — no silent auto-chain.
- **Help button blip**: [helpButtonBlip.ts](src/tutorial/helpButtonBlip.ts) pulses the `?` icon when the user opts out, so they discover where to resume.

### Authoring rules

- **Always update tutorials when changing the UI.** Adding, renaming, removing, or repositioning any UI element that the tutorial highlights (anything with `data-tutorial-id`, or anything mentioned by name in a popover description) requires a parallel update in [src/tutorial/chapters/](src/tutorial/chapters/). The tutorial is part of the product surface — treat it like tests.
- **Add a `data-tutorial-id`** on every new feature element you expect users to discover (drawer triggers, primary actions, toggles, important inputs). Pattern: `data-tutorial-id="<area>-<thing>"` (e.g. `calculator-auto-set`, `factory-input-amount`).
- **Idempotent preconditions**: every chapter step must be safe to enter via Back as well as Next. Use `ensurePresent` / `ensureAbsent` instead of `onDeselected` side effects.
- **Drop `data-tutorial-id`s with the elements they live on.** When you remove a feature, also remove the matching tutorial step (or rewrite it to point at the replacement) — orphan selectors silently break the tour.
- **Programmatic interactions** (auto-fill state, pre-open drawers, pre-select tabs) belong in `onHighlightStarted`, not in step descriptions: keep the user's job to "press Next or arrows" and the tour does the rest.
- **Position popovers to leave the highlighted element visible**. Prefer `side: 'bottom' | 'top' | 'left' | 'right'` + `align: 'start' | 'center' | 'end'` based on where the element sits on screen — never let the popover cover the element it is describing.

### Testing a tutorial change

1. `npm run dev`, clear IndexedDB → reload, run the welcome modal "Show me around" path end-to-end.
2. From the `?` menu, run any chapter standalone and verify it works without its predecessors (chapters seed their own state via `setup()`).
3. Use Back/Next on every step you touched — preconditions must keep the UI in the right state in both directions.
4. Run `npm run check-types && npm run lint && npm test -- --run`.

---

## Contributing

1. Fork the repository.
2. Create a branch: `feature/my-feature` or `fix/my-fix`.
3. Target PRs at the **`main`** branch.
4. Ensure `npm run lint`, `npm run check-types`, and `npm test -- --run` all pass before opening a PR.
5. **If your change touches the UI surface (new buttons / drawers / pages, renames, repositions)**, update the corresponding chapter in [src/tutorial/chapters/](src/tutorial/chapters/) — see the **Tutorials** section above.

---

## Releases & Deployment

Single-trunk model on `main`:

- Pushes to `main` auto-deploy to **dev.satisfactory-logistics.xyz** (preview).
- Releases are cut from the GitHub Actions UI via the [Release workflow](.github/workflows/release.yml). The workflow runs [release-it](https://github.com/release-it/release-it) with the config in [.release-it.json](.release-it.json) (pre-flight lint/types/tests, version bump, build, `CHANGELOG.md` update, commit, tag, push, GitHub Release) and POSTs to the Render deploy hook to rebuild **satisfactory-logistics.xyz** (production).

To cut a release: GitHub → **Actions** → **Release** → **Run workflow** → pick `patch` / `minor` / `major`.

The Render deploy hook URL lives in the `RENDER_PROD_DEPLOY_HOOK_URL` repo secret. The workflow uses the default `GITHUB_TOKEN` for the commit/tag/release; the deploy step is in the same workflow because `GITHUB_TOKEN` pushes do not trigger other workflows (so a tag-listening workflow would not fire).

Use [conventional commit](https://www.conventionalcommits.org/) prefixes (`feat:`, `fix:`, `perf:`, `refactor:`) so the changelog generates cleanly.
