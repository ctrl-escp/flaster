import {makeMatch, getMemberName, isDocumentNode, isAssignmentTarget} from './common.js';

/**
 * Detects reads of document.cookie in all access forms:
 *   document.cookie
 *   window.document.cookie
 *   iframeEl.contentDocument.cookie
 *   iframeEl.contentWindow.document.cookie
 *
 * @param {import('flast/src/types.js').ASTNode} n MemberExpression
 */
export function matcher(n) {
  if (!isDocumentNode(n.object)) return null;
  if (getMemberName(n) !== 'cookie') return null;
  if (isAssignmentTarget(n)) return null;
  return makeMatch(n);
}
