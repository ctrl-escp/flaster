/** @import {ASTNode} from '../../flastTypes.js' */
const ATTRIBUTES_TO_IGNORE = ['parentNode', 'children', 'loc', 'range', 'src'];

const relationLabelMap = {
  parent: 'Parent node',
  child: 'Child node',
  elderSibling: 'Preceding sibling',
  self: 'Selected node',
  youngerSibling: 'Following sibling',
};

/**
 * @param {ASTNode | null | undefined} node
 * @param {'parent' | 'child' | 'elderSibling' | 'self' | 'youngerSibling'} relationKind
 */
function createRelatedNodeEntry(node, relationKind) {
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
 * @param {ASTNode | null | undefined} node
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
 * @param {ASTNode | null | undefined} node
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
 * @param {ASTNode | null | undefined} node
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
 * @param {readonly ASTNode[] | null | undefined} flatAst
 * @param {ASTNode | null | undefined} parentNode
 */
export function listChildNodesFromFlatAst(flatAst, parentNode) {
  if (!parentNode) {
    return [];
  }

  return flatAst?.filter((candidate) => candidate.parentNode?.nodeId === parentNode.nodeId) ?? [];
}

/**
 * @param {readonly ASTNode[] | null | undefined} flatAst
 * @param {ASTNode | null | undefined} node
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
