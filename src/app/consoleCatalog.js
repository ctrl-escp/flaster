/** @import {ASTNode, Arborist} from '../flastTypes.js' */
import {loadRestringerIntegration} from '../integrations/restringer/integrationLoader.js';

/**
 * Browser-console catalog: matchers and transforms available in the current workspace
 * (built-in REstringer-backed structures plus any user-defined ones), plus the static
 * REstringer integration object for utilities and frozen registry metadata.
 *
 * @param {object} store reactive app store
 */
export async function createConsoleCatalog(store) {
  const integration = await loadRestringerIntegration();
  const restringerSafe = integration.default;

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
     * @param {Arborist} arb
     * @param {string} structureId
     * @param {{candidateFilter?: (node: ASTNode) => boolean}} [options]
     */
    runMatcher(arb, structureId, options = {}) {
      const structure = store.getKnownStructureById(structureId);
      if (!structure) {
        throw new Error(`Unknown structure id: ${structureId}`);
      }

      return restringerSafe.runKnownStructureMatcher(arb, structure, options);
    },

    /**
     * @param {Arborist} arb
     * @param {string} structureId
     * @param {unknown} match
     */
    runTransform(arb, structureId, match) {
      const structure = store.getKnownStructureById(structureId);
      if (!structure) {
        throw new Error(`Unknown structure id: ${structureId}`);
      }

      return restringerSafe.runKnownStructureTransform(arb, structure, match);
    },

    /**
     * @param {Arborist} arb
     * @param {string} structureId
     * @param {{candidateFilter?: (node: ASTNode) => boolean}} [options]
     */
    runTransformSession(arb, structureId, options = {}) {
      const structure = store.getKnownStructureById(structureId);
      if (!structure) {
        throw new Error(`Unknown structure id: ${structureId}`);
      }

      return restringerSafe.runKnownStructureTransformSession(arb, structure, options);
    },
  });
}
