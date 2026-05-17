/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, slot, getMemberName, isDocumentNode, isAssignmentTarget, resolveStrings} from './common.js';

/**
 * Detects assignments to document.cookie in all access forms:
 *   document.cookie = 'session=abc; Path=/';
 *   window.document['cookie'] = cookieStr;
 *   iframeEl.contentDocument.cookie = cookieStr;
 *
 * @param {ASTNode} n MemberExpression
 */
export function matcher(n) {
  if (!isDocumentNode(n.object)) return null;
  if (getMemberName(n) !== 'cookie') return null;
  if (!isAssignmentTarget(n)) return null;

  const rightNode = n.parentNode.right;
  const cookieNames = resolveStrings(rightNode)
    .map(v => { const i = v.indexOf('='); return i > 0 ? v.slice(0, i).trim() : null; })
    .filter(Boolean);

  return makeMatch(n, {
    'cookie-name': slot(cookieNames, rightNode ? [rightNode] : []),
  });
}
