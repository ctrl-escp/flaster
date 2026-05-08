/**
 * Encodes a flAST node location as a stable path segment list.
 * Uses flat-AST `nodeId` when present (preferred for decode via arborist.ast).
 *
 * @param {import('flast/src/types.js').ASTNode | null | undefined} node
 * @returns {Array<string | number> | null}
 */
export function encodeNodePath(node) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (Number.isInteger(node.nodeId)) {
    return Object.freeze(['nodeId', node.nodeId]);
  }

  return null;
}

/**
 * Resolves an encoded path back to a node on the current flat AST, when possible.
 *
 * @param {import('flast/src/arborist.js').Arborist} arborist
 * @param {readonly (string | number)[] | null | undefined} nodePath
 * @returns {import('flast/src/types.js').ASTNode | null}
 */
export function decodeNodePath(arborist, nodePath) {
  if (!arborist?.ast?.length || !Array.isArray(nodePath) || nodePath.length < 2) {
    return null;
  }

  if (nodePath[0] === 'nodeId' && Number.isInteger(nodePath[1])) {
    return arborist.ast.find((n) => n.nodeId === nodePath[1]) ?? null;
  }

  return null;
}

/**
 * @param {null | undefined | readonly [number, number] | {start?: number, end?: number}} range
 * @returns {readonly [number, number] | null}
 */
export function sourceRangeToTuple(range) {
  if (!range) {
    return null;
  }

  if (Array.isArray(range) && range.length >= 2) {
    return [range[0], range[1]];
  }

  if (typeof range.start === 'number' && typeof range.end === 'number') {
    return [range.start, range.end];
  }

  return null;
}

/**
 * Whether two source intervals overlap (half-open semantics aligned with prior store logic).
 *
 * @param {null | undefined | readonly [number, number] | {start?: number, end?: number}} left
 * @param {null | undefined | readonly [number, number] | {start?: number, end?: number}} right
 */
export function sourceRangesOverlap(left, right) {
  const L = sourceRangeToTuple(left);
  const R = sourceRangeToTuple(right);

  return Boolean(L && R && L[0] < R[1] && R[0] < L[1]);
}
