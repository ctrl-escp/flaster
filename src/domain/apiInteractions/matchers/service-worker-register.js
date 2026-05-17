/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, slot, getMemberName, resolveStrings} from './common.js';

/**
 * Detects navigator.serviceWorker.register(scriptURL) calls.
 * Only the explicit navigator.serviceWorker chain is matched.
 *
 * Matched forms:
 *   navigator.serviceWorker.register('/sw.js')
 *   navigator['serviceWorker']['register']('/sw.js')
 *
 * @param {ASTNode} n CallExpression
 */
export function matcher(n) {
  if (n.callee?.type !== 'MemberExpression') return null;
  if (getMemberName(n.callee) !== 'register') return null;

  const obj = n.callee.object;
  if (
    obj?.type !== 'MemberExpression' ||
    obj.object?.name !== 'navigator' ||
    getMemberName(obj) !== 'serviceWorker'
  ) return null;

  const urlNode = n.arguments[0];
  return makeMatch(n, {'script-url': slot(resolveStrings(urlNode), urlNode ? [urlNode] : [])});
}
