/**
 * Matchers for HTMLCanvasElement and CanvasRenderingContext2D API accesses.
 *
 * getContext and toDataURL target CallExpression nodes.
 * getImageData targets CallExpression nodes on the 2D context object — but since the
 * context object is a runtime value (returned by getContext), we can only match on the
 * method name and rely on co-occurrence with getContext for the fingerprinting inference.
 *
 * Context type extraction for getContext:
 *   canvas.getContext('2d')             → '2d'
 *   canvas.getContext('webgl')          → 'webgl'
 *   canvas.getContext('webgl2')         → 'webgl2'
 *   canvas.getContext('bitmaprenderer') → 'bitmaprenderer'
 *   canvas.getContext(typeVar)          → null (runtime value, not extractable)
 */

/**
 * Attempts to read a static string value from an argument node.
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

export const canvasMatchers = {
  /**
   * Detects canvas.getContext(contextType) calls.
   *
   * The receiver can be any identifier — we cannot statically verify it is an
   * HTMLCanvasElement, so we match on the method name alone and accept the small
   * risk of false positives from objects that happen to have a getContext method.
   *
   * The context type string is extracted when statically available. Known values:
   *   '2d', 'webgl', 'webgl2', 'bitmaprenderer'
   */
  'canvas-get-context'(node) {
    const callee = node.callee;
    if (callee?.type !== 'MemberExpression') return null;
    if (callee.property?.name !== 'getContext') return null;

    const extractedValue = resolveStringArg(node.arguments[0]);
    return {node, extractedValue};
  },

  /**
   * Detects canvas.toDataURL() calls.
   *
   * toDataURL serialises the current canvas pixel buffer to a base64-encoded image
   * string. When combined with getContext and drawing operations this is a strong
   * canvas fingerprinting signal.
   */
  'canvas-to-data-url'(node) {
    const callee = node.callee;
    if (callee?.type !== 'MemberExpression') return null;
    if (callee.property?.name !== 'toDataURL') return null;
    return {node, extractedValue: null};
  },

  /**
   * Detects ctx.getImageData(x, y, width, height) calls.
   *
   * getImageData reads raw pixel data from the canvas. Fingerprinting scripts use
   * this instead of toDataURL when they want to inspect individual pixel values or
   * avoid the MIME-type overhead of a data URL.
   */
  'canvas-get-image-data'(node) {
    const callee = node.callee;
    if (callee?.type !== 'MemberExpression') return null;
    if (callee.property?.name !== 'getImageData') return null;
    return {node, extractedValue: null};
  },
};
