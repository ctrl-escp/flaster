/**
 * Builds CodeMirror decoration ranges for known-structure matches and the active match.
 *
 * @param {readonly { structureId: string, relevantNode?: { range?: unknown }, metadata?: { matchOrdinal?: number } }[]} matches
 * @param {{ structureId: string, index: number } | null} selectedMatch
 * @returns {{
 *   ranges: Array<{ from: number, to: number, className: string }>,
 *   activeRange: { from: number, to: number, className: string } | null,
 * }}
 */
export function createKnownStructureHighlightState(matches, selectedMatch) {
  const ranges = [];
  let activeRange = null;

  for (const match of matches) {
    const span = match?.relevantNode?.range;
    if (!Array.isArray(span) || span.length < 2) {
      continue;
    }

    const range = {
      from: span[0],
      to: span[1],
      className: 'known-structure-highlight',
    };

    const isSelected = Boolean(selectedMatch) &&
      match.structureId === selectedMatch.structureId &&
      match.metadata?.matchOrdinal === selectedMatch.index;

    if (isSelected) {
      range.className = 'known-structure-highlight-active';
      activeRange = range;
    }

    ranges.push(range);
  }

  return {ranges, activeRange};
}
