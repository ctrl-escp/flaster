/**
 * Matchers for the Web Crypto API.
 *
 * All detectors here target CallExpression nodes pre-filtered by the engine.
 *
 * The SubtleCrypto object is accessed via `crypto.subtle` (or `self.crypto.subtle`
 * in workers). We match the explicit `crypto.subtle.method()` form.
 * Aliased access (`const subtle = crypto.subtle; subtle.encrypt(...)`) is not
 * currently resolved — it would require tracking the variable reference chain.
 *
 * Algorithm extraction for crypto.subtle.digest:
 *   The first argument is either a string ('SHA-256') or an AlgorithmIdentifier
 *   object ({ name: 'SHA-256' }). We extract the string form when statically available.
 */

/**
 * Attempts to read a static string from an argument node.
 * Handles both a bare string literal and the `{ name: 'SHA-256' }` object form.
 *
 * @param {import('flast/src/types.js').ASTNode | undefined} node
 * @returns {string | null}
 */
function resolveAlgorithmArg(node) {
  if (!node) return null;

  // Plain string: 'SHA-256'
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;

  // Object form: { name: 'SHA-256' }
  if (node.type === 'ObjectExpression') {
    const nameProp = node.properties?.find(
      (p) => p.key?.name === 'name' || p.key?.value === 'name',
    );
    if (nameProp?.value?.type === 'Literal' && typeof nameProp.value.value === 'string') {
      return nameProp.value.value;
    }
  }

  // Variable reference
  if (node.type === 'Identifier' && node.declNode) {
    const init = node.declNode.init ?? node.declNode.right;
    return resolveAlgorithmArg(init);
  }

  return null;
}

/**
 * Returns a match when a CallExpression calls `crypto.subtle.<methodName>`.
 *
 * @param {import('flast/src/types.js').ASTNode} node  CallExpression
 * @param {string} methodName
 * @param {string | null} extractedValue
 * @returns {{ node: import('flast/src/types.js').ASTNode, extractedValue: string | null } | null}
 */
function matchSubtleCall(node, methodName, extractedValue) {
  const callee = node.callee;
  if (callee?.type !== 'MemberExpression') return null;
  if (callee.property?.name !== methodName) return null;

  // The object must be `crypto.subtle`.
  const obj = callee.object;
  const isExplicit =
    obj?.type === 'MemberExpression' &&
    obj.object?.name === 'crypto' &&
    obj.property?.name === 'subtle';

  if (!isExplicit) return null;

  return {node, extractedValue};
}

export const cryptoMatchers = {
  /**
   * Detects crypto.getRandomValues(typedArray) calls.
   *
   * Fills a TypedArray with cryptographically secure random bytes. Used in
   * token generation, nonce construction, and as an entropy source for
   * fingerprinting scripts that build device identifiers.
   */
  'crypto-get-random-values'(node) {
    const callee = node.callee;
    if (callee?.type !== 'MemberExpression') return null;
    if (callee.property?.name !== 'getRandomValues') return null;

    // crypto.getRandomValues — the object is `crypto`, not `crypto.subtle`.
    if (callee.object?.name !== 'crypto') return null;

    return {node, extractedValue: null};
  },

  /**
   * Detects crypto.subtle.encrypt(algorithm, key, data) calls.
   *
   * Symmetric or asymmetric encryption. The presence of encryption may indicate
   * the script is protecting exfiltrated data before sending it to a remote server,
   * or implementing a legitimate end-to-end encrypted channel.
   */
  'crypto-subtle-encrypt'(node) {
    return matchSubtleCall(node, 'encrypt', null);
  },

  /**
   * Detects crypto.subtle.digest(algorithm, data) calls.
   *
   * Computes a cryptographic hash. Common uses include integrity checks,
   * password hashing (incorrectly — digest is not a KDF), and producing
   * compact fingerprint identifiers from device property strings.
   *
   * The algorithm name ('SHA-1', 'SHA-256', 'SHA-384', 'SHA-512') is extracted
   * when statically available, from either the bare string or object form.
   */
  'crypto-subtle-digest'(node) {
    const extractedValue = resolveAlgorithmArg(node.arguments?.[0]);
    return matchSubtleCall(node, 'digest', extractedValue);
  },
};
