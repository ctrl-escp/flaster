/**
 * Matchers for window and screen geometry properties.
 *
 * All detectors in this file target MemberExpression nodes pre-filtered by the engine.
 * Each function receives a single candidate node and returns a match object or null.
 *
 * These properties are always reads — none have write variants — so there is no need to
 * check parent context. The engine will only call these for MemberExpression nodes.
 *
 * Note: innerWidth, outerWidth, innerHeight, outerHeight can also appear as bare global
 * identifiers (no `window.` prefix). Those are Identifier nodes and would need a separate
 * detector entry with apiKind: 'property-read' and a different grouping node type.
 * The entries here only cover the explicit `window.X` member expression form.
 *
 * @param {import('flast/src/types.js').ASTNode} node
 * @returns {{ node: import('flast/src/types.js').ASTNode, extractedValue: null } | null}
 */

/**
 * Checks that a MemberExpression reads from the named object and property.
 * Used as a shared building block for all simple property-read detectors in this file.
 *
 * @param {import('flast/src/types.js').ASTNode} node
 * @param {string} objectName
 * @param {string} propertyName
 * @returns {{ node: import('flast/src/types.js').ASTNode, extractedValue: null } | null}
 */
function matchPropertyRead(node, objectName, propertyName) {
  if (node.object?.name !== objectName || node.property?.name !== propertyName) return null;
  return {node, extractedValue: null};
}

export const windowGeometryMatchers = {
  // Viewport dimensions (excludes browser chrome such as the DevTools panel).
  // Compared against outer* to infer whether DevTools is open.
  'window-inner-width'(node) {
    return matchPropertyRead(node, 'window', 'innerWidth');
  },

  'window-outer-width'(node) {
    return matchPropertyRead(node, 'window', 'outerWidth');
  },

  'window-inner-height'(node) {
    return matchPropertyRead(node, 'window', 'innerHeight');
  },

  'window-outer-height'(node) {
    return matchPropertyRead(node, 'window', 'outerHeight');
  },

  // Physical screen dimensions — includes areas occupied by the OS taskbar.
  'screen-width'(node) {
    return matchPropertyRead(node, 'screen', 'width');
  },

  'screen-height'(node) {
    return matchPropertyRead(node, 'screen', 'height');
  },

  // Available screen dimensions — excludes areas occupied by the OS taskbar.
  'screen-avail-width'(node) {
    return matchPropertyRead(node, 'screen', 'availWidth');
  },

  'screen-avail-height'(node) {
    return matchPropertyRead(node, 'screen', 'availHeight');
  },
};
