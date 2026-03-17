import {reactive} from 'vue';
import {
  createEmptyMatchGroups,
  createExecutionStatus,
  createKnownStructureState,
  getInitialActiveStructureId,
  groupStructureMatches,
  runKnownStructureMatchingSession,
} from './integrations/restringer/matchingEngine.js';
import {runKnownStructureTransformSession} from './integrations/restringer/index.js';

/**
 * @typedef {import('@codemirror/view').EditorView} EditorView
 */

/**
 * @typedef {ReturnType<typeof createKnownStructureState>['availableKnownStructures'][number]} KnownStructureDescriptor
 */

/**
 * @typedef {ReturnType<typeof createKnownStructureState>['latestKnownStructureMatches'][number]} KnownStructureMatch
 */

/**
 * @typedef {{
 *   structureId: string,
 *   index: number,
 * } | null} KnownStructureMatchSelection
 */

/**
 * @typedef {Record<string, number>} KnownStructureSelectionIndexMap
 */

/**
 * @typedef {{
 *   structureId: string,
 *   structureTitle: string,
 *   transformName: string,
 *   targetedMatchCount: number,
 *   pendingChanges: number,
 *   selectedMatchCount: number,
 *   previewedAt: string,
 *   hasChanges: boolean,
 *   error: Error | null,
 * } | null} KnownStructureTransformPreview
 */

/**
 * @typedef {{
 *   kind: 'custom',
 *   filters: unknown[],
 *   transformationCode: string,
 * }} StoredCustomStep
 */

/**
 * @typedef {{
 *   kind: 'known-structure-transform',
 *   structureId: string,
 *   structureTitle: string,
 *   moduleName: string,
 *   matcherName: string,
 *   transformName: string,
 *   affectedMatchCount: number,
 *   appliedChanges: number,
 *   appliedAt: string,
 *   sequenceIndex: number,
 * }} StoredKnownStructureTransformStep
 */

/**
 * @typedef {StoredCustomStep | StoredKnownStructureTransformStep} StoredTransformationStep
 */

/**
 * Checks whether two normalized match ranges overlap in source space.
 *
 * @param {readonly [number, number] | number[] | null | undefined} leftRange
 * @param {readonly [number, number] | number[] | null | undefined} rightRange
 * @returns {boolean}
 */
function doRangesOverlap(leftRange, rightRange) {
  return Array.isArray(leftRange) &&
    Array.isArray(rightRange) &&
    leftRange.length >= 2 &&
    rightRange.length >= 2 &&
    leftRange[0] < rightRange[1] &&
    rightRange[0] < leftRange[1];
}

/**
 *
 * @param {string} editorId
 * @returns {EditorView}
 */
function getEditor(editorId) {
  // noinspection JSUnresolvedReference
  return store.editors.find((e) => e.editorId === editorId);
}

/**
 *
 * @param {EditorView} editor
 * @param {string} content
 */
function setContent(editor, content) {
  editor.dispatch({
    changes: [
      {from: 0, to: editor.state.doc.length},
      {from: 0, insert: content},
    ],
  });
}

/**
 * Builds the decoration ranges used to highlight known structure matches in the
 * input editor while keeping the active match visually distinct.
 *
 * @param {readonly KnownStructureMatch[]} matches
 * @param {KnownStructureMatchSelection} selectedMatch
 * @returns {{
 *   ranges: Array<{from: number, to: number, className: string}>,
 *   activeRange: {from: number, to: number, className: string} | null,
 * }}
 */
function createKnownStructureHighlightState(matches, selectedMatch) {
  const ranges = [];
  let activeRange = null;

  for (const match of matches) {
    if (!Array.isArray(match?.range) || match.range.length < 2) {
      continue;
    }

    const range = {
      from: match.range[0],
      to: match.range[1],
      className: 'known-structure-highlight',
    };

    const isSelected = !!selectedMatch &&
      match.structureId === selectedMatch.structureId &&
      match.index === selectedMatch.index;

    if (isSelected) {
      range.className = 'known-structure-highlight-active';
      activeRange = range;
    }

    ranges.push(range);
  }

  return {ranges, activeRange};
}

