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
    selectedPipelineStepIndex: -1,
    advancedToolsOpen: true,
    exportPanelOpen: false,
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
