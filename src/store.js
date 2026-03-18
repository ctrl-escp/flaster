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
import {getSampleScript, sampleScripts} from './sampleScripts.js';

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
 *   availabilityStatus: string,
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
// Execution: ${structure.executionMode} / ${structure.availabilityStatus}
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

const templateCatalog = Object.freeze([
  {
    type: 'apply-known-transform',
    title: 'Apply known REstringer transform',
    description: 'Use the browser-safe transform exposed by the active known structure.',
    kind: 'transform',
  },
  {
    type: 'rename-identifiers',
    title: 'Rename identifiers',
    description: 'Rename selected or filtered identifiers with a reproducible template.',
    kind: 'transform',
  },
  {
    type: 'replace-literals',
    title: 'Replace literals',
    description: 'Replace matched literals with a new static value.',
    kind: 'transform',
  },
  {
    type: 'remove-dead-wrapper',
    title: 'Remove dead wrapper',
    description: 'Jump to wrapper-oriented built-in transforms when those structures are active.',
    kind: 'transform',
  },
  {
    type: 'inline-call-result',
    title: 'Inline call/result',
    description: 'Reserved for a future higher-level inlining template.',
    kind: 'planned',
  },
  {
    type: 'custom-node-selection',
    title: 'Custom node selection',
    description: 'Create a reusable node-selection filter from the current inspector context.',
    kind: 'selection',
  },
  {
    type: 'match-structure',
    title: 'Match structure',
    description: 'Seed a reusable filter from the active known structure.',
    kind: 'selection',
  },
  {
    type: 'advanced-js-step',
    title: 'Advanced JS step',
    description: 'Open the raw filter and transform editors for power-user workflows.',
    kind: 'advanced',
  },
]);

