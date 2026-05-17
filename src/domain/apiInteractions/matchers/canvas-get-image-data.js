/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, getMemberName} from './common.js';

/** @param {ASTNode} n CallExpression */
export function matcher(n) {
  if (n.callee?.type !== 'MemberExpression') return null;
  if (getMemberName(n.callee) !== 'getImageData') return null;
  return makeMatch(n);
}
