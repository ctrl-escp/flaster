/** @import {ASTNode} from '../../../flastTypes.js' */
import {makeMatch, slot, getMemberName, isAssignmentTarget} from './common.js';

/**
 * Detects assignments to Object.prototype.<property>.
 *
 * AST shape — the node we receive is the outer MemberExpression:
 *   AssignmentExpression
 *     left: MemberExpression          ← n  (Object.prototype.someProperty)
 *       object: MemberExpression      (Object.prototype)
 *         object: Identifier('Object')
 *         property: Identifier('prototype') / ['prototype']
 *       property: Identifier / ['someProperty']
 *
 * @param {ASTNode} n MemberExpression
 */
export function matcher(n) {
  const protoExpr = n.object;
  if (protoExpr?.type !== 'MemberExpression') return null;
  if (protoExpr.object?.name !== 'Object' || getMemberName(protoExpr) !== 'prototype') return null;
  if (!isAssignmentTarget(n)) return null;

  const propName = getMemberName(n);
  return makeMatch(n, {
    'property-name': slot(propName ? [propName] : [], [n.property]),
  });
}
