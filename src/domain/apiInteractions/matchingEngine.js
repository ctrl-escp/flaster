/** @import {Arborist} from '../../flastTypes.js' */
/**
 * Single-pass API detector engine.
 *
 * Builds a node-type → detector-id index at startup, then for any given script
 * iterates each relevant node type exactly once and fans out to all matchers
 * registered for that type.
 *
 * @typedef {import('./detectorDefinition.js').DetectorMatch} DetectorMatch
 * @typedef {Map<string, DetectorMatch[]>} DetectorResults  keyed by detector id
 */

import {apiDetectorRegistry} from './detectorRegistry.js';
import {apiDetectorMatchers} from './matchers/index.js';

/** @type {Map<string, string>} detector id → AST node type */
const API_KIND_TO_NODE_TYPE = new Map([
  ['property-read',  'MemberExpression'],
  ['property-write', 'MemberExpression'],
  ['method-call',    'CallExpression'],
  ['constructor',    'NewExpression'],
]);

/**
 * Groups detector IDs by the AST node type their matcher expects.
 * Built once at module load.
 *
 * @type {Map<string, string[]>}  node type → detector ids
 */
const nodeTypeIndex = (() => {
  /** @type {Map<string, string[]>} */
  const index = new Map();
  for (const row of apiDetectorRegistry) {
    const nodeType = API_KIND_TO_NODE_TYPE.get(row.apiKind);
    if (!nodeType) {
      throw new Error(`Unknown apiKind "${row.apiKind}" on detector "${row.id}"`);
    }
    if (!index.has(nodeType)) index.set(nodeType, []);
    index.get(nodeType).push(row.id);
  }
  return index;
})();

/**
 * Runs all API detectors against a parsed script.
 *
 * @param {Arborist} arb
 * @returns {DetectorResults}
 */
export function runApiDetectors(arb) {
  /** @type {DetectorResults} */
  const results = new Map();

  const typeMap = arb.ast[0]?.typeMap;
  if (!typeMap) return results;

  // Outer loop: each AST bucket once. Inner loops: every node × every detector for that bucket.
  // Matchers are cheap predicates; indexing by node type avoids scanning CallExpressions for window.innerWidth, etc.
  for (const [nodeType, detectorIds] of nodeTypeIndex) {
    const nodes = typeMap[nodeType];
    const nodeLen = nodes?.length;
    if (!nodeLen) continue;
    const detLen = detectorIds.length;

    for (let i = 0; i < nodeLen; i++) {
      const n = nodes[i];
      for (let j = 0; j < detLen; j++) {
        const id = detectorIds[j];
        const match = apiDetectorMatchers[id](n, arb);
        if (!match) continue;
        if (!results.has(id)) results.set(id, []);
        results.get(id).push(match);
      }
    }
  }

  return results;
}
