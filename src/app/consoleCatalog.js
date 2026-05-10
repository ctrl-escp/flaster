import {
  executeKnownStructureMatcher,
  executeKnownStructureTransform,
  executeKnownStructureTransformSession,
} from '../integrations/restringer/runners.js';

/**
 * Browser-console catalog: matchers and transforms available in the current workspace
 * (built-in REstringer-backed structures plus any user-defined ones), plus the static
 * REstringer integration object for utilities and frozen registry metadata.
 *
 * @param {object} store reactive app store
 * @param {object} restringerSafe `restringerSafe` default export from the integration barrel
 */
export function createConsoleCatalog(store, restringerSafe) {
  return Object.freeze({
    get restringer() {
      return restringerSafe;
    },

    get structures() {
      return store.availableKnownStructures;
    },

    structure(structureId) {
      return store.getKnownStructureById(structureId);
    },

    get matchersById() {
      return Object.fromEntries(
        store.availableKnownStructures
          .filter((s) => s.matcherAvailable && typeof s.matcher === 'function')
          .map((s) => [s.id, s.matcher]),
      );
    },

    get transformsById() {
      return Object.fromEntries(
        store.availableKnownStructures
          .filter((s) => s.transformEnabled && typeof s.transform === 'function')
          .map((s) => [s.id, s.transform]),
      );
    },

    listBuiltInStructures(filters) {
      return restringerSafe.listKnownStructures(filters);
    },

    /**
     * @param {import('flast/src/arborist.js').Arborist} arb
     * @param {string} structureId
     * @param {{candidateFilter?: (node: import('flast/src/types.js').ASTNode) => boolean}} [options]
     */
    runMatcher(arb, structureId, options = {}) {
      const structure = store.getKnownStructureById(structureId);
      if (!structure) {
        throw new Error(`Unknown structure id: ${structureId}`);
      }

      return executeKnownStructureMatcher(structure, arb, options);
    },

    /**
     * @param {import('flast/src/arborist.js').Arborist} arb
     * @param {string} structureId
     * @param {unknown} match
     */
    runTransform(arb, structureId, match) {
      const structure = store.getKnownStructureById(structureId);
      if (!structure) {
        throw new Error(`Unknown structure id: ${structureId}`);
      }

      return executeKnownStructureTransform(structure, arb, match);
    },

    /**
     * @param {import('flast/src/arborist.js').Arborist} arb
     * @param {string} structureId
     * @param {{candidateFilter?: (node: import('flast/src/types.js').ASTNode) => boolean}} [options]
     */
    runTransformSession(arb, structureId, options = {}) {
      const structure = store.getKnownStructureById(structureId);
      if (!structure) {
        throw new Error(`Unknown structure id: ${structureId}`);
      }

      return executeKnownStructureTransformSession(structure, arb, options);
    },
  });
}
