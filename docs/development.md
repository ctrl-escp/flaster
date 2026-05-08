# Development notes

## Browser debug globals

Manual debugging (console inspection) uses properties on `window`. They are **not** set on the live store module or in production builds by default.

| Global | Owner | Consumers | Notes |
| ------ | ----- | --------- | ----- |
| `window.flast` | `src/app/debugGlobals.js` | Console / external snippets in dev | Full flAST namespace plus `version` from `flast/package.json`. Runtime parsing uses `import { Arborist } from 'flast/src/arborist.js'` instead. |
| `window.restringer` | `src/app/debugGlobals.js` | Console in dev | The safe integration object (`restringerSafe`). The header shows REstringer’s version via the same adapter import (`restringerSafe.version`), not this global. |
| `window.selectedNode` | `src/app/debugGlobals.js` | Console in dev | Initialized to `null`; assign in the console when useful. |
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
