/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, getMemberName} from './common.js';

/**
 * Detects crypto.subtle.encrypt(algorithm, key, data) calls.
 *
 * Matched forms:
 *   crypto.subtle.encrypt(...)
 *   crypto['subtle']['encrypt'](...)
 *
 * @param {ASTNode} n CallExpression
 */
export function matcher(n) {
  if (n.callee?.type !== 'MemberExpression') return null;
  if (getMemberName(n.callee) !== 'encrypt') return null;

  const obj = n.callee.object;
  if (
    obj?.type !== 'MemberExpression' ||
    obj.object?.name !== 'crypto' ||
    getMemberName(obj) !== 'subtle'
  ) return null;

  return makeMatch(n);
}
