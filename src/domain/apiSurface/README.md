# API interactions

Static analysis for browser and JavaScript runtime APIs in parsed scripts. The segment answers two questions:

1. **Detectors** — Where does this script touch a specific API surface (e.g. `localStorage.getItem`, `navigator.webdriver`)?
2. **Inferences** — Given the set of detector hits, does the script exhibit a higher-level behavioral pattern (e.g. canvas fingerprinting, DevTools probing)?

Detectors are AST matchers (one per catalog row). Inferences are pure logic over detector results; they never walk the AST themselves.

## Architecture

```
detectorRegistry.js          inferenceRegistry.js
        │                              │
        ▼                              │
matchers/<id>.js  ──►  matchingEngine   │
   (per detector)      runApiDetectors  │
        │                    │          │
        │                    ▼          ▼
        │              inferenceEngine.runInferences
        │                    │
        ▼                    ▼
asKnownStructures.js    store (apiDetectorHits, apiInferences)
        │                    │
        └────► known-structure catalog + Structure Explorer
```

| Layer | Role |
|-------|------|
| `detectorRegistry.js` | Catalog metadata: id, title, category, `apiObject` / `apiName` / `apiKind`, descriptions, extraction flags. Validated at module load. |
| `matchers/` | One `matcher(n, arb)` per detector id. Returns `DetectorMatch \| null`. |
| `matchingEngine.js` | Single-pass engine: indexes detectors by AST node type, iterates `arb.ast[0].typeMap` once per type. |
| `inferenceRegistry.js` | Behavioral patterns as `requires` clauses over detector ids. |
| `inferenceEngine.js` | Evaluates clauses (`any` / `all`, optional `minCount`) after the detector pass. |
| `asKnownStructures.js` | Adapts detectors into REstringer “known structure” descriptors for Code Structures / Explore Nodes. |
| `app/store/apiInteractionSync.js` | Merges detector hits into the shared known-structure match store (alongside REstringer results). |

## Runtime orchestration (app)

API analysis runs **after** parse and **after** REstringer known-structure matching. Entry points:

| Trigger | Location |
|---------|----------|
| User clicks **Parse** | `ParseButton.vue` → `rerunKnownStructureMatching()` then `runApiInteractionsMatcher()` |
| Script history load / restore | `scriptHistory.js` |
| DevTools `applyArboristToWorkspace` | `scriptHistory.js` |

Typical sequence inside `runApiInteractionsMatcher()` (`app/store/sections/apiInteractions.js`):

1. `runApiDetectors(arb)` → `Map<detectorId, DetectorMatch[]>`
2. `runInferences(detectorResults)` → fired inference rows
3. Flatten hits into `apiDetectorHits` (plain object for Vue reactivity)
4. `syncApiDetectorHitsToKnownStructureMatches()` — replace prior `api-interaction` category matches, normalize via REstringer helpers, refresh grouped matches and highlights

Catalog hydration (once per parse / history load):

- `buildHydratedKnownStructureCatalog(restringerStructures)` appends API detector structures so they appear in the structure picker with `categoryGroup: 'api-interaction'`.

UI:

- **API Interactions** panel (`ApiInteractionsPanel.vue`) — inferences + fired detectors with extractions.
- **Code Structures** / **Explore Nodes** — same detector ids as known structures; selecting a structure shows normalized matches from the sync step.

## Detector kinds and AST types

Each detector row declares an `apiKind`. The matching engine maps it to the AST node type matchers receive:

| `apiKind` | AST type | Example |
|-----------|----------|---------|
| `property-read` | `MemberExpression` | `window.innerWidth` |
| `property-write` | `MemberExpression` | `element.innerHTML = html` (assignment target) |
| `method-call` | `CallExpression` | `localStorage.getItem('key')` |
| `constructor` | `NewExpression` | `new Worker(url)` |

Matchers assume `n` is already the correct type; they only implement surface-specific checks.

## Matcher contract

See `matchers/common.js`.

```js
/**
 * @param {ASTNode} n   Pre-filtered node (MemberExpression, CallExpression, or NewExpression)
 * @param {Arborist} arb
 * @returns {DetectorMatch | null}
 */
export function matcher(n, arb) { ... }
```

**`DetectorMatch`**

- `node` — primary AST node (location / highlighting).
- `extractions` — map of role → `{ values: string[], nodes: ASTNode[] }`. Roles align with `extractedValueLabel` in the registry when `extractsValue` is true (e.g. `key`, `url`, `cookie-name`). Empty `{}` for structural-only detectors.

Static value resolution (`resolveStrings`, `resolveNumber`, `resolveAlgorithm`) follows one level of variable alias and assignment; heavily obfuscated scripts may not yield values.

## Inference clauses

Defined on each `ApiInferenceRow` in `inferenceRegistry.js`. All clauses in `requires` must pass.

Per clause:

- **`mode: 'all'`** — every listed detector must have fired (≥1 match).
- **`mode: 'any'`** — at least `minCount` distinct detectors from the list must have fired (`minCount` defaults to 1).

A detector has “fired” when `detectorResults.has(id)` (at least one match).

## Adding a detector

1. Add a row to `detectorRegistry.js` (unique `id`, valid `apiKind`, `extractsValue` + `extractedValueLabel` when extracting).
2. Create `matchers/<detector-id>.js` exporting `matcher`.
3. Register the import in the appropriate category file under `matchers/` (e.g. `storage.js`).
4. Add tests in `tests/domain/apiInteractions/matchers.spec.js`.

Startup checks (`matchers/index.js`, `validateApiDetectorRegistry`) enforce registry ↔ matcher parity.

## Adding an inference

1. Add a row to `inferenceRegistry.js` with `requires` clauses referencing existing detector ids.
2. Set `risk`, `riskReason`, `category`, and `inferenceKind` (`co-occurrence`, `frequency`, or `value-pattern`).
3. Extend `matchers.spec.js` with co-occurrence fixtures if the pattern is non-obvious.

`validateApiInferenceRegistry` runs at load time and rejects unknown detector ids.

## Public API

`index.js` re-exports:

- Registries: `apiDetectorRegistry`, `apiDetectorIds`, `apiInferenceRegistry`
- Builders / validation: `buildApiDetectorDefinition`, `validateApiDetectorRegistry`, `validateApiInferenceRegistry`
- Engines: `runApiDetectors`, `runInferences`
- Catalog: `buildHydratedKnownStructureCatalog`

## Tests

```bash
npm test -- tests/domain/apiInteractions/matchers.spec.js
```

Tests build an `Arborist` from script snippets, run `runApiDetectors`, assert hit counts and extraction roles, and optionally assert `runInferences` fires a given inference id.

## Design notes

- **No eval in detectors** — structures use `executionMode: 'no-eval'`; matching is AST-only.
- **Performance** — `nodeTypeIndex` is built once at module load so each script pass touches each AST bucket once, then runs only relevant matchers.
- **Separation** — atomic detectors stay precise; product-facing “behavior” lives in inferences so UI and risk copy can evolve without rewriting matchers.
- **REstringer integration** — API hits reuse the same normalization and explorer plumbing as REstringer structure matches via `syncApiDetectorHitsToKnownStructureMatches`, with `categoryGroup === 'api-interaction'` used to replace (not accumulate stale) API rows on re-run.
