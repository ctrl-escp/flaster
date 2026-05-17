import {makeMatch, slot, resolveStrings} from './common.js';

/** @param {import('flast/src/types.js').ASTNode} n NewExpression */
export function matcher(n) {
  if (n.callee?.name !== 'WebSocket') return null;
  const urlNode = n.arguments[0];
  return makeMatch(n, {'url': slot(resolveStrings(urlNode), urlNode ? [urlNode] : [])});
}
