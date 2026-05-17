/**
 * Adapts API interaction detectors into the known-structure catalog format so they
 * appear in the Code Structures explorer and support node-by-node browsing.
 *
 * Each detector becomes one structure entry. The matcher function runs only the
 * nodes of the correct AST type (MemberExpression, CallExpression, NewExpression),
 * returns DetectorMatch objects whose `node` field is picked up by the normalizer's
 * `findNodeInMatch` → `relevantNode`, driving source-location highlighting and navigation.
 *
 * Transforms are not supported for API interaction detectors.
 */

import {
  createAvailabilityNote,
  createSearchText,
} from '../../integrations/restringer/capabilities.js';
import {apiDetectorRegistry} from './detectorRegistry.js';
import {apiDetectorMatchers} from './matchers/index.js';

/** @type {Map<string, string>} apiKind → AST node type */
const API_KIND_TO_NODE_TYPE = new Map([
  ['property-read',  'MemberExpression'],
  ['property-write', 'MemberExpression'],
  ['method-call',    'CallExpression'],
  ['constructor',    'NewExpression'],
]);

/**
 * Builds one known-structure descriptor for a detector row.
 *
 * @param {import('./detectorRegistry.js').ApiDetectorRow} row
 * @returns {object}
 */
function buildStructureForDetector(row) {
  const nodeType = API_KIND_TO_NODE_TYPE.get(row.apiKind);
  const matcherFn = apiDetectorMatchers[row.id];
  const catalogEntry = {
    id: row.id,
    title: row.title,
    categoryGroup: 'api-interaction',
    category: row.category,
    description: row.description,
    executionMode: 'no-eval',
    noEval: true,
  };

  return {
    ...catalogEntry,
    codeExample: '',
    searchText: createSearchText(catalogEntry),
    executionMode: 'no-eval',
    matcherAvailable: true,
    transformAvailable: false,
    transformEnabled: false,
    support: Object.freeze({
      safeMatch: true,
      safeTransform: false,
      sandboxMatch: false,
      sandboxTransform: false,
      nodeMatch: false,
      nodeTransform: false,
      note: createAvailabilityNote(catalogEntry),
    }),

    /**
     * @param {import('flast/src/arborist.js').Arborist} arb
     * @returns {import('./detectorDefinition.js').DetectorMatch[]}
     */
    matcher(arb) {
      const typeMap = arb.ast[0]?.typeMap;
      if (!typeMap) return [];
      const nodes = typeMap[nodeType];
      const len = nodes?.length;
      if (!len) return [];

      const results = [];
      for (let i = 0; i < len; i++) {
        const match = matcherFn(nodes[i], arb);
        if (match) results.push(match);
      }
      return results;
    },
  };
}

/**
 * Returns all API interaction detectors as known-structure descriptors, ready to
 * be merged into the catalog via `hydrateKnownStructureCatalog`.
 *
 * @returns {object[]}
 */
export function buildApiDetectorStructures() {
  return apiDetectorRegistry.map(buildStructureForDetector);
}

/**
 * @param {readonly object[]} restringerStructures
 * @returns {object[]}
 */
export function buildHydratedKnownStructureCatalog(restringerStructures) {
  return [...restringerStructures, ...buildApiDetectorStructures()];
}
