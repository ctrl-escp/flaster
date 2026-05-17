/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, slot, getMemberName, resolveStrings} from './common.js';

/**
 * Detects canvas.getContext(contextType, contextAttributes) calls.
 *
 * Returns two extraction slots:
 *   'context-type'  — the requested rendering context ('2d', 'webgl', 'webgl2', 'bitmaprenderer').
 *   'attributes'    — the optional ContextAttributes object (second argument).
 *                     Values are empty (the object is not serialised), but the node is
 *                     recorded so the UI can highlight its source location.
 *
 * Matched forms:
 *   canvas.getContext('2d')
 *   canvas['getContext']('2d')
 *
 * @param {ASTNode} n CallExpression
 */
export function matcher(n) {
  if (n.callee?.type !== 'MemberExpression') return null;
  if (getMemberName(n.callee) !== 'getContext') return null;

  const typeNode = n.arguments[0];
  const attrsNode = n.arguments[1];

  return makeMatch(n, {
    'context-type': slot(resolveStrings(typeNode), typeNode ? [typeNode] : []),
    'attributes':   slot([], attrsNode ? [attrsNode] : []),
  });
}
