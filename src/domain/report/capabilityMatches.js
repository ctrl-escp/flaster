/**
 * Aggregates known-structure matches from detectors that fired for a capability.
 *
 * @param {object} store
 * @param {readonly string[]} firedDetectorIds
 * @returns {readonly { structureId: string, metadata?: { matchOrdinal?: number } }[]}
 */
export function collectCapabilityEvidenceMatches(store, firedDetectorIds) {
  const matches = [];
  const ids = firedDetectorIds ?? [];

  for (let i = 0; i < ids.length; i++) {
    const detectorMatches = store.getKnownStructureMatches(ids[i]);
    for (let j = 0; j < detectorMatches.length; j++) {
      matches.push(detectorMatches[j]);
    }
  }

  return matches.sort((left, right) => {
    const byStructure = left.structureId.localeCompare(right.structureId);
    if (byStructure !== 0) {
      return byStructure;
    }

    return (left.metadata?.matchOrdinal ?? 0) - (right.metadata?.matchOrdinal ?? 0);
  });
}

/**
 * @param {object} store
 * @param {readonly string[]} firedDetectorIds
 * @returns {number}
 */
export function countCapabilityEvidenceMatches(store, firedDetectorIds) {
  return collectCapabilityEvidenceMatches(store, firedDetectorIds).length;
}
