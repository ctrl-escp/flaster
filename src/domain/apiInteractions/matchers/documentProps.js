/**
 * Matchers for document property accesses.
 *
 * All detectors here target MemberExpression nodes pre-filtered by the engine.
 * The read/write distinction is determined by inspecting the parent context:
 *   - parentKey === 'left' on an AssignmentExpression → write
 *   - anything else → read
 *
 * Cookie write detection also attempts to extract the cookie name from the assigned
 * value. Cookies are set as strings of the form "name=value; attributes...", so the
 * name is everything before the first '='. When the right-hand side is a variable
 * rather than a literal, we follow the declaration to find a statically known value.
 */

/**
 * Reads the right-hand side of an assignment, following one level of variable reference
 * to its declaration initializer when the direct value is not a string literal.
 *
 * Returns the string value if found, or null.
 *
 * @param {import('flast/src/types.js').ASTNode} valueNode  The right side of the assignment.
 * @returns {string | null}
 */
function resolveStringValue(valueNode) {
  if (!valueNode) return null;

  // Direct string literal — best case.
  if (valueNode.type === 'Literal' && typeof valueNode.value === 'string') {
    return valueNode.value;
  }

  // Variable reference — follow to the declaration initializer.
  // flAST Identifier reference nodes carry a `declNode` link to the VariableDeclarator
  // or the nearest assignment that initialised the binding.
  if (valueNode.type === 'Identifier' && valueNode.declNode) {
    const init = valueNode.declNode.init ?? valueNode.declNode.right;
    if (init?.type === 'Literal' && typeof init.value === 'string') {
      return init.value;
    }
  }

  return null;
}

/**
 * Given a cookie string ("name=value; Path=/; Secure"), extracts the cookie name.
 * Returns null when the name cannot be determined statically.
 *
 * @param {string | null} cookieString
 * @returns {string | null}
 */
function extractCookieName(cookieString) {
  if (!cookieString) return null;
  const eqIndex = cookieString.indexOf('=');
  if (eqIndex <= 0) return null;
  return cookieString.slice(0, eqIndex).trim() || null;
}

export const documentPropsMatchers = {
  /**
   * Detects reads of document.cookie — any access that is NOT the left side of
   * an assignment. The full cookie string is not extracted here because it's a
   * runtime value; only the structural access pattern is reported.
   */
  'document-cookie-read'(node) {
    if (node.object?.name !== 'document' || node.property?.name !== 'cookie') return null;

    // Exclude write context — that is handled by document-cookie-write.
    const isWrite = node.parentKey === 'left' && node.parent?.type === 'AssignmentExpression';
    if (isWrite) return null;

    return {node, extractedValue: null};
  },

  /**
   * Detects assignments to document.cookie, which is how cookies are created or updated.
   * Cookie strings look like "name=value; Path=/; Secure; SameSite=Lax".
   * We extract the name (the part before the first '=') when the value is statically
   * known — either a direct string literal or a variable pointing at one.
   *
   * Example patterns matched:
   *   document.cookie = 'session=abc; Path=/';
   *   document.cookie = cookieStr;  // where cookieStr = 'session=abc; Path=/'
   */
  'document-cookie-write'(node) {
    if (node.object?.name !== 'document' || node.property?.name !== 'cookie') return null;
    if (node.parentKey !== 'left' || node.parent?.type !== 'AssignmentExpression') return null;

    const rawValue = resolveStringValue(node.parent.right);
    const extractedValue = extractCookieName(rawValue);

    return {node, extractedValue};
  },

  /**
   * Detects reads of document.domain.
   * Used for cross-origin checks or iframe communication setup.
   */
  'document-domain'(node) {
    if (node.object?.name !== 'document' || node.property?.name !== 'domain') return null;
    return {node, extractedValue: null};
  },

  /**
   * Detects reads of document.referrer.
   * Used in analytics, redirect logic, or origin-based branching.
   */
  'document-referrer'(node) {
    if (node.object?.name !== 'document' || node.property?.name !== 'referrer') return null;
    return {node, extractedValue: null};
  },

  /**
   * Detects reads of document.readyState.
   * Usually part of a polling pattern or an early-exit guard waiting for DOMContentLoaded.
   */
  'document-ready-state'(node) {
    if (node.object?.name !== 'document' || node.property?.name !== 'readyState') return null;
    return {node, extractedValue: null};
  },
};
