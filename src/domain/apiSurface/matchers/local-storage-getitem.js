/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, slot, isMethodCall, resolveStrings} from './common.js';

/**
 * `localStorage.getItem(key)` — extracts static key strings when resolvable.
 *
 * @param {ASTNode} n CallExpression
 */
export function matcher(n) {
  if (!isMethodCall(n, 'localStorage', 'getItem')) return null;
  const keyNode = n.arguments[0];
  return makeMatch(n, {'key': slot(resolveStrings(keyNode), keyNode ? [keyNode] : [])});
}
