/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, getMemberName, isDocumentNode} from './common.js';

/** @param {ASTNode} n MemberExpression */
export function matcher(n) {
  if (!isDocumentNode(n.object)) return null;
  if (getMemberName(n) !== 'readyState') return null;
  return makeMatch(n);
}
