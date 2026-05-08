const ATTRIBUTES_TO_IGNORE = ['parentNode', 'children', 'loc', 'range', 'src'];

const relationLabelMap = {
  parent: 'Parent node',
  child: 'Child node',
  elderSibling: 'Preceding sibling',
  self: 'Selected node',
  youngerSibling: 'Following sibling',
};

/**
 * @param {import('flast/src/types.js').ASTNode | null | undefined} node
 * @param {'parent' | 'child' | 'elderSibling' | 'self' | 'youngerSibling'} relationKind
 */
export function createRelatedNodeEntry(node, relationKind) {
  if (!node) {
    return null;
  }

  return {
    node,
    relationKind,
    relationLabel: relationLabelMap[relationKind] ?? 'Related node',
  };
}

/**
 * @param {import('flast/src/types.js').ASTNode | null | undefined} node
 */
export function createNodeAttributeEntries(node) {
  if (!node || typeof node !== 'object') {
    return [];
  }

  return Object.entries(node)
    .filter(([key, value]) =>
      !ATTRIBUTES_TO_IGNORE.includes(key) &&
      typeof value !== 'object' &&
      typeof value !== 'function',
    )
    .slice(0, 16)
    .map(([key, value]) => ({key, value: String(value)}));
}

/**
 * @param {import('flast/src/types.js').ASTNode | null | undefined} node
 */
export function createNodeSummary(node) {
  if (!node) {
    return 'No node selected';
  }

  const bits = [node.type];
  if (typeof node.name === 'string' && node.name.length) {
    bits.push(node.name);
  } else if (typeof node.value === 'string' && node.value.length) {
    bits.push(JSON.stringify(node.value));
  } else if (typeof node.src === 'string' && node.src.length) {
    bits.push(node.src.slice(0, 60));
  }

  return bits.join(' ');
}

/**
 * @param {import('flast/src/types.js').ASTNode | null | undefined} node
 */
export function listNodeParentChain(node) {
  const chain = [];
  let current = node?.parentNode ?? null;

  while (current) {
    chain.unshift(current);
    current = current.parentNode ?? null;
  }

  return chain;
}

/**
 * @param {import('flast/src/types.js').ASTNode | null | undefined} node
 */
export function listNodeScopeChain(node) {
  const chain = [];
  let current = node?.parentNode ?? null;

  while (current) {
    chain.unshift(current);
    if (['Program', 'BlockStatement', 'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(current.type)) {
      break;
    }
    current = current.parentNode ?? null;
  }

  return chain;
}

/**
 * @param {readonly import('flast/src/types.js').ASTNode[] | null | undefined} flatAst
 * @param {import('flast/src/types.js').ASTNode | null | undefined} parentNode
 */
export function listChildNodesFromFlatAst(flatAst, parentNode) {
  if (!parentNode) {
    return [];
  }

  return flatAst?.filter((candidate) => candidate.parentNode?.nodeId === parentNode.nodeId) ?? [];
}

/**
 * @param {readonly import('flast/src/types.js').ASTNode[] | null | undefined} flatAst
 * @param {import('flast/src/types.js').ASTNode | null | undefined} node
 */
export function buildRelatedNodeEntries(flatAst, node) {
  if (!node) {
    return [];
  }

  const parentEntries = node.parentNode
    ? [createRelatedNodeEntry(node.parentNode, 'parent')]
    : [];
  const orderedSiblings = node.parentNode
    ? listChildNodesFromFlatAst(flatAst, node.parentNode)
    : [node];
  const currentIndex = orderedSiblings.findIndex((candidate) => candidate.nodeId === node.nodeId);
  const elderSiblingEntries = (currentIndex > 0 ? orderedSiblings.slice(0, currentIndex) : [])
    .map((siblingNode) => createRelatedNodeEntry(siblingNode, 'elderSibling'));
  const selfEntry = createRelatedNodeEntry(node, 'self');
  const childEntries = listChildNodesFromFlatAst(flatAst, node)
    .map((childNode) => createRelatedNodeEntry(childNode, 'child'));
  const youngerSiblingEntries = currentIndex >= 0
    ? orderedSiblings.slice(currentIndex + 1)
      .map((siblingNode) => createRelatedNodeEntry(siblingNode, 'youngerSibling'))
    : [];

  return [...parentEntries, ...elderSiblingEntries, selfEntry, ...childEntries, ...youngerSiblingEntries]
    .filter(Boolean)
    .slice(0, 24);
}
