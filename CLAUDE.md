# Satisfactory Logistics — CLAUDE.md

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
| `npm run lint` | ESLint on `src/` — zero warnings allowed (`--max-warnings 0`) |
| `npm run format` | Prettier auto-format (write in place) |
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

### TypeScript

- Strict mode is enabled (`tsconfig.json`).
- Path alias `@/*` maps to `src/*` — always use it for cross-directory imports.
- `@typescript-eslint/no-explicit-any` is **off** (but avoid `any` where possible).
- `@typescript-eslint/no-unused-vars` is **off** (TypeScript itself handles this).

### Formatting (Prettier)

```json
{ "singleQuote": true, "trailingComma": "all", "arrowParens": "avoid" }
```

Run `npm run format` before committing. The CI lint step rejects any warnings.

### ESLint

- `import/extensions`: file extensions must be **omitted** in imports (except `.json` which must always be included).
- `react-hooks/recommended` rules are enforced.
- `typescript-paths/recommended` enforces use of the `@/*` alias.

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

## Contributing

1. Fork the repository.
2. Create a branch: `feature/my-feature` or `fix/my-fix`.
3. Target PRs at the **`dev`** branch (not `main`).
4. Ensure `npm run lint`, `npm run check-types`, and `npm test -- --run` all pass before opening a PR.
