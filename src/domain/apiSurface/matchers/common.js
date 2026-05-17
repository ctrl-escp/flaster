/** @import {ASTNode, Arborist} from '../../../flastTypes.js' */
/**
 * Shared utilities for API interaction matcher functions.
 *
 * Matcher function contract:
 *   (n: ASTNode, arb: Arborist) => DetectorMatch | null
 *
 *   - `n` is pre-filtered to the correct AST type by the engine.
 *   - Return null when this specific node does not satisfy the detector's conditions.
 *   - Return a DetectorMatch when it does.
 */

// ── match construction ────────────────────────────────────────────────────────

/**
 * @param {ASTNode} node
 * @param {Record<string, import('../detectorDefinition.js').DetectorExtractionSlot>} [extractions]
 * @returns {import('../detectorDefinition.js').DetectorMatch}
 */
export function makeMatch(node, extractions = {}) {
  return {node, extractions};
}

/**
 * Creates one extraction slot — the value side of an entry in the extractions map.
 *
 * @param {string[]} values  Resolved strings. Pass [] when not statically known.
 * @param {ASTNode[]} nodes  Contributing AST nodes.
 * @returns {import('../detectorDefinition.js').DetectorExtractionSlot}
 */
export function slot(values, nodes) {
  return {values, nodes};
}

// ── member expression helpers ─────────────────────────────────────────────────

/**
 * Returns the property name from a MemberExpression, handling both forms:
 *   obj.prop       → 'prop'
 *   obj['prop']    → 'prop'   (computed with a string literal)
 *   obj[variable]  → null     (computed with a non-literal — not resolved here)
 *
 * @param {ASTNode} node  MemberExpression
 * @returns {string | null}
 */
export function getMemberName(node) {
  if (!node.computed) return node.property?.name ?? null;
  if (node.property?.type === 'Literal' && typeof node.property.value === 'string') {
    return node.property.value;
  }
  if (node.property?.type === 'Identifier') {
    return resolveString(node.property);
  }
  return null;
}

/**
 * Returns true when a MemberExpression represents `objectName.propertyName`
 * in either dot or bracket-string notation.
 *
 * @param {ASTNode} node  MemberExpression
 * @param {string} objectName
 * @param {string} propertyName
 * @returns {boolean}
 */
export function isMemberExpression(node, objectName, propertyName) {
  return node.object?.name === objectName && getMemberName(node) === propertyName;
}

/**
 * Returns true when a CallExpression calls `objectName.methodName(...)` in either
 * dot or bracket-string notation.
 *
 * @param {ASTNode} node  CallExpression
 * @param {string} objectName
 * @param {string} methodName
 * @returns {boolean}
 */
export function isMethodCall(node, objectName, methodName) {
  const callee = node.callee;
  return (
    callee?.type === 'MemberExpression' &&
    callee.object?.name === objectName &&
    getMemberName(callee) === methodName
  );
}

/**
 * Returns true when a node represents the document object in any of its common forms:
 *
 *   document                          bare global identifier
 *   window.document                   explicit window property
 *   globalThis.document               same, via globalThis
 *   iframeEl.contentDocument          iframe's document directly
 *   iframeEl.contentWindow.document   iframe's window then document
 *
 * The last two cases share the same check: any MemberExpression whose property
 * name is 'document' or 'contentDocument' is treated as a document reference.
 * This is intentionally broad — a false positive on an unusual object with a
 * property named `document` is acceptable given the rarity of that pattern.
 *
 * @param {ASTNode | undefined} node
 * @returns {boolean}
 */
export function isDocumentNode(node) {
  if (!node) return false;
  if (node.type === 'Identifier' && node.name === 'document') return true;
  if (node.type === 'MemberExpression') {
    const name = getMemberName(node);
    return name === 'document' || name === 'contentDocument';
  }
  return false;
}

/**
 * Returns true when the node is on the left side of an AssignmentExpression.
 *
 * @param {ASTNode} node
 * @returns {boolean}
 */
export function isAssignmentTarget(node) {
  return node.parentKey === 'left' && node.parentNode?.type === 'AssignmentExpression';
}

/** Parent types whose `test` child is a boolean condition, not a value read. */
const TEST_CLAUSE_PARENT_TYPES = new Set([
  'ConditionalExpression',
  'IfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'ForStatement',
]);

/**
 * True when `node` is the entire condition of a test clause (ternary, if, loop).
 * Patterns like `document.cookie ? parse() : []` only probe API availability.
 *
 * @param {ASTNode} node
 * @returns {boolean}
 */
export function isDirectTestClause(node) {
  const parent = node.parentNode;
  return (
    node.parentKey === 'test' &&
    parent !== null &&
    parent !== undefined &&
    TEST_CLAUSE_PARENT_TYPES.has(parent.type)
  );
}

