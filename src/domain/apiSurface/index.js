/**
 * API Surface domain — static detection of browser/JS API usage and capabilities.
 *
 * Typical usage:
 *   1. `buildHydratedKnownStructureCatalog(restringerStructures)` when hydrating the structure catalog.
 *   2. After parse, `runApiDetectors(arb)` then `runInferences(detectorResults)`.
 *   3. `syncDetectorHits(store)` merges hits into the known-structure match store.
 */

export {apiDetectorRegistry, apiDetectorIds} from './detectorRegistry.js';
export {apiInferenceRegistry} from './inferenceRegistry.js';
export {buildApiDetectorDefinition, validateApiDetectorRegistry} from './detectorDefinition.js';
export {validateApiInferenceRegistry} from './inferenceDefinition.js';
export {runApiDetectors} from './matchingEngine.js';
export {runInferences} from './inferenceEngine.js';
export {buildHydratedKnownStructureCatalog} from './asKnownStructures.js';
export {syncDetectorHits} from './syncDetectorHits.js';
