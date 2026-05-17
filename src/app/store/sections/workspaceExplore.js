import {
  buildRelatedNodeEntries,
  createNodeAttributeEntries,
  listChildNodesFromFlatAst,
  listNodeParentChain,
  listNodeScopeChain,
} from '../../../domain/selection/nodeInspectorModel.js';
import {getNodeId, resolveSelectedNode} from '../../../domain/selection/nodeSelection.js';
import {sourceRangesOverlap} from '../../../domain/structures/matchNormalization.js';
import {getSampleScript, sampleScripts} from '../../../sampleScripts.js';
import {WORKSPACE_TEMPLATE_CATALOG, createWorkspaceTemplateDrafts} from '../../workspaceTemplates.js';

/**
 * Workspace tabs, results browser, node selection, and sample loading.
 * @returns {Record<string, unknown>}
 */
export function createWorkspaceExploreSection() {
  return {
    nodesPageSize: 100,
    page: 0,
    isTransformed: false,
    filteredNodes: [],
    areFiltersActive: true,
    activeWorkspaceTab: 'explorer',
    hasVisitedExploreNodes: false,
    shouldPulseCodeStructuresStage: false,
    activeResultMode: 'ast',
    activeInspectorPanel: 'browser',
    activeNodeInspectorSection: 'overview',
    selectedNodeId: null,
    /** @type {number | null} Parse run id (`parseRunSequence`) that owns `selectedNodeId`. */
    selectionParseRunId: null,
    selectedNodeSource: null,
    /** Related view: anchor node whose relatives are listed (independent of peek highlight). */
    relatedFocusNodeId: null,
    /** Related view: previous focus anchor for the back control (one level). */
    relatedFocusBackNodeId: null,
    /** Related view: node highlighted in the editor without changing the related list. */
    relatedPeekNodeId: null,
    selectedPipelineStepIndex: -1,
    advancedToolsOpen: true,
    automatePanelOpen: false,
    availableSampleScripts: sampleScripts,
    activeSampleScriptId: sampleScripts[0]?.id ?? null,
    templateCatalog: WORKSPACE_TEMPLATE_CATALOG,
    activeTemplateType: 'apply-known-transform',
    templateDrafts: createWorkspaceTemplateDrafts(),
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
    getRelatedFocusNode() {
      if (this.activeResultMode !== 'related') {
        return this.getSelectedNode();
      }

      const focusId = this.relatedFocusNodeId ?? this.selectedNodeId;
      return resolveSelectedNode(this.arb, focusId, {
        selectionParseRunId: this.selectionParseRunId,
        currentParseRunId: this.parseRunSequence,
      });
    },
    getRelatedNodeEntries(node) {
      const anchor = this.activeResultMode === 'related'
        ? this.getRelatedFocusNode()
        : (node ?? this.getSelectedNode());

      return buildRelatedNodeEntries(this.arb?.ast, anchor);
    },
    getRelatedNodes(node) {
      return this.getRelatedNodeEntries(node).map((entry) => entry.node);
    },
    clearRelatedBrowseState() {
      this.relatedFocusNodeId = null;
      this.relatedFocusBackNodeId = null;
      this.relatedPeekNodeId = null;
    },
    syncRelatedFocusFromSelection() {
      this.relatedFocusNodeId = getNodeId(this.getSelectedNode());
      this.relatedFocusBackNodeId = null;
      this.relatedPeekNodeId = null;
    },
    canRestoreRelatedFocusBack() {
      return Number.isInteger(this.relatedFocusBackNodeId);
    },
    getRelatedFocusBackNode() {
      if (!Number.isInteger(this.relatedFocusBackNodeId)) {
        return null;
      }

      return this.getNodeById(this.relatedFocusBackNodeId);
    },
    highlightNodeInEditor(node) {
      if (node?.range?.length >= 2) {
        const editor = this.getEditor(this.editorIds.inputCodeEditor);
        editor?.highlightRange?.(node.range[0], node.range[1]);
      }
    },
    peekRelatedNode(node) {
      const nodeId = getNodeId(node);
      if (!Number.isInteger(nodeId)) {
        return false;
      }

      this.relatedPeekNodeId = nodeId;
      this.highlightNodeInEditor(node);
      return true;
    },
    setRelatedFocusNode(node) {
      const nextId = getNodeId(node);
      if (!Number.isInteger(nextId)) {
        return false;
      }

      const currentFocusId = this.relatedFocusNodeId ?? getNodeId(this.getSelectedNode());
      if (Number.isInteger(currentFocusId) && currentFocusId !== nextId) {
        this.relatedFocusBackNodeId = currentFocusId;
      }

      this.relatedFocusNodeId = nextId;
      this.relatedPeekNodeId = null;
      this.setSelectedNode(node, 'related');
      return true;
    },
    restoreRelatedFocusBack() {
      if (!Number.isInteger(this.relatedFocusBackNodeId)) {
        return false;
      }

      const node = this.getNodeById(this.relatedFocusBackNodeId);
      if (!node) {
        this.relatedFocusBackNodeId = null;
        return false;
      }

      this.relatedFocusNodeId = this.relatedFocusBackNodeId;
      this.relatedFocusBackNodeId = null;
      this.relatedPeekNodeId = null;
      this.setSelectedNode(node, 'related');
      return true;
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
    /**
     * Open Explore Nodes scoped to a structure's matches (from a structure card or match reveal).
     * @param {string | null} structureId
     * @returns {boolean}
     */
    openExploreNodesForStructure(structureId) {
      if (!structureId || !this.getKnownStructureById(structureId)) {
        return false;
      }

      this.setActiveKnownStructure(structureId);
      if (this.getKnownStructureMatches(structureId).length > 0) {
        this.setActiveResultMode('matches');
      }
      this.setActiveWorkspaceTab('results');
      this.setActiveInspectorPanel('browser');
      return true;
    },
    setActiveInspectorPanel(panelName = 'browser') {
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
      const previousMode = this.activeResultMode;
      const nextMode = this.getPreferredResultMode(mode);
      this.activeResultMode = nextMode;

      if (nextMode === 'related' && previousMode !== 'related') {
        this.syncRelatedFocusFromSelection();
      } else if (previousMode === 'related' && nextMode !== 'related') {
        this.clearRelatedBrowseState();
      }
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
      this.highlightNodeInEditor(node);
    },
    inspectNode(node, source = 'ast') {
      if (!node) {
        this.setSelectedNode(null);
        return;
      }

      this.setSelectedNode(node, source);
      if (source === 'related') {
        this.activeResultMode = 'related';
        this.syncRelatedFocusFromSelection();
      }
      this.activeInspectorPanel = 'browser';
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
        await this.parseContent({
          pulseCodeStructures: true,
        });
        this.logMessage(`Sample loaded and parsed: "${sample.title}"`, 'success');
        return true;
      } catch (error) {
        this.logMessage(error.message, 'error');
        return false;
      }
    },
  };
}