// ── value resolution ──────────────────────────────────────────────────────────

/**
 * Collects all reference Identifier nodes for a given Identifier, going through
 * the flAST declaration link. Both VariableDeclarator and direct Identifier
 * declaration nodes are handled defensively.
 *
 * @param {ASTNode} identNode  Identifier
 * @returns {ASTNode[]}
 */
function getDeclRefs(identNode) {
  const declNode = identNode.declNode;
  if (!declNode) return [];
  // VariableDeclarator: { id: Identifier(refs), init }
  if (Array.isArray(declNode.id?.references)) return declNode.id.references;
  // Declaration-site Identifier: { references }
  if (Array.isArray(declNode.references)) return declNode.references;
  return [];
}

/**
 * Collects every static string value an AST node can hold.
 *
 * For a string Literal this is trivial. For an Identifier we follow the variable
 * through two sources:
 *   1. Its declaration initializer (const key = 'session').
 *   2. Every assignment reference where this identifier was on the left-hand side
 *      (key = 'auth'), picking up reassignments throughout the script.
 *
 * `depth` caps recursion so that chained variable aliases don't loop. At depth 0
 * (the call from a matcher) we resolve one level of indirection; at depth 1 we
 * resolve the value of a referenced variable's own declaration. This is enough for
 * code that is not obfuscated.
 *
 * @param {ASTNode | undefined} node
 * @param {number} [depth]
 * @returns {string[]}
 */
export function resolveStrings(node, depth = 0) {
  if (!node) return [];

  if (node.type === 'Literal' && typeof node.value === 'string') return [node.value];

  if (node.type === 'Identifier' && depth < 2) {
    const results = [];

    // Declaration initializer — declNode is the declaration-site Identifier; init is on its
    // parent VariableDeclarator, not on the Identifier itself.
    const declNode = node.declNode;
    if (declNode) {
      const declarator = declNode.type === 'Identifier' ? declNode.parentNode : declNode;
      const init = declarator?.init ?? declarator?.right;
      if (init) results.push(...resolveStrings(init, depth + 1));
    }

    // Assignment references: key = 'some-value'
    for (const ref of getDeclRefs(node)) {
      if (ref.parentKey === 'left' && ref.parentNode?.type === 'AssignmentExpression') {
        results.push(...resolveStrings(ref.parentNode.right, depth + 1));
      }
    }

    return results;
  }

  return [];
}

/**
 * Returns the first string resolved by `resolveStrings`, or null.
 * Use when only one value is expected (e.g. a condition check, not an extraction slot).
 *
 * @param {ASTNode | undefined} node
 * @returns {string | null}
 */
function resolveString(node) {
  return resolveStrings(node)[0] ?? null;
}

/**
 * Returns the first static numeric value of a node as a string, or null.
 * Follows one level of variable reference through declaration and assignments.
 *
 * @param {ASTNode | undefined} node
 * @returns {string | null}
 */
export function resolveNumber(node) {
  if (!node) return null;

  if (node.type === 'Literal' && typeof node.value === 'number') return String(node.value);

  if (node.type === 'Identifier') {
    const declNode = node.declNode;
    if (declNode) {
      const declarator = declNode.type === 'Identifier' ? declNode.parentNode : declNode;
      const init = declarator?.init ?? declarator?.right;
      if (init?.type === 'Literal' && typeof init.value === 'number') return String(init.value);
    }
    for (const ref of getDeclRefs(node)) {
      if (ref.parentKey === 'left' && ref.parentNode?.type === 'AssignmentExpression') {
        const right = ref.parentNode.right;
        if (right?.type === 'Literal' && typeof right.value === 'number') return String(right.value);
      }
    }
  }

  return null;
}

/**
 * Resolves a Web Crypto AlgorithmIdentifier — either a plain string ('SHA-256')
 * or an object with a `name` property ({ name: 'SHA-256' }) — returning the
 * algorithm name or null. Follows one level of variable reference.
 *
 * @param {ASTNode | undefined} node
 * @returns {string | null}
 */
export function resolveAlgorithm(node) {
  if (!node) return null;

  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;

  if (node.type === 'ObjectExpression') {
    const nameProp = node.properties?.find(
      (p) => p.key?.name === 'name' || p.key?.value === 'name',
    );
    if (nameProp?.value?.type === 'Literal' && typeof nameProp.value.value === 'string') {
      return nameProp.value.value;
    }
  }

  if (node.type === 'Identifier' && node.declNode) {
    const declarator = node.declNode.type === 'Identifier' ? node.declNode.parentNode : node.declNode;
    const init = declarator?.init ?? declarator?.right;
    return resolveAlgorithm(init);
  }

  return null;
}
