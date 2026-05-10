import {createKnownStructureHighlightState} from '../../../domain/selection/highlightModel.js';
import {
  advanceFlatKnownStructureMatch,
  nodeForMatchSelection,
} from '../../../domain/selection/nodeSelection.js';
import {sourceRangesOverlap} from '../../../domain/structures/matchNormalization.js';
import {
  collectKnownStructureMatchNodes,
  describeKnownStructureMatchShape,
} from '../../../integrations/restringer/index.js';
import {
  createEmptyMatchGroups,
  createExecutionStatus,
  detectStructures,
  groupStructureMatches,
} from '../../../integrations/restringer/matchingEngine.js';
import {createKnownStructureRuleSeed} from '../../workspaceTemplates.js';
import {areStringArraysEqual} from '../storeUtils.js';

/**
 * Known-structure catalog bindings, detection runs, match selection, and highlights.
 * @param {object} knownStructureState from `createKnownStructureState()`
 * @returns {Record<string, unknown>}
 */
export function createKnownStructuresSection(knownStructureState) {
  return {
    knownStructureInputVersion: 0,
    lastKnownStructureRunInputVersion: -1,
    knownStructureSelectionVersion: 0,
    lastKnownStructureRunSelectionVersion: -1,
    availableKnownStructures: knownStructureState.availableKnownStructures,
    selectedKnownStructureIds: knownStructureState.selectedKnownStructureIds,
    activeKnownStructureId: knownStructureState.activeKnownStructureId,
    latestKnownStructureMatches: knownStructureState.latestKnownStructureMatches,
    knownStructureMatchesById: knownStructureState.knownStructureMatchesById,
    knownStructureMatchCounts: knownStructureState.knownStructureMatchCounts,
    knownStructureExecutionErrors: knownStructureState.knownStructureExecutionErrors,
    knownStructureGroupedMatches: knownStructureState.knownStructureGroupedMatches,
    knownStructureExecutionStatus: knownStructureState.knownStructureExecutionStatus,
    lastKnownStructureRunIds: knownStructureState.lastKnownStructureRunIds,
    selectedKnownStructureMatch: /** @type {{structureId: string, index: number} | null} */ (null),
    knownStructureSelectionById: /** @type {Record<string, number>} */ ({}),
    knownStructureTransformPreview: /** @type {object | null} */ (null),
    inspectedKnownStructureId: null,
    scrollKnownStructureSelectionIntoView: true,
    getKnownStructureById(structureId) {
      return this.availableKnownStructures.find((structure) => structure.id === structureId) ?? null;
    },
    hasKnownStructureResultsToClear() {
      return Boolean(this.latestKnownStructureMatches.length ||
        Object.keys(this.knownStructureMatchesById).length ||
        Object.keys(this.knownStructureExecutionErrors).length ||
        this.knownStructureExecutionStatus.totalStructures ||
        this.selectedKnownStructureMatch ||
        this.knownStructureTransformPreview);
    },
    canPreviewKnownStructureTransform(structureId = this.inspectedKnownStructureId ?? this.activeKnownStructureId) {
      const structure = this.getKnownStructureById(structureId);

      return Boolean(structure &&
        structure.executionMode === 'no-eval' &&
        structure.transformEnabled &&
        this.isCurrentInputParsed());
    },
    canApplyTemplate(templateType = this.activeTemplateType) {
      const activeStructure = this.getKnownStructureById(this.inspectedKnownStructureId ?? this.activeKnownStructureId);
      const hasStructureMatches = this.getKnownStructureMatches(activeStructure?.id).length > 0;

      if (templateType === 'apply-known-transform') {
        return this.canPreviewKnownStructureTransform(activeStructure?.id);
      }

      if (templateType === 'advanced-js-step') {
        return false;
      }

      if (templateType === 'no-transform') {
        return Boolean(activeStructure) && hasStructureMatches;
      }

      if (templateType === 'delete-structure-matches' || templateType === 'isolate-structure-matches') {
        return Boolean(activeStructure) && hasStructureMatches;
      }

      return false;
    },
    isKnownStructureRunnable(structureId) {
      return this.getKnownStructureById(structureId)?.executionMode === 'no-eval';
    },
    getKnownStructureMatches(structureId = this.activeKnownStructureId) {
      return this.knownStructureMatchesById[structureId] ?? [];
    },
    getSelectedKnownStructureMatch() {
      const selection = this.selectedKnownStructureMatch;

      if (!selection) {
        return null;
      }

      return this.getKnownStructureMatches(selection.structureId)
        .find((match) => match.metadata?.matchOrdinal === selection.index) ?? null;
    },
    getKnownStructureMatchNodes(structureId = this.activeKnownStructureId) {
      return collectKnownStructureMatchNodes(this.getKnownStructureMatches(structureId));
    },
    getKnownStructureMatchShape(structureId = this.inspectedKnownStructureId ?? this.activeKnownStructureId) {
      const matches = this.getKnownStructureMatches(structureId)
        ?.map((match) => match?.metadata?.runnerMatch)
        .filter((match) => match !== undefined) ?? [];
      return matches.length ? describeKnownStructureMatchShape(matches) : null;
    },
    refreshKnownStructureHighlights() {
      const editor = this.getEditor(this.editorIds.inputCodeEditor);

      if (!editor?.highlightRanges) {
        return;
      }

      const matches = this.getKnownStructureMatches();
      const highlightState = createKnownStructureHighlightState(matches, this.selectedKnownStructureMatch);
      editor.highlightRanges(highlightState.ranges, highlightState.activeRange, {
        scrollToActive: this.scrollKnownStructureSelectionIntoView,
      });
    },
    clearKnownStructureHighlights() {
      const editor = this.getEditor(this.editorIds.inputCodeEditor);
      editor?.highlightRanges?.([]);
    },
    setInspectedKnownStructure(structureId = null) {
      this.inspectedKnownStructureId = structureId && this.getKnownStructureById(structureId)
        ? structureId
        : null;
    },
    clearKnownStructureTransformPreview(structureId = null) {
      if (!this.knownStructureTransformPreview) {
        return;
      }

      if (structureId && this.knownStructureTransformPreview.structureId !== structureId) {
        return;
      }

      this.knownStructureTransformPreview = null;
    },
    getKnownStructureTransformPreview(structureId = this.inspectedKnownStructureId ?? this.activeKnownStructureId) {
      return this.knownStructureTransformPreview?.structureId === structureId
        ? this.knownStructureTransformPreview
        : null;
    },
    clearKnownStructureResults() {
      this.latestKnownStructureMatches = [];
      this.knownStructureMatchesById = {};
      this.knownStructureMatchCounts = {};
      this.knownStructureExecutionErrors = {};
      this.knownStructureGroupedMatches = createEmptyMatchGroups();
      this.knownStructureExecutionStatus = createExecutionStatus();
      this.lastKnownStructureRunIds = [];
      this.selectedKnownStructureMatch = null;
      this.knownStructureSelectionById = {};
      this.clearKnownStructureTransformPreview();
      this.setInspectedKnownStructure(null);
      this.setSelectedNode(null);
      this.clearKnownStructureHighlights();
      this.lastKnownStructureRunInputVersion = -1;
      this.lastKnownStructureRunSelectionVersion = -1;
    },
    clearKnownStructureMatches(structureId = this.activeKnownStructureId) {
      if (!structureId || !this.knownStructureMatchesById[structureId]) {
        return;
      }

      const nextMatchesById = {...this.knownStructureMatchesById};
      const nextCounts = {...this.knownStructureMatchCounts};
      const nextErrors = {...this.knownStructureExecutionErrors};

      delete nextMatchesById[structureId];
      delete nextCounts[structureId];
      delete nextErrors[structureId];

      this.knownStructureMatchesById = nextMatchesById;
      this.knownStructureMatchCounts = nextCounts;
      this.knownStructureExecutionErrors = nextErrors;
      this.latestKnownStructureMatches = Object.values(nextMatchesById).flat();
      this.knownStructureGroupedMatches = groupStructureMatches(this.latestKnownStructureMatches);

      this.knownStructureExecutionStatus = {
        ...this.knownStructureExecutionStatus,
        totalStructures: Object.keys(nextMatchesById).length,
        completedStructures: Object.keys(nextMatchesById).length,
        runnableStructures: Object.keys(nextMatchesById).length,
        blockedStructures: 0,
        totalMatches: this.latestKnownStructureMatches.length,
      };

      if (this.selectedKnownStructureMatch?.structureId === structureId) {
        this.selectedKnownStructureMatch = null;
      }

      if (this.knownStructureSelectionById[structureId] !== undefined) {
        const nextSelectionById = {...this.knownStructureSelectionById};
        delete nextSelectionById[structureId];
        this.knownStructureSelectionById = nextSelectionById;
      }

      if (this.activeKnownStructureId === structureId) {
        this.activeKnownStructureId = null;
      }

      if (this.inspectedKnownStructureId === structureId) {
        this.setInspectedKnownStructure(this.activeKnownStructureId);
      }

      this.clearKnownStructureTransformPreview(structureId);

      if (this.activeKnownStructureId) {
        this.restoreKnownStructureSelection(this.activeKnownStructureId);
      }

      this.refreshKnownStructureHighlights();
    },
    setSelectedKnownStructureIds(structureIds = []) {
      const availableStructureIds = new Set(this.availableKnownStructures.map((structure) => structure.id));
      const nextSelectedStructureIds = [...new Set(structureIds)].filter((structureId) =>
        availableStructureIds.has(structureId),
      );
      const selectionChanged = !areStringArraysEqual(nextSelectedStructureIds, this.selectedKnownStructureIds);

      this.selectedKnownStructureIds = nextSelectedStructureIds;

      if (selectionChanged) {
        this.knownStructureSelectionVersion += 1;
      }

      if (!this.selectedKnownStructureIds.includes(this.activeKnownStructureId)) {
        this.activeKnownStructureId = null;
      }

      if (this.activeKnownStructureId) {
        this.restoreKnownStructureSelection(this.activeKnownStructureId);
      }
    },
    setActiveKnownStructure(structureId) {
      if (!structureId) {
        this.activeKnownStructureId = null;
        this.selectedKnownStructureMatch = null;
        this.clearKnownStructureHighlights();
        return;
      }

      const nextActiveStructure = this.availableKnownStructures.find((structure) => structure.id === structureId);
      if (nextActiveStructure) {
        this.activeKnownStructureId = nextActiveStructure.id;
        this.setInspectedKnownStructure(nextActiveStructure.id);
        this.restoreKnownStructureSelection(nextActiveStructure.id);

        this.refreshKnownStructureHighlights();
      }
    },
    setSelectedKnownStructureMatch(structureId, matchIndex, revealInInspector = false) {
      const match = this.getKnownStructureMatches(structureId)
        .find((candidate) => candidate.metadata?.matchOrdinal === matchIndex);

      if (!match) {
        this.selectedKnownStructureMatch = null;
        this.setSelectedNode(null);
        this.refreshKnownStructureHighlights();
        return;
      }

      const ord = match.metadata.matchOrdinal;
      this.activeKnownStructureId = structureId;
      this.setInspectedKnownStructure(structureId);
      this.selectedKnownStructureMatch = {
        structureId: match.structureId,
        index: ord,
      };
      this.knownStructureSelectionById = {
        ...this.knownStructureSelectionById,
        [match.structureId]: ord,
      };
      this.setSelectedNode(nodeForMatchSelection(match), 'match');
      if (revealInInspector) {
        this.setActiveWorkspaceTab('results');
      }
      this.refreshKnownStructureHighlights();
    },
    selectKnownStructureMatchStep(direction = 1) {
      const matches = this.getKnownStructureMatches();
      const nextSel = advanceFlatKnownStructureMatch(matches, this.selectedKnownStructureMatch, direction);

      if (!nextSel) {
        this.selectedKnownStructureMatch = null;
        this.clearKnownStructureHighlights();
        return null;
      }

      this.setSelectedKnownStructureMatch(nextSel.structureId, nextSel.index);
      return this.getSelectedKnownStructureMatch();
    },
    restoreKnownStructureSelection(structureId = this.activeKnownStructureId) {
      const matches = this.getKnownStructureMatches(structureId);

      if (!matches.length) {
        this.selectedKnownStructureMatch = null;
        return null;
      }

      const rememberedIndex = this.knownStructureSelectionById[structureId];
      const rememberedMatch = Number.isInteger(rememberedIndex)
        ? matches.find((match) => match.metadata?.matchOrdinal === rememberedIndex) ?? null
        : null;
      const nextMatch = rememberedMatch ?? matches[0];

      const ord = nextMatch.metadata.matchOrdinal;
      this.selectedKnownStructureMatch = {
        structureId: nextMatch.structureId,
        index: ord,
      };
      this.knownStructureSelectionById = {
        ...this.knownStructureSelectionById,
        [nextMatch.structureId]: ord,
      };

      return nextMatch;
    },
    getNavigableKnownStructureIds() {
      const structureIds = this.lastKnownStructureRunIds.length
        ? this.lastKnownStructureRunIds
        : this.selectedKnownStructureIds;

      return structureIds.filter((structureId) => this.getKnownStructureById(structureId));
    },
    selectKnownStructureStep(direction = 1) {
      const navigableStructureIds = this.getNavigableKnownStructureIds();

      if (!navigableStructureIds.length) {
        this.setActiveKnownStructure(null);
        return null;
      }

      const currentIndex = this.activeKnownStructureId
        ? navigableStructureIds.indexOf(this.activeKnownStructureId)
        : -1;
      const nextIndex = currentIndex === -1
        ? 0
        : (currentIndex + direction + navigableStructureIds.length) % navigableStructureIds.length;
      const nextStructureId = navigableStructureIds[nextIndex];

      this.setActiveKnownStructure(nextStructureId);
      return this.getKnownStructureById(nextStructureId);
    },
    setKnownStructureAutoScroll(enabled) {
      this.scrollKnownStructureSelectionIntoView = Boolean(enabled);
      this.refreshKnownStructureHighlights();
    },
    markKnownStructureInputChanged() {
      this.knownStructureInputVersion += 1;
    },
    canRunKnownStructureMatching(structureIds = this.selectedKnownStructureIds) {
      const requestedIds = Array.isArray(structureIds) ? structureIds : [];

      if (!Array.isArray(this.arb?.ast) || this.knownStructureExecutionStatus.state === 'running') {
        return false;
      }

      return requestedIds.some((structureId) => this.isKnownStructureRunnable(structureId));
    },
    hasPendingKnownStructureScan(structureIds = this.selectedKnownStructureIds) {
      const requestedIds = Array.isArray(structureIds) ? structureIds : [];

      if (!this.canRunKnownStructureMatching(requestedIds)) {
        return false;
      }

      if (!areStringArraysEqual(requestedIds, this.lastKnownStructureRunIds)) {
        return true;
      }

      return this.knownStructureInputVersion !== this.lastKnownStructureRunInputVersion ||
        this.knownStructureSelectionVersion !== this.lastKnownStructureRunSelectionVersion;
    },
    getKnownStructureOverlaps(match = this.getSelectedKnownStructureMatch()) {
      const probeRange = match?.relevantNode?.range ??
        (Array.isArray(match?.range) ? match.range : null);
      if (!probeRange) {
        return [];
      }

      return this.latestKnownStructureMatches.filter((candidate) =>
        candidate.structureId !== match.structureId &&
        sourceRangesOverlap(candidate.relevantNode?.range, probeRange),
      );
    },
    copyKnownStructureRuleSeed(structureId = this.activeKnownStructureId) {
      const structure = this.getKnownStructureById(structureId);

      if (!structure) {
        return '';
      }

      return createKnownStructureRuleSeed(structure);
    },
    runKnownStructureMatching(structureIds = this.selectedKnownStructureIds) {
      const requestedIds = Array.isArray(structureIds) ? structureIds : [];
      const runnableIds = requestedIds.filter((structureId) =>
        this.isKnownStructureRunnable(structureId),
      );
      const hasParsedAst = Array.isArray(this.arb?.ast);

      this.knownStructureExecutionStatus = {
        ...createExecutionStatus(),
        state: 'running',
        totalStructures: requestedIds.length,
        runnableStructures: runnableIds.length,
        blockedStructures: requestedIds.length - runnableIds.length,
      };

      if (!hasParsedAst || !runnableIds.length) {
        this.clearKnownStructureResults();
        this.knownStructureExecutionStatus = {
          state: 'complete',
          totalStructures: requestedIds.length,
          completedStructures: 0,
          runnableStructures: hasParsedAst ? runnableIds.length : 0,
          blockedStructures: requestedIds.length - (hasParsedAst ? runnableIds.length : 0),
          totalMatches: 0,
          lastRunAt: new Date().toISOString(),
        };
        return this.knownStructureExecutionStatus;
      }

      const session = detectStructures({
        source: typeof this.arb?.script === 'string' ? this.arb.script : '',
        arborist: this.arb,
        structureIds: requestedIds,
        catalog: this.availableKnownStructures,
      });

      this.latestKnownStructureMatches = session.matches;
      this.knownStructureMatchesById = Object.fromEntries(
        session.runs.map((run) => [run.structureId, [...run.matches]]),
      );
      this.knownStructureMatchCounts = session.matchCounts;
      this.knownStructureExecutionErrors = session.errors;
      this.knownStructureGroupedMatches = session.groupedMatches;
      this.knownStructureExecutionStatus = {
        state: 'complete',
        totalStructures: requestedIds.length,
        completedStructures: session.runs.length,
        runnableStructures: session.structureIds.length,
        blockedStructures: requestedIds.length - session.structureIds.length,
        totalMatches: session.totalMatches,
        lastRunAt: session.ranAt,
      };
      this.lastKnownStructureRunIds = [...session.structureIds];
      this.lastKnownStructureRunInputVersion = this.knownStructureInputVersion;
      this.lastKnownStructureRunSelectionVersion = this.knownStructureSelectionVersion;

      if (this.activeKnownStructureId && !session.structureIds.includes(this.activeKnownStructureId)) {
        this.activeKnownStructureId = null;
      }

      for (const structureId of session.structureIds) {
        const rememberedIndex = this.knownStructureSelectionById[structureId];
        const nextMatches = this.getKnownStructureMatches(structureId);

        if (!nextMatches.length) {
          continue;
        }

        const matchingSelection = Number.isInteger(rememberedIndex)
          ? nextMatches.find((match) => match.metadata?.matchOrdinal === rememberedIndex) ?? null
          : null;

        this.knownStructureSelectionById = {
          ...this.knownStructureSelectionById,
          [structureId]: (matchingSelection ?? nextMatches[0]).metadata.matchOrdinal,
        };
      }

      const restoredMatch = this.restoreKnownStructureSelection(this.activeKnownStructureId);
      this.clearKnownStructureTransformPreview();

      if (!this.inspectedKnownStructureId) {
        this.setInspectedKnownStructure(this.activeKnownStructureId);
      }

      this.setSelectedNode(
        restoredMatch ? nodeForMatchSelection(restoredMatch) : null,
        restoredMatch ? 'match' : null,
      );

      this.refreshKnownStructureHighlights();

      return this.knownStructureExecutionStatus;
    },
    /**
     * Re-run matching only for the given structure ids and merge into existing results
     * (keeps match data for other structures).
     *
     * @param {string[]} structureIds
     * @returns {object | null}
     */
    refreshKnownStructureMatchingForIds(structureIds = []) {
      const requestedIds = [...new Set(Array.isArray(structureIds) ? structureIds.filter(Boolean) : [])];

      if (!requestedIds.length) {
        return null;
      }

      const hasParsedAst = Array.isArray(this.arb?.ast);

      if (!hasParsedAst) {
        return null;
      }

      const runnableIds = requestedIds.filter((structureId) =>
        this.isKnownStructureRunnable(structureId),
      );

      if (!runnableIds.length) {
        return null;
      }

      const session = detectStructures({
        source: typeof this.arb?.script === 'string' ? this.arb.script : '',
        arborist: this.arb,
        structureIds: runnableIds,
        catalog: this.availableKnownStructures,
      });

      const idSet = new Set(runnableIds);
      const mergedMatches = [
        ...this.latestKnownStructureMatches.filter((match) => !idSet.has(match.structureId)),
        ...session.matches,
      ];

      const mergedMatchesById = {...this.knownStructureMatchesById};
      for (const run of session.runs) {
        mergedMatchesById[run.structureId] = [...run.matches];
      }

      const mergedCounts = {...this.knownStructureMatchCounts};
      for (const structureId of runnableIds) {
        mergedCounts[structureId] = session.matchCounts[structureId] ?? 0;
      }

      const mergedErrors = {...this.knownStructureExecutionErrors};
      for (const structureId of runnableIds) {
        const err = session.errors[structureId];

        if (err) {
          mergedErrors[structureId] = err;
        } else {
          delete mergedErrors[structureId];
        }
      }

      this.latestKnownStructureMatches = mergedMatches;
      this.knownStructureMatchesById = mergedMatchesById;
      this.knownStructureMatchCounts = mergedCounts;
      this.knownStructureExecutionErrors = mergedErrors;
      this.knownStructureGroupedMatches = groupStructureMatches(mergedMatches);

      this.knownStructureExecutionStatus = {
        state: 'complete',
        totalStructures: runnableIds.length,
        completedStructures: session.runs.length,
        runnableStructures: session.structureIds.length,
        blockedStructures: runnableIds.length - session.structureIds.length,
        totalMatches: mergedMatches.length,
        lastRunAt: session.ranAt,
      };

      this.lastKnownStructureRunIds = [...new Set([...this.lastKnownStructureRunIds, ...session.structureIds])];
      this.lastKnownStructureRunInputVersion = this.knownStructureInputVersion;
      this.lastKnownStructureRunSelectionVersion = this.knownStructureSelectionVersion;

      for (const structureId of session.structureIds) {
        const rememberedIndex = this.knownStructureSelectionById[structureId];
        const nextMatches = this.getKnownStructureMatches(structureId);

        if (!nextMatches.length) {
          continue;
        }

        const matchingSelection = Number.isInteger(rememberedIndex)
          ? nextMatches.find((match) => match.metadata?.matchOrdinal === rememberedIndex) ?? null
          : null;

        this.knownStructureSelectionById = {
          ...this.knownStructureSelectionById,
          [structureId]: (matchingSelection ?? nextMatches[0]).metadata.matchOrdinal,
        };
      }

      const restoredMatch = this.restoreKnownStructureSelection(this.activeKnownStructureId);
      this.clearKnownStructureTransformPreview();

      if (!this.inspectedKnownStructureId) {
        this.setInspectedKnownStructure(this.activeKnownStructureId);
      }

      this.setSelectedNode(
        restoredMatch ? nodeForMatchSelection(restoredMatch) : null,
        restoredMatch ? 'match' : null,
      );

      this.refreshKnownStructureHighlights();

      return this.knownStructureExecutionStatus;
    },
    runActiveKnownStructureMatching() {
      if (!this.activeKnownStructureId || !this.isKnownStructureRunnable(this.activeKnownStructureId)) {
        return this.runKnownStructureMatching([]);
      }

      return this.runKnownStructureMatching([this.activeKnownStructureId]);
    },
    rerunKnownStructureMatching() {
      const structureIds = this.lastKnownStructureRunIds.length
        ? this.lastKnownStructureRunIds
        : this.selectedKnownStructureIds;

      return this.runKnownStructureMatching(structureIds);
    },
  };
}
