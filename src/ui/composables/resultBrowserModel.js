/**
 * @param {{
 *   activeResultMode: string;
 *   areFiltersActive: boolean;
 *   filteredNodes: object[];
 *   astNodes: object[];
 *   relatedNodeEntries: Array<{ node: object; relationLabel?: string }>;
 *   knownStructureMatches: object[];
 *   getStructureTitle: (structureId: string) => string;
 * }} input
 */
export function buildResultBrowserItems({
  activeResultMode,
  areFiltersActive,
  filteredNodes,
  astNodes,
  relatedNodeEntries,
  knownStructureMatches,
  getStructureTitle,
}) {
  if (activeResultMode === 'ast') {
    const nodes = areFiltersActive ? filteredNodes : astNodes;

    return nodes.map((node) => ({
      key: `node:${node.nodeId}`,
      label: node.type,
      summary: node.src?.slice(0, 120) ?? 'No source snippet',
      meta: node.parentNode?.type ?? 'Root',
      node,
      kind: 'node',
    }));
  }

  if (activeResultMode === 'related') {
    return relatedNodeEntries.map((entry) => ({
      key: `related:${entry.node.nodeId}`,
      label: entry.node.type,
      summary: entry.node.src?.slice(0, 120) ?? 'No source snippet',
      meta: `Inside ${entry.node.parentNode?.type ?? 'Root'}`,
      relationLabel: entry.relationLabel,
      node: entry.node,
      kind: 'node',
    }));
  }

  return knownStructureMatches.map((match) => {
    const ord = match.metadata?.matchOrdinal ?? 0;
    const title = getStructureTitle(match.structureId);
    const node = match.relevantNode;

    return {
      key: `match:${match.structureId}:${ord}`,
      label: title,
      summary: match.label,
      meta: `${node?.type ?? 'Unknown'} in ${node?.parentNode?.type ?? 'Root'}`,
      match,
      node,
      kind: 'match',
    };
  });
}

/**
 * @param {string} modeId
 * @param {{
 *   activeResultMode: string;
 *   matchCount: number;
 *   astCount: number;
 *   relatedCount: number;
 * }} state
 */
export function canOpenResultBrowserMode(modeId, state) {
  if (state.activeResultMode === modeId) {
    return false;
  }

  if (modeId === 'matches') {
    return state.matchCount > 0;
  }

  if (modeId === 'ast') {
    return state.astCount > 0;
  }

  if (modeId === 'related') {
    return state.relatedCount > 0;
  }

  return false;
}
