import {makeMatch, slot, isMethodCall, resolveStrings} from './common.js';

/** @param {import('flast/src/types.js').ASTNode} n CallExpression */
export function matcher(n) {
  if (!isMethodCall(n, 'localStorage', 'getItem')) return null;
  const keyNode = n.arguments[0];
  return makeMatch(n, {'key': slot(resolveStrings(keyNode), keyNode ? [keyNode] : [])});
}
