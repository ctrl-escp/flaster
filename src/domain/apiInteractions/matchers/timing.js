/**
 * Matchers for timing APIs.
 *
 * setTimeout and setInterval target CallExpression nodes.
 * performance.now() targets CallExpression nodes.
 *
 * Delay / interval extraction:
 *   The delay is the second argument to setTimeout / setInterval (index 1).
 *   We extract it when it is a numeric literal. Variables and computed values
 *   are not resolved — extractedValue will be null in those cases.
 *   The value is returned as a string to stay consistent with the contract
 *   (extractedValue is always string | null), formatted as the millisecond count.
 */

/**
 * Attempts to read a static numeric value from an AST node and return it as a string.
 *
 * @param {import('flast/src/types.js').ASTNode | undefined} node
 * @returns {string | null}
 */
function resolveNumericArg(node) {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'number') return String(node.value);
  if (node.type === 'Identifier' && node.declNode) {
    const init = node.declNode.init ?? node.declNode.right;
    if (init?.type === 'Literal' && typeof init.value === 'number') return String(init.value);
  }
  return null;
}

/**
 * Matches a call to a global timer function (setTimeout or setInterval).
 * Checks both the bare form and the explicit window.X form.
 *
 * @param {import('flast/src/types.js').ASTNode} node  CallExpression
 * @param {string} fnName  'setTimeout' | 'setInterval'
 * @returns {{ node: import('flast/src/types.js').ASTNode, extractedValue: string | null } | null}
 */
function matchTimerCall(node, fnName) {
  const callee = node.callee;

  const isBare = callee?.type === 'Identifier' && callee.name === fnName;
  const isWindowProp =
    callee?.type === 'MemberExpression' &&
    callee.object?.name === 'window' &&
    callee.property?.name === fnName;

  if (!isBare && !isWindowProp) return null;

  // Delay/interval is the second argument.
  const extractedValue = resolveNumericArg(node.arguments[1]);
  return {node, extractedValue};
}

export const timingMatchers = {
  /**
   * Detects setTimeout(callback, delay) calls.
   *
   * Unusually short delays (< 10 ms) in polling loops are sometimes used as
   * a timing-based DevTools detection technique, where the measured elapsed
   * time differs when the debugger pauses execution.
   */
  'set-timeout'(node) {
    return matchTimerCall(node, 'setTimeout');
  },

  /**
   * Detects setInterval(callback, interval) calls.
   *
   * Recurring timers are the heartbeat of polling-based DevTools probes and
   * anti-debugging loops. The interval value helps distinguish short aggressive
   * probes from normal UI update cycles.
   */
  'set-interval'(node) {
    return matchTimerCall(node, 'setInterval');
  },

  /**
   * Detects performance.now() calls.
   *
   * Returns a high-resolution timestamp in milliseconds. Used in timing attacks
   * where the script measures how long a block of code takes to execute —
   * significantly slower when the JavaScript debugger is active.
   */
  'performance-now'(node) {
    const callee = node.callee;
    if (callee?.type !== 'MemberExpression') return null;
    if (callee.object?.name !== 'performance' || callee.property?.name !== 'now') return null;
    return {node, extractedValue: null};
  },
};