function cloneValue(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function normalizeScriptLabel(label, fallback = 'Custom script') {
  return typeof label === 'string' && label.trim().length
    ? label.trim()
    : fallback;
}

function areStringArraysEqual(left = [], right = []) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function getNodeId(node) {
  return Number.isInteger(node?.nodeId) ? node.nodeId : null;
}

function createNodeSummary(node) {
  if (!node) {
    return 'No node selected';
  }

  const bits = [node.type];
  if (typeof node.name === 'string' && node.name.length) {
    bits.push(node.name);
  } else if (typeof node.value === 'string' && node.value.length) {
    bits.push(JSON.stringify(node.value));
  } else if (typeof node.src === 'string' && node.src.length) {
    bits.push(node.src.slice(0, 60));
  }

  return bits.join(' ');
}

function createNodeAttributeEntries(node) {
  if (!node || typeof node !== 'object') {
    return [];
  }

  return Object.entries(node)
    .filter(([key, value]) =>
      !['parentNode', 'body', 'children', 'loc', 'range', 'src'].includes(key) &&
      typeof value !== 'object' &&
      typeof value !== 'function',
    )
    .slice(0, 16)
    .map(([key, value]) => ({key, value: String(value)}));
}

function createTemplateDrafts() {
  return {
    'apply-known-transform': {},
    'rename-identifiers': {
      nextName: 'renamedIdentifier',
      useSelectedName: true,
    },
    'replace-literals': {
      nextValue: '',
      valueType: 'string',
    },
    'remove-dead-wrapper': {},
    'inline-call-result': {},
    'custom-node-selection': {
      mode: 'selected-node-type',
    },
    'match-structure': {},
    'advanced-js-step': {},
  };
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
      filters: cloneValue(this.filters),
      steps: cloneValue(this.steps),
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
      this.selectedPipelineStepIndex = this.steps.length ? 0 : -1;
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

      const nextStep = this.normalizeStepEntry(stepEntry ?? {
        kind: 'custom',
        filters: this.filters.filter((f) => f.enabled),
        transformationCode: typeof transformSrc === 'string' ? transformSrc : '',
      });
      nextStep.previewSummary = nextStep.previewSummary || `${changes} pending edits applied`;
      this.steps.push(nextStep);
      this.selectedPipelineStepIndex = this.steps.length - 1;
      this.activeInspectorPanel = 'pipeline';
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
    this.markKnownStructureInputChanged();
    store.page = 0;
    this.filteredNodes = this.arb.ast;
    this.filters.length = 0;
    this.selectedNodeId = null;
    this.selectedNodeSource = null;
    this.activeResultMode = 'matches';
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
  currentScriptLabel: 'Custom script',
  currentScriptKind: 'custom',
  currentScriptBaseline: '',
  isCurrentScriptModified: true,
  // eslint-disable-next-line no-unused-vars
  logMessage(text, level) {},
  nodesPageSize: 100,
  page: 0,
  isTransformed: false,
  filteredNodes: [],
  areFiltersActive: true,
  activeWorkspaceTab: 'explorer',
  activeResultMode: 'matches',
  activeInspectorPanel: 'inspector',
  activeNodeInspectorSection: 'overview',
  selectedNodeId: null,
  selectedNodeSource: null,
  selectedPipelineStepIndex: -1,
  advancedToolsOpen: false,
  exportPanelOpen: false,
  knownStructureInputVersion: 0,
  lastKnownStructureRunInputVersion: -1,
  knownStructureSelectionVersion: 0,
  lastKnownStructureRunSelectionVersion: -1,
  availableSampleScripts: sampleScripts,
  activeSampleScriptId: sampleScripts[0]?.id ?? null,
  templateCatalog,
  activeTemplateType: 'apply-known-transform',
  templateDrafts: createTemplateDrafts(),
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
    const nextLabel = stepEntry.label ||
      (stepEntry.kind === 'known-structure-transform'
        ? `Apply ${stepEntry.structureTitle ?? stepEntry.structureId}`
        : 'Custom JS transform');

    return {
      enabled: stepEntry.enabled ?? true,
      label: nextLabel,
      templateType: stepEntry.templateType ?? (stepEntry.kind === 'known-structure-transform'
        ? 'apply-known-transform'
        : 'advanced-js-step'),
      params: stepEntry.params ?? {},
      previewSummary: stepEntry.previewSummary ?? '',
      selectionSource: stepEntry.selectionSource ?? null,
      ...stepEntry,
    };
  },
  getKnownStructureById(structureId) {
    return this.availableKnownStructures.find((structure) => structure.id === structureId) ?? null;
  },
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
    if (!Number.isInteger(this.selectedNodeId)) {
      return null;
    }

    return this.arb?.ast?.find((node) => node.nodeId === this.selectedNodeId) ?? null;
  },
  getNodeById(nodeId) {
    return this.arb?.ast?.find((node) => node.nodeId === nodeId) ?? null;
  },
  getSelectedNodeAttributes() {
    return createNodeAttributeEntries(this.getSelectedNode());
  },
  getNodeParentChain(node = this.getSelectedNode()) {
    const chain = [];
    let current = node?.parentNode ?? null;

    while (current) {
      chain.unshift(current);
      current = current.parentNode ?? null;
    }

    return chain;
  },
  getNodeScopeChain(node = this.getSelectedNode()) {
    const chain = [];
    let current = node?.parentNode ?? null;

    while (current) {
      chain.unshift(current);
      if (['Program', 'BlockStatement', 'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(current.type)) {
        break;
      }
      current = current.parentNode ?? null;
    }

    return chain;
  },
  getNodeChildren(node = this.getSelectedNode()) {
    if (!node) {
      return [];
    }

    return this.arb?.ast?.filter((candidate) => candidate.parentNode?.nodeId === node.nodeId) ?? [];
  },
  getNodeMatches(node = this.getSelectedNode()) {
    if (!node?.range) {
      return [];
    }

    return this.latestKnownStructureMatches.filter((match) =>
      doRangesOverlap(match.range, node.range),
    );
  },
  getRelatedNodes(node = this.getSelectedNode()) {
    if (!node) {
      return [];
    }

    const parent = node.parentNode ? [node.parentNode] : [];
    const children = this.getNodeChildren(node);
    const siblings = node.parentNode
      ? this.getNodeChildren(node.parentNode).filter((candidate) => candidate.nodeId !== node.nodeId)
      : [];

    return [...parent, ...children, ...siblings].slice(0, 24);
  },
  setActiveWorkspaceTab(tabName = 'explorer') {
    this.activeWorkspaceTab = tabName;
  },
  setActiveInspectorPanel(panelName = 'inspector') {
    this.activeInspectorPanel = panelName;
  },
  setActiveNodeInspectorSection(sectionName = 'overview') {
    this.activeNodeInspectorSection = sectionName;
  },
  openAdvancedTools() {
    this.advancedToolsOpen = true;
    this.activeInspectorPanel = 'advanced';
  },
  setActiveResultMode(mode = 'matches') {
    this.activeResultMode = mode;
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
      this.parseContent();
      this.logMessage(`Loaded sample: ${sample.title}`, 'success');
      return true;
    } catch (error) {
      this.logMessage(error.message, 'error');
      return false;
    }
  },
  isKnownStructureBrowserRunnable(structureId) {
    return !!this.getKnownStructureById(structureId)?.browserRunnable;
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
    const nextSelectedStructureIds = [...new Set(structureIds)].filter((structureId) =>
      availableStructureIds.has(structureId),
    );
    const selectionChanged = !areStringArraysEqual(nextSelectedStructureIds, this.selectedKnownStructureIds);

    this.selectedKnownStructureIds = nextSelectedStructureIds;

    if (selectionChanged) {
      this.knownStructureSelectionVersion += 1;
    }

    if (!this.selectedKnownStructureIds.includes(this.activeKnownStructureId)) {
      this.activeKnownStructureId = getInitialActiveStructureId(
        this.availableKnownStructures,
        this.selectedKnownStructureIds.filter((structureId) =>
          this.isKnownStructureBrowserRunnable(structureId),
        ),
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
      this.setSelectedNode(null);
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
    this.setSelectedNode(match.node, 'match');
    this.activeInspectorPanel = 'inspector';
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
  markKnownStructureInputChanged() {
    this.knownStructureInputVersion += 1;
  },
  canRunKnownStructureMatching(structureIds = this.selectedKnownStructureIds) {
    const requestedIds = Array.isArray(structureIds) ? structureIds : [];

    if (!this.arb?.ast?.length || this.knownStructureExecutionStatus.state === 'running') {
      return false;
    }

    return requestedIds.some((structureId) => this.isKnownStructureBrowserRunnable(structureId));
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
      this.filteredNodes = this.filteredNodes.filter(eval(`n => ${normalizedFilter}`));
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
  toggleFilterEnabled(filter) {
    filter.enabled = !filter.enabled;
    this.reapplyFilters();
  },
  combineEnabledFilters() {
    const enabledFilters = this.filters.filter((filter) => filter?.enabled && !!filter?.src);
    if (enabledFilters.length > 1) {
      const filterSrc = this.combineFilters(enabledFilters.map((filter) => filter.src));
      this.filters = this.filters.filter((filter) => !enabledFilters.includes(filter));
      this.addFilter(filterSrc, {
        label: 'Combined filter',
        templateType: 'advanced-js-step',
      });
    }
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
      const arb = this.arb;
      const candidateFilters = Array.isArray(metadata.filters) && metadata.filters.length
        ? metadata.filters.filter((filter) => filter?.enabled && filter?.src)
        : this.filters.filter((filter) => filter?.enabled && filter?.src);
      const candidateNodes = candidateFilters.length
        ? this.arb.ast.filter((node) =>
          candidateFilters.every((filter) => eval(`n => ${filter.src}`)(node)))
        : this.filteredNodes;

      for (const n of candidateNodes) {
        eval(normalizedSource);
      }

      const stepEntry = this.normalizeStepEntry({
        kind: 'custom',
        filters: candidateFilters,
        transformationCode: normalizedSource,
        ...metadata,
      });
      const applied = this.applyAndUpdateTransformation(normalizedSource, stepEntry);
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

    if (!structure.browserRunnable) {
      this.logMessage(structure.support.note, 'error');
      this.clearKnownStructureTransformPreview(structure.id);
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
        executionMode: structure.executionMode,
        availabilityStatus: structure.availabilityStatus,
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
        availabilityStatus: structure.availabilityStatus,
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

    if (!structure.browserRunnable) {
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
        label: `Apply ${structure.title}`,
        templateType: 'apply-known-transform',
        params: {
          structureId: structure.id,
          transformName: transformSession.transformName,
        },
        previewSummary: `${transformSession.pendingChanges ?? 0} changes across ${transformSession.targetedMatchCount} matches`,
        selectionSource: {
          kind: 'known-structure',
          structureId: structure.id,
        },
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

    const nextSteps = [...this.steps];
    [nextSteps[index], nextSteps[nextIndex]] = [nextSteps[nextIndex], nextSteps[index]];
    this.steps = nextSteps.map((step, sequenceIndex) => ({
      ...step,
      sequenceIndex: sequenceIndex + 1,
    }));
    this.selectedPipelineStepIndex = nextIndex;
  },
  togglePipelineStep(index) {
    const step = this.steps[index];
    if (!step) {
      return;
    }

    step.enabled = step.enabled === false;
  },
  removePipelineStep(index) {
    if (index < 0 || index >= this.steps.length) {
      return;
    }

    this.steps.splice(index, 1);
    this.steps = this.steps.map((step, sequenceIndex) => ({
      ...step,
      sequenceIndex: sequenceIndex + 1,
    }));
    this.selectedPipelineStepIndex = Math.min(index, this.steps.length - 1);
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
    const selectedNode = this.getSelectedNode();
    const activeStructure = this.getKnownStructureById(this.inspectedKnownStructureId ?? this.activeKnownStructureId);
    const selectionSource = selectedNode
      ? {
        kind: 'node',
        nodeId: selectedNode.nodeId,
        nodeType: selectedNode.type,
      }
      : activeStructure
        ? {
          kind: 'known-structure',
          structureId: activeStructure.id,
        }
        : null;

    if (templateType === 'apply-known-transform') {
      return this.applyKnownStructureTransform(activeStructure?.id);
    }

    if (templateType === 'remove-dead-wrapper') {
      const preferredStructure = ['iife-wrappers', 'wrapped-value-shells']
        .map((structureId) => this.getKnownStructureById(structureId))
        .find((structure) => structure?.id === activeStructure?.id) ?? activeStructure;

      if (!preferredStructure?.transformEnabled) {
        this.logMessage('Select a wrapper-oriented built-in structure before using this template', 'error');
        return false;
      }

      return this.applyKnownStructureTransform(preferredStructure.id);
    }

    if (templateType === 'match-structure') {
      const filterSrc = this.copyKnownStructureRuleSeed(activeStructure?.id);
      if (!filterSrc) {
        this.logMessage('Pick a known structure before creating a structure template', 'error');
        return false;
      }

      this.addFilter(filterSrc, {
        label: activeStructure.title,
        selectionSource,
        templateType,
      });
      this.advancedToolsOpen = true;
      this.setActiveTemplate(templateType);
      return true;
    }

    if (templateType === 'custom-node-selection') {
      const filterSrc = this.createNodeSelectionFilter();
      this.addFilter(filterSrc, {
        label: selectedNode ? `Select ${selectedNode.type}` : 'Node selection',
        selectionSource,
        templateType,
      });
      this.advancedToolsOpen = true;
      return true;
    }

    if (templateType === 'advanced-js-step') {
      this.openAdvancedTools();
      return true;
    }

    if (templateType === 'inline-call-result') {
      this.logMessage('Inline call/result is planned but not implemented yet', 'info');
      return false;
    }

    const filterSrc = this.filters.filter((filter) => filter.enabled).map((filter) => filter.src);
    const selectionFilter = filterSrc.length ? this.combineFilters(filterSrc) : this.getDefaultSelectionFilter();

    if (templateType === 'rename-identifiers') {
      const draft = this.templateDrafts['rename-identifiers'];
      const fromName = draft.useSelectedName ? selectedNode?.name : '';
      const nextName = draft.nextName?.trim();

      if (!nextName) {
        this.logMessage('Provide a replacement identifier name', 'error');
        return false;
      }

      const combinedFilter = draft.useSelectedName && fromName
        ? `${selectionFilter} && n.type === 'Identifier' && n.name === ${JSON.stringify(fromName)}`
        : `${selectionFilter} && n.type === 'Identifier'`;

      const transformSrc = `
if (n.type === 'Identifier') {
  arb.markNode(n, {...n, name: ${JSON.stringify(nextName)}});
}
`;

      return this.applyCustomTransformation(transformSrc, {
        label: draft.useSelectedName && fromName
          ? `Rename ${fromName} -> ${nextName}`
          : `Rename identifiers -> ${nextName}`,
        templateType,
        params: {
          nextName,
          fromName,
        },
        previewSummary: `Template rename over ${draft.useSelectedName && fromName ? fromName : 'filtered identifiers'}`,
        selectionSource,
        filters: [{src: combinedFilter, enabled: true}],
      });
    }

    if (templateType === 'replace-literals') {
      const draft = this.templateDrafts['replace-literals'];
      const nextValue = draft.nextValue;
      const nextLiteralValue = draft.valueType === 'number'
        ? Number(nextValue)
        : draft.valueType === 'boolean'
          ? nextValue === 'true'
          : nextValue;

      if (draft.valueType === 'number' && Number.isNaN(nextLiteralValue)) {
        this.logMessage('Provide a numeric literal value', 'error');
        return false;
      }

      const combinedFilter = `${selectionFilter} && n.type === 'Literal'`;
      const transformSrc = `
if (n.type === 'Literal') {
  arb.markNode(n, {type: 'Literal', value: ${JSON.stringify(nextLiteralValue)}});
}
`;

      return this.applyCustomTransformation(transformSrc, {
        label: `Replace literals -> ${String(nextLiteralValue)}`,
        templateType,
        params: {
          nextValue: nextLiteralValue,
          valueType: draft.valueType,
        },
        previewSummary: 'Template literal replacement across the active selection',
        selectionSource,
        filters: [{src: combinedFilter, enabled: true}],
      });
    }

    this.logMessage(`Unsupported template: ${templateType}`, 'error');
    return false;
  },
  runKnownStructureMatching(structureIds = this.selectedKnownStructureIds) {
    const requestedIds = Array.isArray(structureIds) ? structureIds : [];
    const runnableIds = requestedIds.filter((structureId) =>
      this.isKnownStructureBrowserRunnable(structureId),
    );
    const hasParsedAst = !!this.arb?.ast?.length;

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

    const session = runKnownStructureMatchingSession(this.arb, requestedIds);

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

    const restoredMatch = this.restoreKnownStructureSelection(this.activeKnownStructureId);
    this.clearKnownStructureTransformPreview();

    if (!this.inspectedKnownStructureId) {
      this.setInspectedKnownStructure(this.activeKnownStructureId);
    }

    this.setSelectedNode(restoredMatch?.node ?? null, restoredMatch ? 'match' : null);

    this.refreshKnownStructureHighlights();

    return this.knownStructureExecutionStatus;
  },
  runActiveKnownStructureMatching() {
    if (!this.activeKnownStructureId || !this.isKnownStructureBrowserRunnable(this.activeKnownStructureId)) {
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