/**
 * Creates the reusable custom-filter seed text derived from a known structure descriptor.
 *
 * @param {KnownStructureDescriptor} structure
 * @returns {string}
 */
function createKnownStructureRuleSeed(structure) {
  return `// Seeded from known structure: ${structure.title} (${structure.id})
// Category: ${structure.category}
// Tags: ${structure.tags.join(', ')}
// Description: ${structure.description}
//
// Replace this placeholder with a custom flAST filter predicate.
n.type === '${structure.category === 'calls' ? 'CallExpression' : 'Identifier'}'`;
}

/**
 * Creates an Arborist instance for preview or reparse flows.
 *
 * @param {string} script
 * @returns {import('flast/src/arborist.js').Arborist}
 */
function createArborist(script) {
  const ArboristConstructor = window.flast?.Arborist;

  if (typeof ArboristConstructor !== 'function') {
    throw new Error('flAST Arborist is not available');
  }

  return new ArboristConstructor(script);
}

const knownStructureState = createKnownStructureState();

const store = reactive({
  currentBottomPane: 'filter',
  changeViewTo(bottomPaneName) {this.currentBottomPane = bottomPaneName;},
  // editor
  editors: [],
  editorIds: {
    inputCodeEditor: 'inputCodeEditor',
    filterEditor: 'filterEditor',
    transformEditor: 'transformEditor',
    composerEditor: 'composerEditor',
  },
  getEditor,
  setContent,
  // parsing
  ast: [],
  arb: {ast: []},
  states: [],
  saveState() {
    // noinspection JSUnresolvedReference
    this.states.push({
      script: store.arb.script,
      filters: this.filters,
      steps: this.steps,
      transformationCode: this.transformationCode,
    });
  },
  revertState() {
    if (this.states.length) {
      const state = this.states.shift();
      // noinspection JSValidateTypes
      this.loadNewScript(state.script);
      this.filters = state.filters;
      this.steps = state.steps;
      this.transformationCode = state.transformationCode;
      this.clearKnownStructureTransformPreview();
    }
  },
  /**
   * Applies the Arborist pending changes and records the mutation as either a
   * custom transform step or a built-in known-structure transform step.
   *
   * @param {string | null | undefined} transformSrc
   * @param {StoredTransformationStep | null} [stepEntry=null]
   * @returns {boolean}
   */
  applyAndUpdateTransformation(transformSrc, stepEntry = null) {
    const changes = this.arb.applyChanges();
    if (changes > 0) {
      if (typeof transformSrc === 'string') {
        this.transformationCode = transformSrc;
      }

      this.steps.push(stepEntry ?? {
        kind: 'custom',
        filters: this.filters.filter((f) => f.enabled),
        transformationCode: typeof transformSrc === 'string' ? transformSrc : '',
      });
      this.logMessage(`${changes} changes were made`, 'success');
      this.loadNewScript(this.arb.script);
      return true;
    }
    this.logMessage('No changes made', 'error');
    return false;
  },
  loadNewScript(script) {
    const inputEditor = this.getEditor(this.editorIds.inputCodeEditor);

    if (inputEditor) {
      this.setContent(inputEditor, script);
    }

    this.arb = createArborist(script);
    store.page = 0;
    this.filteredNodes = this.arb.ast;
    this.filters.length = 0;
    this.runKnownStructureMatching();
  },
  combineFilters(filtersArr) {
    let filterSrc = `(${filtersArr[0]})\n`;
    for (const filter of filtersArr.slice(1)) {
      filterSrc += ` && (${filter})\n`;
    }
    return filterSrc;
  },
  steps: [],
  filters: [],
  transformationCode: '',
  // eslint-disable-next-line no-unused-vars
  logMessage(text, level) {},
  nodesPageSize: 100,
  page: 0,
  isTransformed: false,
  filteredNodes: [],
  areFiltersActive: true,
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
  selectedKnownStructureMatch: /** @type {KnownStructureMatchSelection} */ (null),
  knownStructureSelectionById: /** @type {KnownStructureSelectionIndexMap} */ ({}),
  knownStructureTransformPreview: /** @type {KnownStructureTransformPreview} */ (null),
  inspectedKnownStructureId: null,
  scrollKnownStructureSelectionIntoView: true,
  getKnownStructureById(structureId) {
    return this.availableKnownStructures.find((structure) => structure.id === structureId) ?? null;
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
      .find((match) => match.index === selection.index) ?? null;
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
    this.clearKnownStructureHighlights();
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
      this.activeKnownStructureId = getInitialActiveStructureId(
        this.availableKnownStructures,
        Object.keys(nextMatchesById),
      );
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
    this.selectedKnownStructureIds = [...new Set(structureIds)].filter((structureId) =>
      availableStructureIds.has(structureId),
    );

    if (!this.selectedKnownStructureIds.includes(this.activeKnownStructureId)) {
      this.activeKnownStructureId = getInitialActiveStructureId(
        this.availableKnownStructures,
        this.selectedKnownStructureIds,
      );
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
  setSelectedKnownStructureMatch(structureId, matchIndex) {
    const match = this.getKnownStructureMatches(structureId).find((candidate) => candidate.index === matchIndex);

    if (!match) {
      this.selectedKnownStructureMatch = null;
      this.refreshKnownStructureHighlights();
      return;
    }

    this.activeKnownStructureId = structureId;
    this.setInspectedKnownStructure(structureId);
    this.selectedKnownStructureMatch = {
      structureId: match.structureId,
      index: match.index,
    };
    this.knownStructureSelectionById = {
      ...this.knownStructureSelectionById,
      [match.structureId]: match.index,
    };
    this.refreshKnownStructureHighlights();
  },
  selectKnownStructureMatchStep(direction = 1) {
    const matches = this.getKnownStructureMatches();

    if (!matches.length) {
      this.selectedKnownStructureMatch = null;
      this.clearKnownStructureHighlights();
      return null;
    }

    const currentIndex = this.selectedKnownStructureMatch
      ? matches.findIndex((match) =>
        match.structureId === this.selectedKnownStructureMatch.structureId &&
        match.index === this.selectedKnownStructureMatch.index,
      )
      : -1;

    const nextIndex = currentIndex === -1
      ? 0
      : (currentIndex + direction + matches.length) % matches.length;

    const nextMatch = matches[nextIndex];
    this.setSelectedKnownStructureMatch(nextMatch.structureId, nextMatch.index);
    return nextMatch;
  },
  restoreKnownStructureSelection(structureId = this.activeKnownStructureId) {
    const matches = this.getKnownStructureMatches(structureId);

    if (!matches.length) {
      this.selectedKnownStructureMatch = null;
      return null;
    }

    const rememberedIndex = this.knownStructureSelectionById[structureId];
    const rememberedMatch = Number.isInteger(rememberedIndex)
      ? matches.find((match) => match.index === rememberedIndex) ?? null
      : null;
    const nextMatch = rememberedMatch ?? matches[0];

    this.selectedKnownStructureMatch = {
      structureId: nextMatch.structureId,
      index: nextMatch.index,
    };
    this.knownStructureSelectionById = {
      ...this.knownStructureSelectionById,
      [nextMatch.structureId]: nextMatch.index,
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
    this.scrollKnownStructureSelectionIntoView = !!enabled;
    this.refreshKnownStructureHighlights();
  },
  getKnownStructureOverlaps(match = this.getSelectedKnownStructureMatch()) {
    if (!match?.range) {
      return [];
    }

    return this.latestKnownStructureMatches.filter((candidate) =>
      candidate.structureId !== match.structureId &&
      doRangesOverlap(candidate.range, match.range),
    );
  },
  copyKnownStructureRuleSeed(structureId = this.activeKnownStructureId) {
    const structure = this.getKnownStructureById(structureId);

    if (!structure) {
      return '';
    }

    return createKnownStructureRuleSeed(structure);
  },
  /**
   * Builds a lightweight transform preview for a browser-safe known structure
   * without mutating the currently active Arborist instance.
   *
   * @param {string | null} [structureId=this.inspectedKnownStructureId ?? this.activeKnownStructureId]
   * @returns {KnownStructureTransformPreview}
   */
  previewKnownStructureTransform(
    structureId = this.inspectedKnownStructureId ?? this.activeKnownStructureId,
  ) {
    const structure = this.getKnownStructureById(structureId);

    if (!structure) {
      this.logMessage('Pick a known structure before previewing its transform', 'error');
      this.clearKnownStructureTransformPreview();
      return null;
    }

    if (!structure.transformEnabled) {
      this.logMessage(`${structure.title} does not expose a browser-safe transform`, 'error');
      this.clearKnownStructureTransformPreview(structure.id);
      return null;
    }

    if (!this.arb?.script?.length) {
      this.logMessage('Parse code before previewing a known structure transform', 'error');
      this.clearKnownStructureTransformPreview(structure.id);
      return null;
    }

    try {
      const previewArborist = createArborist(this.arb.script);
      const previewSession = runKnownStructureTransformSession(previewArborist, structure.id);
      const preview = {
        structureId: structure.id,
        structureTitle: structure.title,
        transformName: previewSession.transformName,
        targetedMatchCount: previewSession.targetedMatchCount,
        pendingChanges: previewSession.pendingChanges ?? 0,
        selectedMatchCount: this.getKnownStructureMatches(structure.id).length,
        previewedAt: new Date().toISOString(),
        hasChanges: (previewSession.pendingChanges ?? 0) > 0,
        error: previewSession.error,
      };

      this.knownStructureTransformPreview = preview;

      if (preview.error) {
        this.logMessage(`Unable to preview ${structure.title}: ${preview.error.message}`, 'error');
      } else {
        this.logMessage(
          `Previewed ${structure.title}: ${preview.targetedMatchCount} matches, ${preview.pendingChanges} pending changes`,
          'success',
        );
      }

      return preview;
    } catch (error) {
      this.knownStructureTransformPreview = {
        structureId: structure.id,
        structureTitle: structure.title,
        transformName: structure.implementation.transformName,
        targetedMatchCount: 0,
        pendingChanges: 0,
        selectedMatchCount: this.getKnownStructureMatches(structure.id).length,
        previewedAt: new Date().toISOString(),
        hasChanges: false,
        error,
      };
      this.logMessage(`Unable to preview ${structure.title}: ${error.message}`, 'error');
      return this.knownStructureTransformPreview;
    }
  },
  /**
   * Applies a browser-safe known structure transform to the current script
   * after a preview has been generated for the same structure.
   *
   * @param {string | null} [structureId=this.inspectedKnownStructureId ?? this.activeKnownStructureId]
   * @returns {boolean}
   */
  applyKnownStructureTransform(
    structureId = this.inspectedKnownStructureId ?? this.activeKnownStructureId,
  ) {
    const structure = this.getKnownStructureById(structureId);

    if (!structure) {
      this.logMessage('Pick a known structure before applying its transform', 'error');
      return false;
    }

    const preview = this.getKnownStructureTransformPreview(structure.id) ??
      this.previewKnownStructureTransform(structure.id);

    if (!preview || preview.error) {
      return false;
    }

    this.saveState();

    try {
      const transformSession = runKnownStructureTransformSession(this.arb, structure.id);

      if (transformSession.error || (transformSession.pendingChanges ?? 0) < 1) {
        this.states.pop();
        this.logMessage(
          transformSession.error?.message ?? `${structure.title} did not produce any pending changes`,
          'error',
        );
        return false;
      }

      const stepEntry = {
        kind: 'known-structure-transform',
        structureId: structure.id,
        structureTitle: structure.title,
        moduleName: structure.implementation.moduleName,
        matcherName: structure.implementation.matcherName,
        transformName: transformSession.transformName,
        affectedMatchCount: transformSession.targetedMatchCount,
        appliedChanges: transformSession.pendingChanges ?? 0,
        appliedAt: new Date().toISOString(),
        sequenceIndex: this.steps.length + 1,
      };

      const applied = this.applyAndUpdateTransformation(null, stepEntry);

      if (!applied) {
        this.states.pop();
        return false;
      }

      this.clearKnownStructureTransformPreview(structure.id);
      this.logMessage(
        `Applied ${structure.title}: ${stepEntry.appliedChanges} changes across ${stepEntry.affectedMatchCount} matches`,
        'success',
      );
      return true;
    } catch (error) {
      this.states.pop();
      this.logMessage(`Unable to apply ${structure.title}: ${error.message}`, 'error');
      return false;
    }
  },
  runKnownStructureMatching(structureIds = this.selectedKnownStructureIds) {
    const idsToRun = Array.isArray(structureIds) ? structureIds : [];
    const hasParsedAst = !!this.arb?.ast?.length;

    this.knownStructureExecutionStatus = {
      ...createExecutionStatus(),
      state: 'running',
      totalStructures: idsToRun.length,
    };

    if (!hasParsedAst || !idsToRun.length) {
      this.clearKnownStructureResults();
      return this.knownStructureExecutionStatus;
    }

    const session = runKnownStructureMatchingSession(this.arb, idsToRun);

    this.latestKnownStructureMatches = session.matches;
    this.knownStructureMatchesById = Object.fromEntries(
      session.runs.map((run) => [run.structureId, [...run.matches]]),
    );
    this.knownStructureMatchCounts = session.matchCounts;
    this.knownStructureExecutionErrors = session.errors;
    this.knownStructureGroupedMatches = session.groupedMatches;
    this.knownStructureExecutionStatus = {
      state: 'complete',
      totalStructures: session.structureIds.length,
      completedStructures: session.runs.length,
      totalMatches: session.totalMatches,
      lastRunAt: session.ranAt,
    };
    this.lastKnownStructureRunIds = [...session.structureIds];

    if (!this.activeKnownStructureId || !session.structureIds.includes(this.activeKnownStructureId)) {
      this.activeKnownStructureId = getInitialActiveStructureId(
        this.availableKnownStructures,
        session.structureIds,
      );
    }

    for (const structureId of session.structureIds) {
      const rememberedIndex = this.knownStructureSelectionById[structureId];
      const nextMatches = this.getKnownStructureMatches(structureId);

      if (!nextMatches.length) {
        continue;
      }

      const matchingSelection = Number.isInteger(rememberedIndex)
        ? nextMatches.find((match) => match.index === rememberedIndex) ?? null
        : null;

      this.knownStructureSelectionById = {
        ...this.knownStructureSelectionById,
        [structureId]: (matchingSelection ?? nextMatches[0]).index,
      };
    }

    this.restoreKnownStructureSelection(this.activeKnownStructureId);
    this.clearKnownStructureTransformPreview();

    if (!this.inspectedKnownStructureId) {
      this.setInspectedKnownStructure(this.activeKnownStructureId);
    }

    this.refreshKnownStructureHighlights();

    return this.knownStructureExecutionStatus;
  },
  runActiveKnownStructureMatching() {
    if (!this.activeKnownStructureId) {
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
  // placeholders
  resetParsedState() {},
  parseContent() {},
});

if (typeof window !== 'undefined') {
  window.store = store;   // DEBUG
}
export default store;
