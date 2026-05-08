/**
 * @typedef {{ structureId: string, index: number } | null} KnownStructureMatchSelection
 */

/**
 * @param {import('flast/src/types.js').ASTNode | null | undefined} node
 * @returns {number | null}
 */
export function getNodeId(node) {
  return Number.isInteger(node?.nodeId) ? node.nodeId : null;
}

/**
 * Resolves the selected node on the current Arborist flat AST, or null when the
 * selection is missing, not on the AST, or tied to a different parse run.
 *
 * @param {import('flast/src/arborist.js').Arborist | { ast?: import('flast/src/types.js').ASTNode[] } | null | undefined} arborist
 * @param {number | null} selectedNodeId
 * @param {{ selectionParseRunId: number | null, currentParseRunId: number }} session
 * @returns {import('flast/src/types.js').ASTNode | null}
 */
export function resolveSelectedNode(arborist, selectedNodeId, session) {
  const {selectionParseRunId, currentParseRunId} = session;

  if (!Number.isInteger(selectedNodeId)) {
    return null;
  }

  if (!Number.isInteger(selectionParseRunId) || selectionParseRunId !== currentParseRunId) {
    return null;
  }

  const ast = arborist?.ast;
  if (!Array.isArray(ast)) {
    return null;
  }

  return ast.find((n) => n.nodeId === selectedNodeId) ?? null;
}

/**
 * @param {KnownStructureMatchSelection} selection
 * @param {{ structureId: string, metadata?: { matchOrdinal?: number } }} match
 */
export function isKnownStructureMatchSelectionActive(selection, match) {
  if (!selection || !match) {
    return false;
  }

  return selection.structureId === match.structureId &&
    selection.index === match.metadata?.matchOrdinal;
}

/**
 * Circular navigation over the active structure's flat match list (store semantics).
 *
 * @param {readonly { structureId: string, metadata?: { matchOrdinal?: number } }[]} matches
 * @param {KnownStructureMatchSelection} selectedMatch
 * @param {number} direction
 * @returns {{ structureId: string, index: number } | null}
 */
export function advanceFlatKnownStructureMatch(matches, selectedMatch, direction) {
  if (!Array.isArray(matches) || !matches.length) {
    return null;
  }

  const currentIndex = selectedMatch
    ? matches.findIndex((match) =>
      match.structureId === selectedMatch.structureId &&
      match.metadata?.matchOrdinal === selectedMatch.index,
    )
    : -1;

  const nextIndex = currentIndex === -1
    ? 0
    : (currentIndex + direction + matches.length) % matches.length;

  const nextMatch = matches[nextIndex];
  const ord = nextMatch.metadata?.matchOrdinal;

  if (!Number.isInteger(ord)) {
    return null;
  }

  return {structureId: nextMatch.structureId, index: ord};
}

/**
 * Step match ordinal within one structure (StructureExplorer card navigation).
 *
 * @param {readonly { metadata?: { matchOrdinal?: number } }[]} matches
 * @param {string} structureId
 * @param {KnownStructureMatchSelection} globalSelectedMatch
 * @param {number | undefined} rememberedOrdinal
 * @param {number} direction
 * @returns {number | null}
 */
export function advanceStructureMatchOrdinal(matches, structureId, globalSelectedMatch, rememberedOrdinal, direction) {
  if (!Array.isArray(matches) || !matches.length) {
    return null;
  }

  const currentSelection = globalSelectedMatch?.structureId === structureId
    ? globalSelectedMatch
    : null;

  const currentIndex = currentSelection
    ? matches.findIndex((match) => match.metadata?.matchOrdinal === currentSelection.index)
    : matches.findIndex((match) => match.metadata?.matchOrdinal === rememberedOrdinal);

  const nextIndex = currentIndex === -1
    ? (direction > 0 ? 0 : matches.length - 1)
    : (currentIndex + direction + matches.length) % matches.length;

  const ord = matches[nextIndex].metadata?.matchOrdinal;
  return Number.isInteger(ord) ? ord : null;
}

/**
 * 1-based human position for the active match within a structure's list.
 *
 * @param {readonly { metadata?: { matchOrdinal?: number } }[]} matches
 * @param {string} structureId
 * @param {KnownStructureMatchSelection} globalSelectedMatch
 * @param {number | undefined} rememberedOrdinal
 */
export function structureMatchDisplayIndex(matches, structureId, globalSelectedMatch, rememberedOrdinal) {
  if (!Array.isArray(matches) || !matches.length) {
    return 0;
  }

  const currentSelection = globalSelectedMatch?.structureId === structureId
    ? globalSelectedMatch
    : null;
  const activeIndex = currentSelection?.index ?? rememberedOrdinal;
  const matchedIndex = matches.findIndex((match) => match.metadata?.matchOrdinal === activeIndex);

  return matchedIndex === -1 ? 1 : matchedIndex + 1;
}

/**
 * When selecting a known-structure match, the node to bind for inspection / editor
 * highlight — null when the match has no relevant node.
 *
 * @param {{ relevantNode?: import('flast/src/types.js').ASTNode | null } | null | undefined} match
 */
export function nodeForMatchSelection(match) {
  return match?.relevantNode ?? null;
}
