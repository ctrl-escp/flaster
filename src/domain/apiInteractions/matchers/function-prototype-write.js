import {makeMatch, slot, getMemberName, isAssignmentTarget} from './common.js';

/**
 * Detects assignments to Function.prototype.<property>.
 * See object-prototype-write.js for the full AST shape.
 *
 * @param {import('flast/src/types.js').ASTNode} n MemberExpression
 */
export function matcher(n) {
  const protoExpr = n.object;
  if (protoExpr?.type !== 'MemberExpression') return null;
  if (protoExpr.object?.name !== 'Function' || getMemberName(protoExpr) !== 'prototype') return null;
  if (!isAssignmentTarget(n)) return null;

  const propName = getMemberName(n);
  return makeMatch(n, {
    'property-name': slot(propName ? [propName] : [], [n.property]),
  });
}
