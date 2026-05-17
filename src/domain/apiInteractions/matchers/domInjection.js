/**
 * Matchers for dynamic DOM and code injection APIs.
 *
 * innerHTML and eval() target different node types:
 *   - innerHTML write   → MemberExpression (property-write, engine groups as MemberExpression)
 *   - insertAdjacentHTML → CallExpression
 *   - eval()            → CallExpression
 *   - new Function()    → NewExpression
 *
 * These APIs are grouped together because they all allow runtime injection of
 * executable content — either as HTML (which may contain <script> tags or
 * event-handler attributes) or as direct JavaScript source strings.
 *
 * No value extraction is attempted: the injected content is almost always a
 * runtime-constructed string that cannot be resolved statically.
 */

export const domInjectionMatchers = {
  /**
   * Detects assignments to element.innerHTML.
   *
   * Setting innerHTML parses the assigned string as HTML and inserts the resulting
   * nodes into the DOM. Any <script> tag or inline event handler (onclick="...") in
   * the string becomes live JavaScript. This is the primary sink for XSS attacks and
   * a common method for injecting hidden tracking pixels or phishing forms.
   *
   * Pattern:
   *   someElement.innerHTML = '<script>...</script>';
   *   → MemberExpression with property 'innerHTML', parentKey 'left'
   */
  'inner-html-write'(node) {
    if (node.property?.name !== 'innerHTML') return null;
    if (node.parentKey !== 'left' || node.parent?.type !== 'AssignmentExpression') return null;
    return {node, extractedValue: null};
  },

  /**
   * Detects element.insertAdjacentHTML(position, html) calls.
   *
   * Functionally equivalent to innerHTML assignment but more flexible about insertion
   * position ('beforebegin', 'afterbegin', 'beforeend', 'afterend'). Carries the same
   * XSS and injection risk as innerHTML.
   *
   * Pattern:
   *   el.insertAdjacentHTML('beforeend', '<img src=x onerror="...">');
   */
  'insert-adjacent-html'(node) {
    const callee = node.callee;
    if (callee?.type !== 'MemberExpression') return null;
    if (callee.property?.name !== 'insertAdjacentHTML') return null;
    return {node, extractedValue: null};
  },

  /**
   * Detects eval(source) calls.
   *
   * Evaluates a string as JavaScript in the current scope. This is the most direct
   * form of dynamic code execution: the string can be any valid JS, including code
   * that was decoded, decompressed, or fetched from a remote server just before the
   * call. The primary mechanism used by multi-stage obfuscated payloads.
   *
   * Both the bare form and the window.eval form are matched:
   *   eval('...')
   *   window.eval('...')
   */
  'eval-call'(node) {
    const callee = node.callee;

    if (callee?.type === 'Identifier' && callee.name === 'eval') {
      return {node, extractedValue: null};
    }

    if (
      callee?.type === 'MemberExpression' &&
      callee.object?.name === 'window' &&
      callee.property?.name === 'eval'
    ) {
      return {node, extractedValue: null};
    }

    return null;
  },

  /**
   * Detects new Function(body) / new Function(arg1, ..., body) calls.
   *
   * The Function constructor creates a new function from a source string, equivalent
   * to eval() but in the global scope rather than the local one. Commonly used as an
   * eval() substitute in environments where eval is blocked, or to ensure the evaluated
   * code cannot access local variables.
   *
   * Example:
   *   const fn = new Function('a', 'b', 'return a + b');
   *   const exec = new Function(decodedPayload)();
   */
  'function-constructor'(node) {
    if (node.callee?.name !== 'Function') return null;
    return {node, extractedValue: null};
  },
};
