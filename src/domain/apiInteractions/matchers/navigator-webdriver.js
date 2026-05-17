/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, isMemberExpression} from './common.js';

/** @param {ASTNode} n MemberExpression */
export function matcher(n) {
  if (!isMemberExpression(n, 'navigator', 'webdriver')) return null;
  return makeMatch(n);
}
