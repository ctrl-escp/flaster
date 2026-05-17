import store from '../../store.js';
import {collectCapabilityEvidenceMatches} from '../../domain/report/capabilityMatches.js';
import {
  advanceFlatKnownStructureMatch,
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

  function capabilityEvidenceMatches(firedDetectorIds) {
    return collectCapabilityEvidenceMatches(store, firedDetectorIds);
  }

  function capabilityMatchCount(firedDetectorIds) {
    return capabilityEvidenceMatches(firedDetectorIds).length;
  }

  function capabilityMatchPosition(firedDetectorIds) {
    const matches = capabilityEvidenceMatches(firedDetectorIds);
    if (!matches.length) {
      return 0;
    }

    const selection = store.selectedKnownStructureMatch;
    if (!selection) {
      return 1;
    }

    const matchedIndex = matches.findIndex((match) =>
      match.structureId === selection.structureId &&
      match.metadata?.matchOrdinal === selection.index,
    );

    return matchedIndex === -1 ? 1 : matchedIndex + 1;
  }

  function isCapabilityMatchActive(firedDetectorIds) {
    const matches = capabilityEvidenceMatches(firedDetectorIds);
    const selection = store.selectedKnownStructureMatch;
    if (!selection || !matches.length) {
      return false;
    }

    return matches.some((match) =>
      match.structureId === selection.structureId &&
      match.metadata?.matchOrdinal === selection.index,
    );
  }

  function stepCapabilityMatch(firedDetectorIds, direction = 1) {
    const matches = capabilityEvidenceMatches(firedDetectorIds);
    if (!matches.length) {
      return;
    }

    for (let i = 0; i < firedDetectorIds.length; i++) {
      ensureStructureSelected(firedDetectorIds[i]);
    }

    const nextSel = advanceFlatKnownStructureMatch(
      matches,
      store.selectedKnownStructureMatch,
      direction,
    );

    if (!nextSel) {
      return;
    }

    store.setActiveKnownStructure(nextSel.structureId);
    store.setSelectedKnownStructureMatch(nextSel.structureId, nextSel.index);
  }

  function focusCapability(firedDetectorIds) {
    if (capabilityMatchCount(firedDetectorIds) > 0) {
      stepCapabilityMatch(firedDetectorIds, 1);
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
    capabilityMatchCount,
    capabilityMatchPosition,
    isCapabilityMatchActive,
    stepCapabilityMatch,
    focusCapability,
  };
}
