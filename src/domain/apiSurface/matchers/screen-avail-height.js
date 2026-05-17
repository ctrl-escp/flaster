/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, isMemberExpression} from './common.js';

/** @param {ASTNode} n MemberExpression */
export function matcher(n) {
  if (!isMemberExpression(n, 'screen', 'availHeight')) return null;
  return makeMatch(n);
}
