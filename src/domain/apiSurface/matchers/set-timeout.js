/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, slot, getMemberName, resolveNumber} from './common.js';

/**
 * Detects setTimeout(callback, delay) in both forms:
 *   setTimeout(fn, 100)
 *   window.setTimeout(fn, 100)
 *   window['setTimeout'](fn, 100)
 *
 * @param {ASTNode} n CallExpression
 */
export function matcher(n) {
  const isBare = n.callee?.type === 'Identifier' && n.callee.name === 'setTimeout';
  const isWindowProp =
    n.callee?.type === 'MemberExpression' &&
    n.callee.object?.name === 'window' &&
    getMemberName(n.callee) === 'setTimeout';

  if (!isBare && !isWindowProp) return null;

  const delayNode = n.arguments[1];
  const delay = resolveNumber(delayNode);
  return makeMatch(n, {'delay-ms': slot(delay ? [delay] : [], delayNode ? [delayNode] : [])});
}
