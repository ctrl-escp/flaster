import {createArborist, parseSource} from '../../domain/parse/parseSource.js';
import {createKnownStructureHighlightState} from '../../domain/selection/highlightModel.js';
import {
  buildRelatedNodeEntries,
  createNodeAttributeEntries,
  listChildNodesFromFlatAst,
  listNodeParentChain,
  listNodeScopeChain,
} from '../../domain/selection/nodeInspectorModel.js';
import {
  advanceFlatKnownStructureMatch,
  getNodeId,
  nodeForMatchSelection,
  resolveSelectedNode,
} from '../../domain/selection/nodeSelection.js';
import {sourceRangesOverlap} from '../../domain/structures/matchNormalization.js';
import {createCustomStructureDescriptor} from '../../domain/structures/customStructures.js';
import {
  compileNodePredicate,
  normalizeCustomTransformRunSettings,
  runCustomTransformExecution,
} from '../../domain/transforms/customTransformRuntime.js';
import {
  finalizePipelineStepForStorage,
  getPipelineSaveWarningForStructure,
  getPipelineSaveWarningForTransformBody,
  getPipelineStepStructureId as getPipelineStepStructureIdFromModel,
  normalizePipelineStepEntry,
  pipelineStepsReferenceStructureId,
} from '../../domain/pipeline/pipelineModel.js';
import {addStep, moveStepAtIndex, setStepEnabledAtIndex} from '../../domain/pipeline/pipelineMutations.js';
import {replayPipeline} from '../../domain/pipeline/pipelineReplay.js';
import {
  createPipelineStepExecutor,
  getOutermostMatchedNodes,
  normalizeDeleteStructureRunSettings as normalizeDeleteStructureRunSettingsFromPipeline,
} from '../../domain/pipeline/pipelineStepRunner.js';
import {executeKnownStructureTransformApply} from '../../domain/transforms/transformExecutor.js';
import {
  createEmptyMatchGroups,
  createExecutionStatus,
  createKnownStructureState,
  detectStructures,
  groupStructureMatches,
} from '../../integrations/restringer/matchingEngine.js';
import {
  collectKnownStructureMatchNodes,
  describeKnownStructureMatchShape,
  runKnownStructureTransformSession,
} from '../../integrations/restringer/index.js';
import {getSampleScript, sampleScripts} from '../../sampleScripts.js';
import {
  WORKSPACE_TEMPLATE_CATALOG,
  createKnownStructureRuleSeed,
  createWorkspaceTemplateDrafts,
} from '../workspaceTemplates.js';
import {
  areStringArraysEqual,
  cloneValue,
  combineFilterSources,
  normalizeScriptLabel,
} from './storeUtils.js';

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
 *   executionMode: string,
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
 * Reactive store blueprint (plain object). Wrap with `reactive()` in `createAppStore`.
 *
 * @param {ReturnType<typeof createKnownStructureState>} knownStructureState
 */
