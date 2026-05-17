import {makeMatch, getMemberName, isDocumentNode} from './common.js';

/** @param {import('flast/src/types.js').ASTNode} n MemberExpression */
export function matcher(n) {
  if (!isDocumentNode(n.object)) return null;
  if (getMemberName(n) !== 'readyState') return null;
  return makeMatch(n);
}
