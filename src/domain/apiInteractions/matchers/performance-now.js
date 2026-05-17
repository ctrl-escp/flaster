import {makeMatch, isMethodCall} from './common.js';

/** @param {import('flast/src/types.js').ASTNode} n CallExpression */
export function matcher(n) {
  if (!isMethodCall(n, 'performance', 'now')) return null;
  return makeMatch(n);
}
