/** @import {ASTNode} from '../../flastTypes.js' */

/**
 * Checks whether a value looks like a flAST AST node with a range.
 *
 * @param {unknown} value
 * @returns {value is ASTNode}
 */
function isNodeLike(value) {
  return !!value &&
    typeof value === 'object' &&
    typeof value.type === 'string' &&
    Array.isArray(value.range);
}

/**
 * Finds the most representative AST node inside a REstringer match payload.
 *
 * @param {unknown} match
 * @param {Set<object>} [seen]
 * @returns {ASTNode|null}
 */
function findNodeInMatch(match, seen = new Set()) {
  if (!match || typeof match !== 'object' || seen.has(match)) {
    return null;
  }

  if (isNodeLike(match)) {
    return match;
  }

  seen.add(match);

  const preferredKeys = [
    'node',
    'targetNode',
    'funcNode',
    'referenceNode',
    'declarationNode',
    'candidateNode',
    'expressionNode',
    'statementNode',
    'callNode',
    'calleeNode',
    'parentNode',
  ];

  for (const key of preferredKeys) {
    const candidate = findNodeInMatch(match[key], seen);
    if (candidate) {
      return candidate;
    }
  }

  if (Array.isArray(match)) {
    for (const entry of match) {
      const candidate = findNodeInMatch(entry, seen);
      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  for (const value of Object.values(match)) {
    const candidate = findNodeInMatch(value, seen);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

/**
 * @param {unknown} match
 * @returns {{
 *   kind: string,
 *   keys: string[],
 *   sample: string,
 * }}
 */
export function describeKnownStructureMatchShape(match) {
  if (Array.isArray(match)) {
    const firstEntry = match[0];
    const entryShape = describeKnownStructureMatchShape(firstEntry);

    return Object.freeze({
      kind: 'array',
      keys: entryShape.keys,
      sample: `Array(${match.length}) ${entryShape.sample}`,
    });
  }

  if (!match || typeof match !== 'object') {
    return Object.freeze({
      kind: typeof match,
      keys: [],
      sample: String(match),
    });
  }

  const keys = Object.keys(match).sort((left, right) => left.localeCompare(right));
  const preview = keys.length
    ? `{ ${keys.slice(0, 8).join(', ')}${keys.length > 8 ? ', ...' : ''} }`
    : '{}';

  return Object.freeze({
    kind: 'object',
    keys: Object.freeze(keys),
    sample: preview,
  });
}

/**
 * @param {{title: string, id: string}} structure
 * @param {ASTNode|null} node
 * @param {number} index
 * @returns {string}
 */
function createLabel(structure, node, index) {
  if (!node) {
    return `${structure.title} match ${index + 1}`;
  }

  const summaryParts = [structure.title, node.type];
  if (node.parentNode?.type) {
    summaryParts.push(`within ${node.parentNode.type}`);
  }

  return summaryParts.join(' ');
}

/**
 * Normalized known-structure match (Phase 3 contract). All geometry and typing
 * live on `relevantNode`; runner-specific payloads sit under `metadata.runnerMatch`.
 *
 * @param {{id: string, title: string, category: string}} structure
 * @param {unknown} match
 * @param {number} [index=0]
 */
export function normalizeStructureMatch(structure, match, index = 0) {
  const relevantNode = findNodeInMatch(match);

  return Object.freeze({
    structureId: structure.id,
    matchId: `${structure.id}:${index}`,
    label: createLabel(structure, relevantNode, index),
    relevantNode,
    metadata: Object.freeze({
      category: structure.category,
      matchOrdinal: index,
      runnerMatch: match,
    }),
  });
}

/**
 * @param {ReadonlyArray<unknown>} [matches=[]]
 * @returns {ASTNode[]}
 */
export function collectKnownStructureMatchNodes(matches = []) {
  return matches
    .map((match) => {
      if (match && typeof match === 'object' && 'relevantNode' in match) {
        return match.relevantNode ?? null;
      }

      return findNodeInMatch(match);
    })
    .filter(Boolean);
}
