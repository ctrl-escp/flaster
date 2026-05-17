/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, slot, getMemberName, resolveStrings} from './common.js';

/**
 * Detects xhr.open(method, url) calls.
 * Requires at least two arguments to reduce false positives from unrelated `open` calls.
 * URL is the second argument (index 1).
 *
 * Matched forms:
 *   xhr.open('GET', '/api')
 *   xhr['open']('POST', '/api')
 *
 * @param {ASTNode} n CallExpression
 */
export function matcher(n) {
  if (n.callee?.type !== 'MemberExpression') return null;
  if (getMemberName(n.callee) !== 'open') return null;
  if (n.arguments.length < 2) return null;

  const urlNode = n.arguments[1];
  return makeMatch(n, {'url': slot(resolveStrings(urlNode), urlNode ? [urlNode] : [])});
}
