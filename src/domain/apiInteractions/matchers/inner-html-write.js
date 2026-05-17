import {makeMatch, getMemberName, isAssignmentTarget} from './common.js';

/** @param {import('flast/src/types.js').ASTNode} n MemberExpression */
export function matcher(n) {
  if (getMemberName(n) !== 'innerHTML') return null;
  if (!isAssignmentTarget(n)) return null;
  return makeMatch(n);
}
