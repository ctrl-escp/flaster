import {makeMatch, getMemberName} from './common.js';

/** @param {import('flast/src/types.js').ASTNode} n CallExpression */
export function matcher(n) {
  if (n.callee?.type !== 'MemberExpression') return null;
  if (getMemberName(n.callee) !== 'toDataURL') return null;
  return makeMatch(n);
}
