/**
 * Matchers for Web Worker APIs.
 *
 * new Worker() and new SharedWorker() target NewExpression nodes.
 * navigator.serviceWorker.register() targets CallExpression nodes.
 *
 * Script URL extraction:
 *   The first argument to Worker / SharedWorker / register() is the script URL.
 *   We extract it when it is a string literal or a variable initialised with one.
 *   Dynamic URLs (template literals, concatenation) result in extractedValue: null.
 */

/**
 * Attempts to read a static string value from an AST node.
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

export const workersMatchers = {
  /**
   * Detects new Worker(scriptURL, options?) calls.
   *
   * Workers run in an isolated thread with no DOM access. Spawning a worker from
   * a non-obvious URL (e.g. a blob: or data: URL, or a path not visible in the HTML)
   * is a signal that the script is hiding logic in a secondary file.
   */
  'worker-constructor'(node) {
    if (node.callee?.name !== 'Worker') return null;
    const extractedValue = resolveStringArg(node.arguments[0]);
    return {node, extractedValue};
  },

  /**
   * Detects new SharedWorker(scriptURL, options?) calls.
   *
   * SharedWorkers are accessible from multiple tabs of the same origin, making them
   * a vector for cross-tab communication and persistent background execution that
   * survives individual page navigations.
   */
  'shared-worker-constructor'(node) {
    if (node.callee?.name !== 'SharedWorker') return null;
    const extractedValue = resolveStringArg(node.arguments[0]);
    return {node, extractedValue};
  },

  /**
   * Detects navigator.serviceWorker.register(scriptURL, options?) calls.
   *
   * Service workers intercept all network requests for the registered scope and
   * persist across page loads. A malicious service worker can hijack network traffic,
   * serve modified responses, and maintain a foothold across browser sessions.
   *
   * The callee chain is:
   *   navigator.serviceWorker.register(...)
   *   → CallExpression
   *       callee: MemberExpression
   *         object: MemberExpression (navigator.serviceWorker)
   *         property: Identifier (register)
   */
  'service-worker-register'(node) {
    const callee = node.callee;
    if (callee?.type !== 'MemberExpression') return null;
    if (callee.property?.name !== 'register') return null;

    // The object must be `navigator.serviceWorker` (or a variable holding it).
    // We check the explicit form here; aliased forms (const sw = navigator.serviceWorker)
    // would require reference tracing and are not currently resolved.
    const obj = callee.object;
    const isExplicit =
      obj?.type === 'MemberExpression' &&
      obj.object?.name === 'navigator' &&
      obj.property?.name === 'serviceWorker';

    if (!isExplicit) return null;

    const extractedValue = resolveStringArg(node.arguments[0]);
    return {node, extractedValue};
  },
};
