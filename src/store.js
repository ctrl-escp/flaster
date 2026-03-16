import {reactive} from 'vue';
import {
  createEmptyMatchGroups,
  createExecutionStatus,
  createKnownStructureState,
  getInitialActiveStructureId,
  runKnownStructureMatchingSession,
} from './integrations/restringer/matchingEngine.js';

/**
 * @typedef {import('@codemirror/view').EditorView} EditorView
 */

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
    }
  },
  applyAndUpdateTransformation(transformSrc) {
    const changes = this.arb.applyChanges();
    if (changes > 0) {
      this.transformationCode = transformSrc;
      this.steps.push({
        filters: this.filters.filter((f) => f.enabled),
        transformationCode: transformSrc,
      });
      this.logMessage(`${changes} changes were made`, 'success');
      this.loadNewScript(this.arb.script);
      return true;
    }
    this.logMessage('No changes made', 'error');
    return false;
  },
  loadNewScript(script) {
    this.setContent(this.getEditor(this.editorIds.inputCodeEditor), script);
    this.arb = new window.flast.Arborist(script);
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
  clearKnownStructureResults() {
    this.latestKnownStructureMatches = [];
    this.knownStructureMatchesById = {};
    this.knownStructureMatchCounts = {};
    this.knownStructureExecutionErrors = {};
    this.knownStructureGroupedMatches = createEmptyMatchGroups();
    this.knownStructureExecutionStatus = createExecutionStatus();
    this.lastKnownStructureRunIds = [];
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
  },
  setActiveKnownStructure(structureId) {
    if (!structureId) {
      this.activeKnownStructureId = null;
      return;
    }

    const nextActiveStructure = this.availableKnownStructures.find((structure) => structure.id === structureId);
    if (nextActiveStructure) {
      this.activeKnownStructureId = nextActiveStructure.id;
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
