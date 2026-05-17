import {makeMatch, getMemberName} from './common.js';

/**
 * Detects eval() in both forms:
 *   eval('...')
 *   window.eval('...')
 *   window['eval']('...')
 *
 * @param {import('flast/src/types.js').ASTNode} n CallExpression
 */
export function matcher(n) {
  if (n.callee?.type === 'Identifier' && n.callee.name === 'eval') return makeMatch(n);

  if (
    n.callee?.type === 'MemberExpression' &&
    n.callee.object?.name === 'window' &&
    getMemberName(n.callee) === 'eval'
  ) return makeMatch(n);

  return null;
}
