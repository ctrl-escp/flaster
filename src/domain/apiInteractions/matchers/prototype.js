/**
 * Matchers for native prototype property assignments.
 *
 * All detectors here target MemberExpression nodes pre-filtered by the engine.
 *
 * The pattern being matched is:
 *   Object.prototype.someProperty = value;
 *
 * Which produces this AST:
 *   AssignmentExpression
 *     left: MemberExpression            ← this is the node we receive
 *       object: MemberExpression        ← X.prototype
 *         object: Identifier('Object')
 *         property: Identifier('prototype')
 *       property: Identifier('someProperty')
 *     right: ...
 *
 * So we look for MemberExpression nodes whose *object* is itself a `X.prototype`
 * MemberExpression, and whose parent context is the left side of an assignment.
 * The injected property name is extracted from node.property.
 *
 * This means the engine's MemberExpression pass will visit the outer node
 * (the full `Object.prototype.someProperty`), not the inner `Object.prototype`.
 */

/**
 * Checks whether a node is an assignment to `constructorName.prototype.<property>`.
 * Returns the match with the injected property name extracted, or null.
 *
 * @param {import('flast/src/types.js').ASTNode} node  MemberExpression
 * @param {string} constructorName  'Object' | 'Function' | 'Array'
 * @returns {{ node: import('flast/src/types.js').ASTNode, extractedValue: string | null } | null}
 */
function matchPrototypeWrite(node, constructorName) {
  // The object of this MemberExpression must itself be a MemberExpression.
  const protoExpr = node.object;
  if (protoExpr?.type !== 'MemberExpression') return null;

  // That inner expression must be `constructorName.prototype`.
  if (protoExpr.object?.name !== constructorName) return null;
  if (protoExpr.property?.name !== 'prototype') return null;

  // The outer expression must be the left side of an assignment.
  if (node.parentKey !== 'left' || node.parent?.type !== 'AssignmentExpression') return null;

  // The property being written onto the prototype.
  const extractedValue = node.property?.name ?? null;

  return {node, extractedValue};
}

export const prototypeMatchers = {
  /**
   * Detects assignments to Object.prototype.<property>.
   *
   * Writing to Object.prototype affects every object in the runtime environment.
   * This is used by obfuscation frameworks to install hooks and by prototype-pollution
   * attacks to inject unexpected properties into all objects.
   *
   * Example:
   *   Object.prototype.toString = function() { ... };
   */
  'object-prototype-write'(node) {
    return matchPrototypeWrite(node, 'Object');
  },

  /**
   * Detects assignments to Function.prototype.<property>.
   *
   * Overriding Function.prototype properties affects all function objects. A common
   * anti-debugging technique hooks Function.prototype.toString to disguise native
   * functions as user-defined ones, defeating `fn.toString()` integrity checks.
   *
   * Example:
   *   Function.prototype.toString = () => 'function () { [native code] }';
   */
  'function-prototype-write'(node) {
    return matchPrototypeWrite(node, 'Function');
  },

  /**
   * Detects assignments to Array.prototype.<property>.
   *
   * Overriding built-in array methods (map, filter, forEach, push, …) changes
   * the behaviour of every array in the page, including arrays used by other
   * scripts, frameworks, and the browser's own internal code.
   *
   * Example:
   *   Array.prototype.push = function(...args) { steal(args); return originalPush(...args); };
   */
  'array-prototype-write'(node) {
    return matchPrototypeWrite(node, 'Array');
  },
};