export function createStoreBlueprint(knownStructureState) {
  return {
  /* --- UI shell (panes, workspace chrome, inspector layout) --- */
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
  getEditor(editorId) {
    return this.editors.find((e) => e.editorId === editorId);
  },
  setContent(editor, content) {
    editor.dispatch({
      changes: [
        {from: 0, to: editor.state.doc.length},
        {from: 0, insert: content},
      ],
    });
  },
  /* --- Source / parse / script metadata --- */
  ast: [],
  arb: {ast: []},
  states: [],
  saveState() {
    // noinspection JSUnresolvedReference
    this.states.push({
      script: this.arb.script,
      filters: cloneValue(this.filters),
      steps: cloneValue(this.steps),
      transformationCode: this.transformationCode,
    });
  },
  revertState() {
    if (this.states.length) {
      const state = this.states.pop();
      // noinspection JSValidateTypes
      this.loadNewScript(state.script);
      this.filters = state.filters;
      this.steps = state.steps;
      this.transformationCode = state.transformationCode;
      this.clearKnownStructureTransformPreview();
      this.selectedPipelineStepIndex = this.steps.length ? this.steps.length - 1 : -1;
      this.logMessage('Reverted the last applied change', 'info');
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
  applyAndUpdateTransformation(transformSrc, stepEntry = null, appliedChangesOverride = null) {
    const changes = Number.isInteger(appliedChangesOverride)
      ? appliedChangesOverride
      : this.arb.applyChanges();
    if (changes > 0) {
      if (typeof transformSrc === 'string') {
        this.transformationCode = transformSrc;
      }

      const nextStep = this.normalizeStepEntry(stepEntry ?? {
        kind: 'custom',
        filters: this.filters.filter((f) => f.enabled),
        transformationCode: typeof transformSrc === 'string' ? transformSrc : '',
      });
      nextStep.previewSummary = nextStep.previewSummary || `${changes} pending edits applied`;
      this.steps = addStep(this.steps, nextStep);
      this.selectedPipelineStepIndex = this.steps.length - 1;
      this.activeInspectorPanel = 'pipeline';
      this.logMessage(`${changes} changes were made`, 'success');
      this.loadNewScript(this.arb.script);
      return true;
    }
    this.logMessage('No changes made', 'error');
    return false;
  },
  addPipelineStep(stepEntry, message = 'Step added to pipeline') {
    const nextStep = this.normalizeStepEntry(stepEntry);

    this.steps = addStep(this.steps, nextStep);
    this.selectedPipelineStepIndex = this.steps.length - 1;
    this.activeInspectorPanel = 'pipeline';
    this.logMessage(message, 'success');
    return true;
  },
  loadNewScript(script) {
    const inputEditor = this.getEditor(this.editorIds.inputCodeEditor);

    if (inputEditor) {
      this.setContent(inputEditor, script);
    }

    const parseRunId = this.bumpParseRunSequence();
    const parseResult = parseSource(script, {parseRunId});
    this.arb = parseResult.arborist ?? {ast: [], script: typeof script === 'string' ? script : String(script ?? '')};
    this.markKnownStructureInputChanged();
    this.page = 0;
    this.filteredNodes = this.arb.ast;
    this.filters.length = 0;
    this.setSelectedNode(null);
    this.activeResultMode = 'ast';
    this.markCurrentInputParsed();
    this.runKnownStructureMatching();
  },
  /* --- AST filters & result list --- */
  combineFilters(filtersArr) {
    return combineFilterSources(filtersArr);
  },
  /* --- Pipeline & persisted transforms --- */
  steps: [],
  filters: [],
  transformationCode: '',
  currentScriptLabel: 'Custom script',
  currentScriptKind: 'custom',
  currentScriptBaseline: '',
  isCurrentScriptModified: true,
  inputContentVersion: 0,
  parsedContentVersion: -1,
  parseRunSequence: 0,
  bumpParseRunSequence() {
    this.parseRunSequence += 1;
    return this.parseRunSequence;
  },
  shouldAutoParseInitialInput: true,
  // eslint-disable-next-line no-unused-vars
  logMessage(text, level) {},
  tryAutoParseInitialInput() {
    return false;
  },
  nodesPageSize: 100,
  page: 0,
  isTransformed: false,
  filteredNodes: [],
  areFiltersActive: true,
  activeWorkspaceTab: 'explorer',
  hasVisitedExploreNodes: false,
  shouldPulseCodeStructuresStage: false,
  activeResultMode: 'ast',
  activeInspectorPanel: 'inspector',
  activeNodeInspectorSection: 'overview',
  selectedNodeId: null,
  /** @type {number | null} Parse run id (`parseRunSequence`) that owns `selectedNodeId`. */
  selectionParseRunId: null,
  selectedNodeSource: null,
  selectedPipelineStepIndex: -1,
  advancedToolsOpen: true,
  exportPanelOpen: false,
  knownStructureInputVersion: 0,
  lastKnownStructureRunInputVersion: -1,
  knownStructureSelectionVersion: 0,
  lastKnownStructureRunSelectionVersion: -1,
  availableSampleScripts: sampleScripts,
  activeSampleScriptId: sampleScripts[0]?.id ?? null,
  templateCatalog: WORKSPACE_TEMPLATE_CATALOG,
  activeTemplateType: 'apply-known-transform',
  templateDrafts: createWorkspaceTemplateDrafts(),
  /* --- Known-structure catalog & match state (shared refs on knownStructureState) --- */
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
  normalizeStepEntry(stepEntry = {}) {
    return finalizePipelineStepForStorage(normalizePipelineStepEntry(stepEntry), {});
  },
  getKnownStructureById(structureId) {
    return this.availableKnownStructures.find((structure) => structure.id === structureId) ?? null;
  },
  /* --- Selection & node inspection --- */
  getCurrentScriptContent() {
    const editorContent = this.getEditor(this.editorIds.inputCodeEditor)?.state?.doc?.toString();

    if (typeof editorContent === 'string') {
      return editorContent;
    }

    if (typeof this.arb?.script === 'string') {
      return this.arb.script;
    }

    return '';
  },
  updateCurrentScriptDirtyState(content = this.getCurrentScriptContent()) {
    this.isCurrentScriptModified = content !== this.currentScriptBaseline;
  },
  handleInputEditorChange() {
    this.inputContentVersion += 1;

    if (this.parsedContentVersion !== -1 || this.arb?.ast?.length) {
      this.resetParsedState();
    }
  },
  markCurrentInputParsed() {
    this.parsedContentVersion = this.inputContentVersion;
  },
  hasParsableInput() {
    return this.getCurrentScriptContent().trim().length > 0;
  },
  isCurrentInputParsed() {
    return this.hasParsableInput() && this.parsedContentVersion === this.inputContentVersion;
  },
  canParseCurrentInput() {
    return this.hasParsableInput() && !this.isCurrentInputParsed();
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
  setCurrentScriptSource({
    kind = 'custom',
    label = 'Custom script',
    baselineContent = this.getCurrentScriptContent(),
  } = {}) {
    this.currentScriptKind = kind;
    this.currentScriptLabel = normalizeScriptLabel(label);
    this.currentScriptBaseline = typeof baselineContent === 'string' ? baselineContent : '';
    this.isCurrentScriptModified = false;
  },
  markCurrentScriptAsCustom(content = this.getCurrentScriptContent()) {
    this.currentScriptKind = 'custom';
    this.currentScriptLabel = 'Custom script';
    this.updateCurrentScriptDirtyState(content);
  },
  getCurrentScriptDisplayName() {
    return this.isCurrentScriptModified
      ? `${this.currentScriptLabel}*`
      : this.currentScriptLabel;
  },
  getSelectedNode() {
    return resolveSelectedNode(this.arb, this.selectedNodeId, {
      selectionParseRunId: this.selectionParseRunId,
      currentParseRunId: this.parseRunSequence,
    });
  },
  getNodeById(nodeId) {
    return this.arb?.ast?.find((node) => node.nodeId === nodeId) ?? null;
  },
  getSelectedNodeAttributes() {
    return createNodeAttributeEntries(this.getSelectedNode());
  },
  getNodeParentChain(node = this.getSelectedNode()) {
    return listNodeParentChain(node);
  },
  getNodeScopeChain(node = this.getSelectedNode()) {
    return listNodeScopeChain(node);
  },
  getNodeChildren(node = this.getSelectedNode()) {
    return listChildNodesFromFlatAst(this.arb?.ast, node);
  },
  getNodeMatches(node = this.getSelectedNode()) {
    if (!node?.range) {
      return [];
    }

    return this.latestKnownStructureMatches.filter((match) =>
      sourceRangesOverlap(match.relevantNode?.range, node.range),
    );
  },
  getRelatedNodeEntries(node = this.getSelectedNode()) {
    return buildRelatedNodeEntries(this.arb?.ast, node);
  },
  getRelatedNodes(node = this.getSelectedNode()) {
    return this.getRelatedNodeEntries(node).map((entry) => entry.node);
  },
  hasResultModeContent(mode = 'ast') {
    if (mode === 'ast') {
      return (this.areFiltersActive ? this.filteredNodes : this.arb?.ast ?? []).length > 0;
    }

    if (mode === 'matches') {
      return this.latestKnownStructureMatches.length > 0;
    }

    if (mode === 'related') {
      return this.getRelatedNodes().length > 0;
    }

    return false;
  },
  getPreferredResultMode(preferredMode = 'ast') {
    if (this.hasResultModeContent(preferredMode)) {
      return preferredMode;
    }

    return ['ast', 'matches', 'related'].find((mode) => this.hasResultModeContent(mode)) ?? 'ast';
  },
  setActiveWorkspaceTab(tabName = 'explorer') {
    this.activeWorkspaceTab = tabName;

    if (tabName === 'results') {
      this.hasVisitedExploreNodes = true;
      this.activeResultMode = this.getPreferredResultMode(this.activeResultMode);
    }
  },
  setActiveInspectorPanel(panelName = 'inspector') {
    this.activeInspectorPanel = panelName;
  },
  setActiveNodeInspectorSection(sectionName = 'overview') {
    this.activeNodeInspectorSection = sectionName;
  },
  openAdvancedTools() {
    this.advancedToolsOpen = true;
    this.activeInspectorPanel = 'templates';
  },
  setActiveResultMode(mode = 'ast') {
    this.activeResultMode = this.getPreferredResultMode(mode);
  },
  setActiveTemplate(templateType = 'apply-known-transform') {
    this.activeTemplateType = this.templateCatalog.some((template) => template.type === templateType)
      ? templateType
      : 'apply-known-transform';
    this.activeInspectorPanel = 'templates';
  },
  updateTemplateDraft(templateType, key, value) {
    if (!this.templateDrafts[templateType]) {
      this.templateDrafts[templateType] = {};
    }

    this.templateDrafts[templateType][key] = value;
  },
  setSelectedNode(node, source = 'ast') {
    const nodeId = getNodeId(node);
    this.selectedNodeId = nodeId;
    this.selectedNodeSource = nodeId === null ? null : source;
    this.selectionParseRunId = nodeId === null ? null : this.parseRunSequence;

    if (node?.range?.length >= 2) {
      const editor = this.getEditor(this.editorIds.inputCodeEditor);
      editor?.highlightRange?.(node.range[0], node.range[1]);
    }
  },
  inspectNode(node, source = 'ast') {
    if (!node) {
      this.setSelectedNode(null);
      return;
    }

    this.setSelectedNode(node, source);
    this.activeResultMode = source === 'related' ? 'related' : this.activeResultMode;
    this.activeInspectorPanel = 'inspector';
  },
  async loadSampleScript(sampleId = this.activeSampleScriptId) {
    const sample = getSampleScript(sampleId);

    if (!sample) {
      this.logMessage('Unknown sample script', 'error');
      return false;
    }

    const inputEditor = this.getEditor(this.editorIds.inputCodeEditor);
    if (!inputEditor) {
      this.logMessage('Editor is not ready yet', 'error');
      return false;
    }

    try {
      const response = await fetch(sample.publicPath);
      if (!response.ok) {
        throw new Error(`Unable to load ${sample.title}`);
      }

      const source = await response.text();
      this.activeSampleScriptId = sample.id;
      this.setContent(inputEditor, source);
      this.setCurrentScriptSource({
        kind: 'sample',
        label: sample.title,
        baselineContent: source,
      });
      this.parseContent({
        pulseCodeStructures: true,
      });
      this.logMessage(`Sample loaded and parsed: "${sample.title}"`, 'success');
      return true;
    } catch (error) {
      this.logMessage(error.message, 'error');
      return false;
    }
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
  setSelectedKnownStructureMatch(structureId, matchIndex, revealInInspector = true) {
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
      this.activeInspectorPanel = 'inspector';
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

    if (!this.arb?.ast?.length || this.knownStructureExecutionStatus.state === 'running') {
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
  /* --- Custom filters & transform / template application --- */
  findFilter(filterSrc) {
    return this.filters.find((filter) => filter?.src === filterSrc);
  },
  addFilter(filterSrc, options = {}) {
    if (!filterSrc) {
      this.logMessage('Missing filter code', 'error');
      return false;
    }

    try {
      const normalizedFilter = filterSrc.trim();
      const predicate = compileNodePredicate(normalizedFilter);
      this.filteredNodes = this.filteredNodes.filter((node) => predicate(node));
      if (!this.findFilter(normalizedFilter)) {
        this.filters.push({
          src: normalizedFilter,
          enabled: options.enabled ?? true,
          label: options.label ?? '',
          selectionSource: options.selectionSource ?? null,
          templateType: options.templateType ?? null,
        });
      }
      this.page = 0;
      return true;
    } catch (error) {
      this.logMessage(`Invalid filter code: ${error.message}`, 'error');
      return false;
    }
  },
  reapplyFilters() {
    this.filteredNodes = this.arb?.ast ?? [];
    for (const filter of this.filters) {
      if (filter?.enabled) {
        this.addFilter(filter.src, filter);
      }
    }
    this.page = 0;
  },
  clearAllFilters() {
    this.filters.length = 0;
    this.filteredNodes = this.arb?.ast ?? [];
    this.page = 0;
  },
  deleteFilter(filterToDelete) {
    this.filters = this.filters.filter((filter) => filter !== filterToDelete);
    this.reapplyFilters();
  },
  addCustomKnownStructure(title, filterSrc, category = 'custom') {
    const normalizedTitle = String(title || '').trim() || 'Custom Structure';
    const normalizedFilter = String(filterSrc || '').trim();
    const normalizedCategory = String(category || '').trim() || 'custom';

    if (!normalizedFilter) {
      this.logMessage('Missing structure rule', 'error');
      return false;
    }

    try {
      const nextStructure = createCustomStructureDescriptor(normalizedTitle, normalizedFilter, normalizedCategory);
      this.availableKnownStructures = [...this.availableKnownStructures, nextStructure];
      this.selectedKnownStructureIds = [...new Set([...this.selectedKnownStructureIds, nextStructure.id])];
      this.activeKnownStructureId = nextStructure.id;
      this.setInspectedKnownStructure(nextStructure.id);
      this.knownStructureSelectionVersion += 1;
      this.logMessage(`Added custom structure: "${nextStructure.title}"`, 'success');
      return nextStructure;
    } catch (error) {
      this.logMessage(`Invalid structure rule: ${error.message}`, 'error');
      return false;
    }
  },
  toggleFilterEnabled(filter) {
    filter.enabled = !filter.enabled;
    this.reapplyFilters();
  },
  combineEnabledFilters() {
    const enabledFilters = this.filters.filter((filter) => filter?.enabled && Boolean(filter?.src));
    if (enabledFilters.length > 1) {
      const filterSrc = this.combineFilters(enabledFilters.map((filter) => filter.src));
      this.filters = this.filters.filter((filter) => !enabledFilters.includes(filter));
      this.addFilter(filterSrc, {
        label: 'Combined filter',
        templateType: 'advanced-js-step',
      });
    }
  },
  normalizeDeleteStructureRunSettings(metadata = {}) {
    return normalizeDeleteStructureRunSettingsFromPipeline(
      metadata,
      this.templateDrafts['delete-structure-matches'] ?? {},
    );
  },
  applyCustomTransformation(transformSrc, metadata = {}) {
    const source = transformSrc || this.getEditor(this.editorIds.transformEditor)?.state?.doc?.toString();
    if (!source) {
      this.logMessage('Missing transformation code', 'error');
      return false;
    }

    this.saveState();

    try {
      const normalizedSource = source.trim();
      const candidateFilters = Array.isArray(metadata.filters) && metadata.filters.length
        ? metadata.filters.filter((filter) => filter?.enabled && filter?.src)
        : this.filters.filter((filter) => filter?.enabled && filter?.src);
      const structureId = metadata?.selectionSource?.kind === 'known-structure'
        ? metadata.selectionSource.structureId
        : metadata?.params?.structureId;
      const runSettings = normalizeCustomTransformRunSettings(
        metadata,
        this.templateDrafts['advanced-js-step'] ?? {},
      );
      const result = runCustomTransformExecution(this.arb, {
        body: normalizedSource,
        structureId: structureId ?? null,
        candidateFilters,
        runSettings,
      });

      if (!result.isDone) {
        this.states.pop();
        this.logMessage(`Invalid transformer code: ${result.error?.message ?? 'Unknown error'}`, 'error');
        return false;
      }

      const totalChanges = result.changesCount;
      const iterationCount = result.executedIterations ?? 0;

      const stepEntry = this.normalizeStepEntry({
        kind: 'custom',
        filters: candidateFilters,
        transformationCode: normalizedSource,
        ...metadata,
        runMode: runSettings.runMode,
        maxIterations: runSettings.maxIterations,
        params: {
          ...(metadata.params ?? {}),
          runMode: runSettings.runMode,
          maxIterations: runSettings.maxIterations,
          executedIterations: iterationCount,
          appliedChanges: totalChanges,
        },
      });
      stepEntry.previewSummary = metadata.previewSummary ??
        (runSettings.runMode === 'once'
          ? `Custom transform ran once${totalChanges > 0 ? '' : ' with no changes'}`
          : runSettings.runMode === 'count'
            ? `Custom transform ran ${iterationCount}/${runSettings.maxIterations} times`
            : `Custom transform ran ${iterationCount} time${iterationCount === 1 ? '' : 's'} until stable`);
      const applied = this.applyAndUpdateTransformation(normalizedSource, stepEntry, totalChanges);
      if (!applied) {
        this.states.pop();
      }
      return applied;
    } catch (error) {
      this.states.pop();
      this.logMessage(`Invalid transformer code: ${error.message}`, 'error');
      return false;
    }
  },
  /**
   * Builds a lightweight preview for a safe known-structure transform
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

    if (structure.executionMode !== 'no-eval') {
      this.logMessage(structure.support.note, 'error');
      this.clearKnownStructureTransformPreview(structure.id);
      return null;
    }

    if (!structure.transformEnabled) {
      this.logMessage(`${structure.title} does not expose a safe transform`, 'error');
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
        executionMode: structure.executionMode,
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
        executionMode: structure.executionMode,
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
   * Applies a safe known-structure transform to the current script
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

    if (structure.executionMode !== 'no-eval') {
      this.logMessage(structure.support.note, 'error');
      return false;
    }

    const preview = this.getKnownStructureTransformPreview(structure.id) ??
      this.previewKnownStructureTransform(structure.id);

    if (!preview || preview.error) {
      return false;
    }

    this.saveState();

    try {
      const transformResult = executeKnownStructureTransformApply(this.arb, structure.id);

      if (!transformResult.isDone || transformResult.changesCount < 1) {
        this.states.pop();
        this.logMessage(
          transformResult.error?.message ?? `${structure.title} did not produce any pending changes`,
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
        transformName: transformResult.transformName,
        affectedMatchCount: transformResult.targetedMatchCount ?? 0,
        appliedChanges: transformResult.changesCount,
        appliedAt: new Date().toISOString(),
        sequenceIndex: this.steps.length + 1,
        label: `Apply ${structure.title}`,
        templateType: 'apply-known-transform',
        params: {
          structureId: structure.id,
          transformName: transformResult.transformName,
        },
        previewSummary: `${transformResult.changesCount} changes across ${transformResult.targetedMatchCount ?? 0} matches`,
        selectionSource: {
          kind: 'known-structure',
          structureId: structure.id,
        },
      };

      const applied = this.applyAndUpdateTransformation(
        null,
        stepEntry,
        transformResult.changesCount,
      );

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
  applyDeleteStructureMatches(
    structureId = this.inspectedKnownStructureId ?? this.activeKnownStructureId,
  ) {
    const structure = this.getKnownStructureById(structureId);
    const matches = this.getKnownStructureMatches(structureId);
    const matchedNodes = this.getKnownStructureMatchNodes(structureId);
    const runSettings = this.normalizeDeleteStructureRunSettings();

    if (!structure || !matches.length || !matchedNodes.length) {
      this.logMessage('Pick a matched structure before deleting its matches', 'error');
      return false;
    }

    this.saveState();

    try {
      let totalDeletedMatches = 0;
      let iterationCount = 0;
      const shouldContinue = () => runSettings.runMode === 'until-stable' ||
        (runSettings.runMode === 'count' && iterationCount < runSettings.maxIterations) ||
        (runSettings.runMode === 'once' && iterationCount < 1);

      while (shouldContinue()) {
        const nextMatchedNodes = this.getKnownStructureMatchNodes(structureId);
        if (!nextMatchedNodes.length) {
          break;
        }

        for (const node of nextMatchedNodes) {
          if (!node) {
            continue;
          }
          this.arb.markNode(node);
        }

        const changes = this.arb.applyChanges();
        if (changes < 1) {
          break;
        }

        totalDeletedMatches += nextMatchedNodes.length;
        iterationCount += 1;
        this.loadNewScript(this.arb.script);
        this.runKnownStructureMatching();
      }

      const stepEntry = {
        kind: 'custom',
        filters: [],
        transformationCode: '',
        label: `Delete ${structure.title} matches`,
        templateType: 'delete-structure-matches',
        runMode: runSettings.runMode,
        maxIterations: runSettings.maxIterations,
        params: {
          structureId: structure.id,
          deletedMatches: totalDeletedMatches,
          runMode: runSettings.runMode,
          maxIterations: runSettings.maxIterations,
          executedIterations: iterationCount,
        },
        previewSummary: runSettings.runMode === 'once'
          ? `Delete ${totalDeletedMatches} matched nodes in 1 pass`
          : runSettings.runMode === 'count'
            ? `Delete ${totalDeletedMatches} matched nodes across ${iterationCount}/${runSettings.maxIterations} passes`
            : `Delete ${totalDeletedMatches} matched nodes until no more remained`,
        selectionSource: {
          kind: 'known-structure',
          structureId: structure.id,
        },
      };

      const applied = this.applyAndUpdateTransformation(null, stepEntry, totalDeletedMatches);
      if (!applied) {
        this.states.pop();
      }
      return applied;
    } catch (error) {
      this.states.pop();
      this.logMessage(`Unable to delete ${structure.title} matches: ${error.message}`, 'error');
      return false;
    }
  },
  applyIsolateStructureMatches(
    structureId = this.inspectedKnownStructureId ?? this.activeKnownStructureId,
  ) {
    const structure = this.getKnownStructureById(structureId);
    const matchedNodes = this.getKnownStructureMatchNodes(structureId);
    const programNode = this.arb?.ast?.find((node) => node.type === 'Program');

    if (!structure || !matchedNodes.length || !programNode) {
      this.logMessage('Pick a matched structure before isolating its matches', 'error');
      return false;
    }

    this.saveState();

    try {
      const isolatedNodes = getOutermostMatchedNodes(matchedNodes)
        .filter(Boolean);

      this.arb.markNode(programNode, {
        type: 'Program',
        sourceType: programNode.sourceType,
        body: [{
          type: 'BlockStatement',
          body: isolatedNodes,
        }],
      });

      const stepEntry = {
        kind: 'custom',
        filters: [],
        transformationCode: '',
        label: `Isolate ${structure.title} matches`,
        templateType: 'isolate-structure-matches',
        params: {
          structureId: structure.id,
          isolatedMatches: isolatedNodes.length,
        },
        previewSummary: `Keep only ${isolatedNodes.length} matched nodes inside a block`,
        selectionSource: {
          kind: 'known-structure',
          structureId: structure.id,
        },
      };

      const applied = this.applyAndUpdateTransformation(null, stepEntry);
      if (!applied) {
        this.states.pop();
      }
      return applied;
    } catch (error) {
      this.states.pop();
      this.logMessage(`Unable to isolate ${structure.title} matches: ${error.message}`, 'error');
      return false;
    }
  },
  applyNoTransformStep(
    structureId = this.inspectedKnownStructureId ?? this.activeKnownStructureId,
  ) {
    const structure = this.getKnownStructureById(structureId);
    const matches = this.getKnownStructureMatches(structureId);

    if (!structure || !matches.length) {
      this.logMessage('Pick a matched structure before exporting a no-transform step', 'error');
      return false;
    }

    return this.addPipelineStep({
      kind: 'custom',
      filters: [],
      transformationCode: '',
      label: `${structure.title} (No Transform)`,
      templateType: 'no-transform',
      runMode: 'once',
      maxIterations: 1,
      params: {
        structureId: structure.id,
        exportedMatchCount: matches.length,
        runMode: 'once',
        maxIterations: 1,
      },
      previewSummary: `Export-only scaffold for ${matches.length} matches`,
      selectionSource: {
        kind: 'known-structure',
        structureId: structure.id,
      },
    }, `Added ${structure.title} as a no-transform export step`);
  },
  getPipelineStep(index = this.selectedPipelineStepIndex) {
    return this.steps[index] ?? null;
  },
  setSelectedPipelineStep(index = -1) {
    this.selectedPipelineStepIndex = index >= 0 && index < this.steps.length ? index : -1;
    if (this.selectedPipelineStepIndex !== -1) {
      this.activeInspectorPanel = 'pipeline';
    }
  },
  movePipelineStep(index, direction) {
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || index >= this.steps.length || nextIndex >= this.steps.length) {
      return;
    }

    this.steps = moveStepAtIndex(this.steps, index, direction);
    this.selectedPipelineStepIndex = nextIndex;
  },
  togglePipelineStep(index) {
    const step = this.steps[index];
    if (!step) {
      return;
    }

    const enabled = step.enabled !== false;
    this.steps = setStepEnabledAtIndex(this.steps, index, !enabled);
  },
  getPipelineReplayBaseScript() {
    const firstSavedState = this.states[0];

    if (typeof firstSavedState?.script === 'string') {
      return firstSavedState.script;
    }

    if (typeof this.currentScriptBaseline === 'string' && this.currentScriptBaseline.length) {
      return this.currentScriptBaseline;
    }

    return this.getCurrentScriptContent();
  },
  getPipelineStepStructureId(step = null) {
    return getPipelineStepStructureIdFromModel(step);
  },
  /**
   * Confirms replay messaging when a catalog definition change would invalidate the current script.
   *
   * @param {string} structureId
   * @returns {boolean}
   */
  confirmStructureCatalogMutationIfPipelineAffected(structureId) {
    const warning = getPipelineSaveWarningForStructure(this.steps, structureId);
    if (!warning) {
      return true;
    }

    return this.confirmPipelineReplay(warning);
  },
  /**
   * @param {string} transformationCode
   * @returns {boolean}
   */
  confirmTransformBodyMutationIfPipelineAffected(transformationCode) {
    const warning = getPipelineSaveWarningForTransformBody(this.steps, transformationCode);
    if (!warning) {
      return true;
    }

    return this.confirmPipelineReplay(warning);
  },
  /**
   * @param {string} structureId
   * @returns {boolean}
   */
  pipelineReferencesStructureId(structureId) {
    return pipelineStepsReferenceStructureId(this.steps, structureId);
  },
  confirmPipelineReplay(message) {
    if (typeof window?.confirm === 'function') {
      return window.confirm(message);
    }

    return true;
  },
  replayPipelineSteps(nextSteps, {
    selectedPipelineStepIndex = -1,
    activeStructureId = null,
    activeTemplateType = null,
    successMessage = 'Pipeline rebuilt',
  } = {}) {
    const baseScript = this.getPipelineReplayBaseScript();
    const normalizedSteps = nextSteps.map((step, index) => ({
      ...this.normalizeStepEntry(step),
      sequenceIndex: index + 1,
    }));
    const executor = createPipelineStepExecutor(this.templateDrafts);
    const replay = replayPipeline({
      baselineSource: baseScript,
      steps: normalizedSteps,
      executor,
    });

    if (!replay.ok) {
      this.logMessage(`Unable to rebuild pipeline: ${replay.error.message}`, 'error');
      return false;
    }

    let transformationCode = '';
    for (const step of normalizedSteps) {
      if (step?.enabled === false) {
        continue;
      }

      const body = typeof step.transformationCode === 'string' ? step.transformationCode.trim() : '';
      if (!body.length) {
        continue;
      }

      const templateType = step.templateType ?? '';
      if (templateType === 'advanced-js-step' || step.kind === 'custom') {
        transformationCode = body;
      }
    }

    const nextScript = replay.source;

    this.states = [];
    this.loadNewScript(nextScript);
    this.steps = normalizedSteps;
    this.transformationCode = transformationCode;
    this.selectedPipelineStepIndex = selectedPipelineStepIndex >= 0 &&
      selectedPipelineStepIndex < this.steps.length
      ? selectedPipelineStepIndex
      : this.steps.length
        ? this.steps.length - 1
        : -1;

    if (activeStructureId) {
      this.setActiveKnownStructure(activeStructureId);
      this.setInspectedKnownStructure(activeStructureId);
    }

    if (activeTemplateType) {
      this.setActiveTemplate(activeTemplateType);
    }

    this.logMessage(successMessage, 'success');
    return true;
  },
  editPipelineStep(index) {
    if (index < 0 || index >= this.steps.length) {
      return false;
    }

    const step = this.steps[index];
    const structureId = this.getPipelineStepStructureId(step);
    const templateType = this.templateCatalog.some((template) => template.type === step.templateType)
      ? step.templateType
      : 'advanced-js-step';
    const confirmed = this.confirmPipelineReplay(
      'Editing this pipeline item will reparse the script, restore the original code, and reapply all pipeline items that came before it. Continue?',
    );

    if (!confirmed) {
      return false;
    }

    const replayed = this.replayPipelineSteps(this.steps.slice(0, index), {
      selectedPipelineStepIndex: this.steps.slice(0, index).length - 1,
      activeStructureId: structureId,
      activeTemplateType: templateType,
      successMessage: 'Rebuilt the script up to the selected pipeline item',
    });

    if (!replayed) {
      return false;
    }

    this.activeInspectorPanel = 'templates';
    this.logMessage('Choose a replacement transform for this structure', 'info');
    return true;
  },
  removePipelineStep(index) {
    if (index < 0 || index >= this.steps.length) {
      return false;
    }

    const confirmed = this.confirmPipelineReplay(
      'Deleting this pipeline item will reparse the script and reapply all of the other pipeline items. Continue?',
    );

    if (!confirmed) {
      return false;
    }

    const nextSteps = this.steps.filter((_, stepIndex) => stepIndex !== index);
    return this.replayPipelineSteps(nextSteps, {
      selectedPipelineStepIndex: Math.min(index, nextSteps.length - 1),
      successMessage: 'Removed the pipeline item and rebuilt the script',
    });
  },
  getDefaultSelectionFilter() {
    const selectedNode = this.getSelectedNode();
    if (selectedNode?.type) {
      return `n.type === ${JSON.stringify(selectedNode.type)}`;
    }

    if (this.activeKnownStructureId) {
      const structure = this.getKnownStructureById(this.activeKnownStructureId);
      return `n.type === ${JSON.stringify(structure?.category === 'calls' ? 'CallExpression' : 'Identifier')}`;
    }

    return 'true';
  },
  createNodeSelectionFilter() {
    const selectedNode = this.getSelectedNode();
    if (!selectedNode) {
      return this.getDefaultSelectionFilter();
    }

    if (selectedNode.type === 'Identifier' && typeof selectedNode.name === 'string') {
      return `n.type === 'Identifier' && n.name === ${JSON.stringify(selectedNode.name)}`;
    }

    if (selectedNode.type === 'Literal') {
      return `n.type === 'Literal' && n.value === ${JSON.stringify(selectedNode.value)}`;
    }

    return `n.type === ${JSON.stringify(selectedNode.type)}`;
  },
  applyTemplate(templateType = this.activeTemplateType) {
    const activeStructure = this.getKnownStructureById(this.inspectedKnownStructureId ?? this.activeKnownStructureId);

    if (templateType === 'apply-known-transform') {
      return this.applyKnownStructureTransform(activeStructure?.id);
    }

    if (templateType === 'advanced-js-step') {
      this.openAdvancedTools();
      return true;
    }

    if (templateType === 'no-transform') {
      return this.applyNoTransformStep(activeStructure?.id);
    }

    if (templateType === 'delete-structure-matches') {
      return this.applyDeleteStructureMatches(activeStructure?.id);
    }

    if (templateType === 'isolate-structure-matches') {
      return this.applyIsolateStructureMatches(activeStructure?.id);
    }

    return false;
  },
  runKnownStructureMatching(structureIds = this.selectedKnownStructureIds) {
    const requestedIds = Array.isArray(structureIds) ? structureIds : [];
    const runnableIds = requestedIds.filter((structureId) =>
      this.isKnownStructureRunnable(structureId),
    );
    const hasParsedAst = Boolean(this.arb?.ast?.length);

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
  // placeholders
  resetParsedState() {},
  parseContent() {},
  };
}
