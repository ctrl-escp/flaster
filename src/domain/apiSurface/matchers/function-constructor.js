/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch} from './common.js';

/** @param {ASTNode} n NewExpression */
export function matcher(n) {
  if (n.callee?.name !== 'Function') return null;
  return makeMatch(n);
}
