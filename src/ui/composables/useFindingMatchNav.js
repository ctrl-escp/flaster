import store from '../../store.js';
import {
  advanceStructureMatchOrdinal,
  structureMatchDisplayIndex,
} from '../../domain/selection/nodeSelection.js';

/**
 * Shared prev/next match navigation for structure-backed findings (Report, API Surface).
 */
export function useFindingMatchNav() {
  function ensureStructureSelected(structureId) {
    if (!store.selectedKnownStructureIds.includes(structureId)) {
      store.setSelectedKnownStructureIds([
        ...new Set([...store.selectedKnownStructureIds, structureId]),
      ]);
    }
  }

  function matchCount(structureId) {
    return store.getKnownStructureMatches(structureId).length;
  }

  function matchPosition(structureId) {
    return structureMatchDisplayIndex(
      store.getKnownStructureMatches(structureId),
      structureId,
      store.selectedKnownStructureMatch,
      store.knownStructureSelectionById[structureId],
    );
  }

  function isMatchActive(structureId) {
    return store.selectedKnownStructureMatch?.structureId === structureId;
  }

  function stepMatch(structureId, direction = 1) {
    const matches = store.getKnownStructureMatches(structureId);
    if (!matches.length) {
      return;
    }

    ensureStructureSelected(structureId);
    store.setActiveKnownStructure(structureId);

    const nextOrdinal = advanceStructureMatchOrdinal(
      matches,
      structureId,
      store.selectedKnownStructureMatch,
      store.knownStructureSelectionById[structureId],
      direction,
    );

    if (!Number.isInteger(nextOrdinal)) {
      return;
    }

    store.setSelectedKnownStructureMatch(structureId, nextOrdinal);
  }

  function openInExplorer(structureId) {
    ensureStructureSelected(structureId);
    store.setActiveKnownStructure(structureId);
    store.setActiveWorkspaceTab('explorer');
  }

  function focusDetector(structureId) {
    ensureStructureSelected(structureId);
    store.setActiveKnownStructure(structureId);
    if (matchCount(structureId) > 0) {
      stepMatch(structureId, 1);
    }
  }

  return {
    ensureStructureSelected,
    matchCount,
    matchPosition,
    isMatchActive,
    stepMatch,
    openInExplorer,
    focusDetector,
  };
}
