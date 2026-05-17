/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, slot, isMethodCall, resolveStrings} from './common.js';

/** @param {ASTNode} n CallExpression */
export function matcher(n) {
  if (!isMethodCall(n, 'sessionStorage', 'removeItem')) return null;
  const keyNode = n.arguments[0];
  return makeMatch(n, {'key': slot(resolveStrings(keyNode), keyNode ? [keyNode] : [])});
}
