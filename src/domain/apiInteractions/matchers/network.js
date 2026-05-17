/**
 * Matchers for network request APIs.
 *
 * fetch() and XMLHttpRequest.open() target CallExpression nodes.
 * new WebSocket() targets NewExpression nodes.
 *
 * URL extraction:
 *   The first argument to each API is the URL. We extract it when it is a string
 *   literal or a variable initialised with a string literal. Template literals and
 *   concatenated strings are not resolved — extractedValue will be null in those cases.
 *
 * False-positive risk:
 *   fetch() is a global, so any call to a local function also named `fetch` would
 *   match. This is an inherent limitation of static name-based matching without
 *   full scope resolution. Callers should treat these as candidate matches.
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
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'Identifier' && node.declNode) {
    const init = node.declNode.init ?? node.declNode.right;
    if (init?.type === 'Literal' && typeof init.value === 'string') return init.value;
  }
  return null;
}

export const networkMatchers = {
  /**
   * Detects fetch(url, options?) calls.
   *
   * fetch() is a global function, so the callee is a bare Identifier named 'fetch'
   * rather than a MemberExpression. We check both forms:
   *   fetch('/api/data')
   *   window.fetch('/api/data')
   *
   * The URL (first argument) is extracted when statically known.
   */
  'fetch-call'(node) {
    const callee = node.callee;

    // Bare fetch(...) call
    if (callee?.type === 'Identifier' && callee.name === 'fetch') {
      return {node, extractedValue: resolveStringArg(node.arguments[0])};
    }

    // window.fetch(...) explicit form
    if (
      callee?.type === 'MemberExpression' &&
      callee.object?.name === 'window' &&
      callee.property?.name === 'fetch'
    ) {
      return {node, extractedValue: resolveStringArg(node.arguments[0])};
    }

    return null;
  },

  /**
   * Detects XMLHttpRequest.open(method, url, ...) calls.
   *
   * The XHR receiver can be any identifier — we cannot statically verify it is an
   * XMLHttpRequest instance, so we match on the method name alone. The URL is the
   * second argument (index 1).
   *
   * Example:
   *   const xhr = new XMLHttpRequest();
   *   xhr.open('POST', '/api/submit');
   */
  'xhr-open'(node) {
    const callee = node.callee;
    if (callee?.type !== 'MemberExpression') return null;
    if (callee.property?.name !== 'open') return null;

    // 'open' is a common method name. Require at least two arguments (method, url)
    // to reduce false positives from unrelated objects with an `open` method.
    if (node.arguments.length < 2) return null;

    const extractedValue = resolveStringArg(node.arguments[1]);
    return {node, extractedValue};
  },

  /**
   * Detects new WebSocket(url, protocols?) calls.
   *
   * WebSocket is a constructor, so the engine groups this under NewExpression.
   * The URL (first argument) is extracted when statically known.
   *
   * Example:
   *   const ws = new WebSocket('wss://example.com/socket');
   */
  'websocket-constructor'(node) {
    if (node.callee?.name !== 'WebSocket') return null;
    const extractedValue = resolveStringArg(node.arguments[0]);
    return {node, extractedValue};
  },
};
