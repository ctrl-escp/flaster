/**
 * Matchers for localStorage and sessionStorage accesses.
 *
 * All detectors here target CallExpression nodes pre-filtered by the engine, except
 * localStorage.clear and sessionStorage.removeItem which take no key argument.
 *
 * The key name (first argument to getItem / setItem / removeItem) is extracted when
 * it is a string literal or a variable whose declaration initializer is a string literal.
 * When the key is computed at runtime the extractedValue will be null.
 *
 * Pattern for every method-call detector in this file:
 *   1. Confirm the callee is a MemberExpression.
 *   2. Confirm the object name matches the storage API (localStorage / sessionStorage).
 *   3. Confirm the method name.
 *   4. Extract the key argument if applicable.
 */

/**
 * Attempts to read a static string value from an AST node.
 * Follows one level of variable reference to its declaration initializer.
 *
 * @param {import('flast/src/types.js').ASTNode | undefined} node
 * @returns {string | null}
 */
function resolveStringArg(node) {
  if (!node) return null;

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }

  // Variable reference — follow the declNode link added by flAST.
  if (node.type === 'Identifier' && node.declNode) {
    const init = node.declNode.init ?? node.declNode.right;
    if (init?.type === 'Literal' && typeof init.value === 'string') {
      return init.value;
    }
  }

  return null;
}

/**
 * Returns a match when a CallExpression calls `objectName.methodName(...)`.
 * Passes the first argument through `resolveStringArg` when `extractKey` is true.
 *
 * @param {import('flast/src/types.js').ASTNode} node  CallExpression
 * @param {string} objectName
 * @param {string} methodName
 * @param {boolean} extractKey
 */
function matchStorageCall(node, objectName, methodName, extractKey) {
  const callee = node.callee;
  if (callee?.type !== 'MemberExpression') return null;
  if (callee.object?.name !== objectName || callee.property?.name !== methodName) return null;

  const extractedValue = extractKey ? resolveStringArg(node.arguments[0]) : null;
  return {node, extractedValue};
}

export const storageMatchers = {
  // ── localStorage ──────────────────────────────────────────────────────────

  /**
   * localStorage.getItem('key') — reads a value by key name.
   */
  'local-storage-getitem'(node) {
    return matchStorageCall(node, 'localStorage', 'getItem', true);
  },

  /**
   * localStorage.setItem('key', value) — writes a value under a key name.
   */
  'local-storage-setitem'(node) {
    return matchStorageCall(node, 'localStorage', 'setItem', true);
  },

  /**
   * localStorage.removeItem('key') — deletes a single key.
   */
  'local-storage-removeitem'(node) {
    return matchStorageCall(node, 'localStorage', 'removeItem', true);
  },

  /**
   * localStorage.clear() — wipes all keys for the origin.
   * No key to extract.
   */
  'local-storage-clear'(node) {
    return matchStorageCall(node, 'localStorage', 'clear', false);
  },

  // ── sessionStorage ────────────────────────────────────────────────────────

  /**
   * sessionStorage.getItem('key') — reads a value by key name.
   */
  'session-storage-getitem'(node) {
    return matchStorageCall(node, 'sessionStorage', 'getItem', true);
  },

  /**
   * sessionStorage.setItem('key', value) — writes a value under a key name.
   */
  'session-storage-setitem'(node) {
    return matchStorageCall(node, 'sessionStorage', 'setItem', true);
  },

  /**
   * sessionStorage.removeItem('key') — deletes a single key.
   */
  'session-storage-removeitem'(node) {
    return matchStorageCall(node, 'sessionStorage', 'removeItem', true);
  },
};
