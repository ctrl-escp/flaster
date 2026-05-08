# Cleanup log

## Phase 11 — unused code and design-smell gates (current)

`npm run check` now includes:

* `check:unused` — `knip` with Vue/Vite entries, fixture ignores, and a narrow `ignoreIssues` allowlist for the REstringer adapter barrel (`src/integrations/restringer/index.js`) so intentional dual default/named surface and adapter-only exports stay green.
* `check:todos` — `scripts/check-todos.mjs` scans `src/**/*.js` and `src/**/*.vue` for `TODO` / `FIXME` / `HACK` markers. Allowlisted paths and reasons live in that script (currently only `domain/export/exportModel.js`, which holds regex sources for generated-script placeholder checks).

### Removed (confirmed unused)

* Unused Vue panels and icons: `AdvancedWorkspace.vue`, `ContextPanel.vue`, `InvestigationPane.vue`, `IconAdvanced.vue`, `IconCheckboxActive.vue`, `IconCheckboxInactive.vue`, `IconCompose.vue`.
* Dead compatibility shims: `src/composition/scriptGenerator.js` (domain export is canonical), `src/integrations/restringer/registry.js` (nothing imported it; use `catalog.js`).
* Unused dependency: `codemirror` (app uses `@codemirror/*` only).
* `getInitialActiveStructureId` in `matchingEngine.js` (no call sites).
* `createNodeSummary` in `domain/selection/nodeInspectorModel.js` (no call sites).
* `moveStep` / `setStepEnabled` in `pipelineMutations.js` (superseded by index-based helpers; tests used the latter).

### Internalized (module-private helpers)

Several exports were only used inside their defining module; they are plain functions or `const` now so `knip` reflects real public seams (`exportModel.js`, `pipelineModel.js`, `pipelineMutations.js`, `pipelineStepRunner.js`, `structureDefinition.js`, `customStructures.js`, normalizers/runners helpers, `matchingEngine.getRunnableStructureIds`, etc.). `BROWSER_GLOBAL_MARKERS` is no longer re-exported from `domain/export/index.js`.

### Other

* `scripts/verify-restringer-safe.mjs` uses static imports for the adapter, matching engine, script generator, and store so dependency analysis and knip see real usage (replacing dynamic `import()` for those modules).
* `src/store.js` no longer re-exports `createAppStore` (tests import `src/app/createAppStore.js` directly).

## Public sample scripts

Bundled under `public/sample-scripts/` and listed in `src/sampleScripts.js` for the Load menu.

| Sample id | File | Referenced in UI | Referenced in docs | Referenced in tests |
| --------- | ---- | ---------------- | ------------------ | ------------------- |
| `array-replacements` | `array_replacements.js` | yes (`sampleScripts.js`) | no | yes (`tests/smoke/core-flows.spec.js`, structure detection) |
| `array-replacements-prototype-calls` | `array_replacements_prototype_calls.js` | yes | no | no |
| `array-function-proxies` | `array_function_replacements_local_proxies.js` | yes | no | no |
| `augmented-array-replacements` | `augmented_array_function_replacements.js` | yes | no | no |
| `augmented-proxied-array` | `augmented_proxied_array_function_replacements.js` | yes | no | no |
| `obfuscator-io-not-boolean-tilde` | `obfuscator.io-NotBooleanTilde.js` | yes | no | no |
| `obfuscator-io-set-cookie` | `obfuscator.io-setCookie.js` | yes | no | no |
| `caesar-plus` | `caesar_plus.js` | yes | no | no |
