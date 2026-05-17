import {makeMatch} from './common.js';

/** @param {import('flast/src/types.js').ASTNode} n NewExpression */
export function matcher(n) {
  if (n.callee?.name !== 'Function') return null;
  return makeMatch(n);
}
