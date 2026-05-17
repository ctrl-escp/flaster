/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, getMemberName, isAssignmentTarget} from './common.js';

/** @param {ASTNode} n MemberExpression */
export function matcher(n) {
  if (getMemberName(n) !== 'innerHTML') return null;
  if (!isAssignmentTarget(n)) return null;
  return makeMatch(n);
}
