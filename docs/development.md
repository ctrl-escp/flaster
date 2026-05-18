# Development notes

## Browser debug globals

Manual debugging (console inspection) uses properties on `window`. They are **not** set on the live store module or in production builds by default.

| Global | Owner | Consumers | Notes |
| ------ | ----- | --------- | ----- |
| `window.flast` | `src/app/debugGlobals.js` | Console / external snippets in dev | Full flAST namespace plus `version` from `flast/package.json` and async `applyArboristToUI(arborist)` (delegates to `store.applyArboristToWorkspace`). Runtime parsing uses `import { Arborist } from 'flast/src/arborist.js'` instead. |
| `window.arborist` | `src/app/debugGlobals.js` | Console in dev | Live `store.arb` (Vue `watchEffect`). |
| `window.selectedNode` | `src/app/debugGlobals.js` | Console in dev | Live `store.getSelectedNode()` (`watchEffect`). |
| `window.catalog` | `src/app/debugGlobals.js` | Console in dev | Built via `createConsoleCatalog` in `src/app/consoleCatalog.js`: workspace matchers/transforms plus `restringer` for the frozen `restringerSafe` bundle. |
| `window.store` | `src/app/debugGlobals.js` | Console in dev | The reactive app store singleton. |

### When globals are installed

`installDebugGlobals()` runs from `src/main.js` and attaches the table above only when **either**:

* `import.meta.env.DEV` is true (local `vite` dev server), or  
* `import.meta.env.VITE_DEBUG_GLOBALS` is the string `'true'` (optional; set in `.env` / `.env.production.local` if you need globals in a preview or production build).

Otherwise the function returns immediately and nothing is assigned to `window` for flASTer debug.

## Public sample scripts

Bundled samples live under `public/sample-scripts/` and are registered in `src/sampleScripts.js` as `sampleScripts` (each entry has `id`, `title`, `publicPath`, etc.). The **FileLoader** UI loads them by `publicPath`; **tests** read the same files via repo-relative paths (for example `public/sample-scripts/array_replacements.js`). Keeping new samples in that folder and adding a `sampleScripts` row keeps UI, docs, and tests aligned.

## Adding a new built-in structure

Follow this order so metadata, runners, fixtures, and CI stay aligned:

1. **Catalog row** — Add a frozen entry to `src/integrations/restringer/catalog.js` using only the keys validated by `buildStructureDefinition` / `validateKnownStructureCatalogRegistry` in `src/domain/structures/structureDefinition.js`. Do not add fixture paths, expected match counts, or other test-only fields to the catalog.
2. **REstringer safe module** — Wire the matcher/transform through `src/integrations/restringer/index.js` (`safeModules`) and `runners.js` / `normalizers.js` as needed so `knownStructures` exposes functions for the new id.
3. **Contract metadata** — Ensure `matcherName`, `moduleName`, and `transformName` match the safe module exports; set `transformEnabled` and `executionMode` / `noEval` correctly.
4. **Export** — Confirm `src/domain/export/` resolution can emit steps for this structure when `capabilities.export` should be true (`no-eval` + implementation ids).
5. **Test fixture manifest** — Add a block to `tests/fixtures/structure-fixtures.js` with repo-relative `path` entries (add matching source under `tests/fixtures/structure-sources/` if there is no suitable `public/sample-scripts/` file). If a structure truly cannot be covered yet, add `fixtureCoverageExemption: { reason: '…' }` instead of fixtures, and keep the reason in the manifest only.
6. **Tests** — `tests/domain/structureCatalog.spec.js` exercises catalog ↔ adapter ↔ fixtures; extend or add focused tests for any new normalizer or edge behavior.
7. **Verification** — Run `npm run check` (includes `check:catalog`, which loads the catalog module and validates shape and uniqueness).

`npm run check:catalog` runs `scripts/verify-structure-catalog.mjs` and fails on duplicate ids, missing labels/categories, disallowed catalog keys, or broken matcher/transform metadata contracts.

## API Surface and Capabilities

After parse, flASTer runs **API Surface** analysis: static matchers find browser/JS runtime API usage (detectors), then the capability engine derives higher-level patterns (fingerprinting, anti-debugging, tracking, etc.) from those hits.

| Concept | Where |
| ------- | ----- |
| Domain code | `src/domain/apiSurface/` — see [README](../../src/domain/apiSurface/README.md) for architecture, matcher contract, and how to add detectors/capabilities. |
| App store | `runApiSurfaceMatcher()` in `src/app/store/sections/apiSurface.js`; results in `apiDetectorHits` and `capabilities`. |
| UI | **API Surface** tab (`ApiSurfacePanel.vue`) — **Capabilities** section plus per-detector **API Surface** hits. |
| Known structures | Detectors hydrate into the structure catalog (`categoryGroup: 'api-surface'`) and sync via `src/domain/apiSurface/syncDetectorHits.js` for Code Structures / Explore Nodes. |

Tests: `tests/domain/apiSurface/matchers.spec.js`.

## CLI (`bin/flaster.js`)

The CLI entry point lives at `bin/flaster.js` and delegates to `src/domain/cli/runCli.js`. All CLI logic is under `src/domain/cli/` — no Vue/Pinia dependency.

### Module map

| File | Role |
|------|------|
| `cliOptions.js` | `parseArgs` wrapper, `expandListArgs`, `validateCliOptions`, `printCliHelp` |
| `readInput.js` | File or stdin reading |
| `createAnalysisStore.js` | Headless duck-type store for `buildReportModel` |
| `resolveStructureSelection.js` | Maps `--section` / `--structures` options to engine calls |
| `resolveReportSections.js` | Applies `--only-section` / `--exclude-section` filters |
| `runAnalysis.js` | Full analysis pipeline (parse → catalog → match → sync → model) |
| `runCli.js` | Entry flow: parse flags → validate → read input → analyse → format → write |
| `enrichReportFindings.js` | Attaches `evidence[]` locations (and `--full` fields) to findings |
| `formatReportJson.js` | JSON serializer |

### `runCli` flow

```
parseArgs + expandListArgs
  → --help / --version (exit 0)
  → validateCliOptions (exit 1 before any I/O)
  → readInput
  → runAnalysis (parse → catalog → createStore → select → match → sync → buildReportModel → resolveReportSections)
  → enrichReportFindings
  → formatReportJson | formatReportHtml
  → write stdout or file
```

### Boundaries

`runAnalysis.js` imports `detectStructures` from `integrations/restringer/matchingEngine.js` and is listed in `matchingEngineConsumerAllowlist` in `scripts/check-boundaries.mjs`. All other CLI modules import only from `src/domain/` or `src/integrations/restringer/index.js` (the public adapter).

### Evidence locations

`src/domain/report/evidenceFromNode.js` converts a flAST node's `range` (char offsets) to `{ line, column, endLine, endColumn, charStart, charEnd }` using a binary-search line index. Used by `enrichReportFindings` for both structure and capability findings.
