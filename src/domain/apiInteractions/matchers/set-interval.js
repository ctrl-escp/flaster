import {makeMatch, slot, getMemberName, resolveNumber} from './common.js';

/**
 * Detects setInterval(callback, interval) in both forms:
 *   setInterval(fn, 500)
 *   window.setInterval(fn, 500)
 *   window['setInterval'](fn, 500)
 *
 * @param {import('flast/src/types.js').ASTNode} n CallExpression
 */
export function matcher(n) {
  const isBare = n.callee?.type === 'Identifier' && n.callee.name === 'setInterval';
  const isWindowProp =
    n.callee?.type === 'MemberExpression' &&
    n.callee.object?.name === 'window' &&
    getMemberName(n.callee) === 'setInterval';

  if (!isBare && !isWindowProp) return null;

  const intervalNode = n.arguments[1];
  const interval = resolveNumber(intervalNode);
  return makeMatch(n, {'interval-ms': slot(interval ? [interval] : [], intervalNode ? [intervalNode] : [])});
}
