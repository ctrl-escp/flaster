/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, slot, getMemberName, resolveStrings} from './common.js';

/**
 * Detects fetch(url) in both forms:
 *   fetch('/api/data')
 *   window.fetch('/api/data')
 *   window['fetch']('/api/data')
 *
 * @param {ASTNode} n CallExpression
 */
export function matcher(n) {
  const isBare = n.callee?.type === 'Identifier' && n.callee.name === 'fetch';
  const isWindowProp =
    n.callee?.type === 'MemberExpression' &&
    n.callee.object?.name === 'window' &&
    getMemberName(n.callee) === 'fetch';

  if (!isBare && !isWindowProp) return null;

  const urlNode = n.arguments[0];
  return makeMatch(n, {'url': slot(resolveStrings(urlNode), urlNode ? [urlNode] : [])});
}
