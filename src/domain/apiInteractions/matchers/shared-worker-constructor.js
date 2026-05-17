import {makeMatch, slot, resolveStrings} from './common.js';

/** @param {import('flast/src/types.js').ASTNode} n NewExpression */
export function matcher(n) {
  if (n.callee?.name !== 'SharedWorker') return null;
  const urlNode = n.arguments[0];
  return makeMatch(n, {'script-url': slot(resolveStrings(urlNode), urlNode ? [urlNode] : [])});
}
