/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, slot, getMemberName, resolveAlgorithm} from './common.js';

/**
 * Detects crypto.subtle.digest(algorithm, data) calls.
 * Extracts the algorithm name from either a plain string ('SHA-256') or an
 * AlgorithmIdentifier object ({ name: 'SHA-256' }).
 *
 * Matched forms:
 *   crypto.subtle.digest('SHA-256', data)
 *   crypto['subtle']['digest']({ name: 'SHA-256' }, data)
 *
 * @param {ASTNode} n CallExpression
 */
export function matcher(n) {
  if (n.callee?.type !== 'MemberExpression') return null;
  if (getMemberName(n.callee) !== 'digest') return null;

  const obj = n.callee.object;
  if (
    obj?.type !== 'MemberExpression' ||
    obj.object?.name !== 'crypto' ||
    getMemberName(obj) !== 'subtle'
  ) return null;

  const algNode = n.arguments[0];
  const algorithm = resolveAlgorithm(algNode);
  return makeMatch(n, {
    'algorithm': slot(algorithm ? [algorithm] : [], algNode ? [algNode] : []),
  });
}
