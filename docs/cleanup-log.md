# Cleanup log

Phase 0 baseline: `knip` is advisory (`npm run check:unused`) until Vue/SFC noise is fully tuned and items below are resolved or accepted. The `npm run check` script runs REstringer safety, source-boundary checks, and tests only.

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

## Knip findings (classified)

### Unused files

| Item | Classification | Notes |
| ---- | -------------- | ----- |
| `src/components/AdvancedWorkspace.vue` | investigate | Not imported by current `App.vue` / workflow; likely superseded or pending wiring. |
| `src/components/ContextPanel.vue` | investigate | Not referenced; layout may have moved to `WorkflowPanel.vue`. |
| `src/components/InvestigationPane.vue` | investigate | Same as above. |
| `src/components/icons/IconAdvanced.vue` | investigate | Only meaningful if unused panels return. |
| `src/components/icons/IconCheckboxActive.vue` | investigate | May be dead icon assets. |
| `src/components/icons/IconCheckboxInactive.vue` | investigate | May be dead icon assets. |
| `src/components/icons/IconCompose.vue` | investigate | May be dead icon assets. |

### Unused dependencies

| Item | Classification | Notes |
| ---- | -------------- | ----- |
| `codemirror` (root package) | remove or keep | Project imports `@codemirror/*` directly; the umbrella `codemirror` package appears redundant. Confirm no transitive/tooling expectation, then drop from `dependencies` if safe. |

### Unused exports

| Item | Classification | Notes |
| ---- | -------------- | ----- |
| Named exports on `src/integrations/restringer/index.js` (`safeUtils`, `knownStructuresById`, `safeMatchers`, `safeTransforms`, `normalizeStructureMatch`, runners, `restringerSafe`) | keep | Public adapter surface for tooling, future domain extraction, and tests; not all consumers exist yet. |
| `getInitialActiveStructureId`, `getRequestedStructureIds`, `getRunnableStructureIds` in `src/integrations/restringer/matchingEngine.js` | keep | Orchestration helpers; used by store/tests; `detectStructures` entry point lives here. |
| `knownStructureIds` in `registry.js` | keep | Stable id list for catalog work (later phases). |

### Duplicate exports

| Item | Classification | Notes |
| ---- | -------------- | ----- |
| `restringerSafe` and `default` from `index.js` | keep | Intentional dual entry (`main.js` default import vs named debug object). |
