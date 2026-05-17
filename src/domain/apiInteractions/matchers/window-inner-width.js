import {makeMatch, isMemberExpression} from './common.js';

/** @param {import('flast/src/types.js').ASTNode} n MemberExpression */
export function matcher(n) {
  if (!isMemberExpression(n, 'window', 'innerWidth')) return null;
  return makeMatch(n);
}
