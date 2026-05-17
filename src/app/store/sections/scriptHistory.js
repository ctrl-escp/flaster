/** @import {ASTNode, Arborist} from '../../../flastTypes.js' */
import {loadRestringerIntegration} from '../../../integrations/restringer/index.js';
import {buildHydratedKnownStructureCatalog} from '../../../domain/apiInteractions/index.js';
import {cloneValue, normalizeScriptLabel} from '../storeUtils.js';

/**
 * Parsed source, undo stack, and script metadata shared across the workbench.
 * @returns {Record<string, unknown>}
 */
export function createScriptHistorySection() {
  return {
    ast: [],
    arb: {ast: []},
    states: [],
    /** @type {string | null} When set, Beautify stays disabled until the input differs from this string. */
    lastBeautifiedContent: null,
    /**
     * @param {{script?: string}} [overrides] When `script` is set, that snapshot is used for revert instead of `arb.script`.
     */
    saveState(overrides = {}) {
      const scriptSnapshot =
        typeof overrides.script === 'string' ? overrides.script : this.arb.script;
      // noinspection JSUnresolvedReference
      this.states.push({
        script: scriptSnapshot,
        filters: cloneValue(this.filters),
        steps: cloneValue(this.steps),
        transformationCode: this.transformationCode,
      });
    },
    async revertState() {
      if (this.states.length) {
        const state = this.states.pop();
        // noinspection JSValidateTypes
        await this.loadNewScript(state.script);
        this.filters = state.filters;
        this.steps = state.steps;
        this.transformationCode = state.transformationCode;
        this.clearKnownStructureTransformPreview();
        this.selectedPipelineStepIndex = this.steps.length ? this.steps.length - 1 : -1;
        this.logMessage('Reverted the last applied change', 'info');
      }
    },
    async beautifyInputScript() {
      const code = this.getCurrentScriptContent();
      if (!code.trim()) {
        return false;
      }

      const filtersSnapshot = cloneValue(this.filters);
      const stepsSnapshot = cloneValue(this.steps);
      const transformationSnapshot = this.transformationCode;

      this.saveState({script: code});

      const {generateCode, generateRootNode} = await import('flast');
      const rootNode = generateRootNode(code);
      if (!rootNode) {
        this.states.pop();
        this.logMessage('Unable to beautify: script could not be parsed', 'error');
        return false;
      }

      let beautified;
      try {
        beautified = generateCode(rootNode);
      } catch (error) {
        this.states.pop();
        this.logMessage(`Unable to beautify: ${error.message}`, 'error');
        return false;
      }

      if (beautified === code) {
        this.states.pop();
        this.lastBeautifiedContent = code;
        this.logMessage('Script is already formatted', 'info');
        return true;
      }

      await this.loadNewScript(beautified);
      this.filters = filtersSnapshot;
      this.steps = stepsSnapshot;
      this.transformationCode = transformationSnapshot;
      this.selectedPipelineStepIndex = this.steps.length ? this.steps.length - 1 : -1;
      this.lastBeautifiedContent = beautified;
      this.logMessage('Script beautified', 'info');
      return true;
    },
    async loadNewScript(script) {
      this.lastBeautifiedContent = null;
      const inputEditor = this.getEditor(this.editorIds.inputCodeEditor);

      if (inputEditor) {
        this.setContent(inputEditor, script);
      }

      const {parseSource} = await import('../../../domain/parse/parseSource.js');
      const integration = await loadRestringerIntegration();
      this.hydrateKnownStructureCatalog(buildHydratedKnownStructureCatalog(integration.knownStructures));

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
      await this.runKnownStructureMatching();
      await this.runApiInteractionsMatcher();
    },
    /**
     * Syncs a flAST {@link Arborist} (e.g. edited in the devtools console)
     * into the input editor, workspace `arb`, filters, known-structure results, and parse/selection metadata.
     * Invoked from `flast.applyArboristToUI` when debug globals are installed.
     *
     * @param {Arborist | {ast?: ASTNode[], script?: string}} arborist
     * @returns {Promise<boolean>}
     */
    async applyArboristToWorkspace(arborist) {
      const inputEditor = this.getEditor(this.editorIds.inputCodeEditor);

      if (!inputEditor) {
        this.logMessage('applyArboristToWorkspace: input editor is not ready yet', 'error');
        return false;
      }

      if (!arborist || typeof arborist.script !== 'string') {
        this.logMessage('applyArboristToWorkspace: arborist must expose a string `script`', 'error');
        return false;
      }

      const script = arborist.script;
      const prevId = this.selectedNodeId;
      const prevSource = this.selectedNodeSource;

      this.suppressInputChangeParseReset = true;
      try {
        this.setContent(inputEditor, script);
      } finally {
        this.suppressInputChangeParseReset = false;
      }

      this.arb = arborist;
      const parseRunId = this.bumpParseRunSequence();
      this.markKnownStructureInputChanged();
      this.reapplyFilters();
      this.markCurrentInputParsed();

      const ast = Array.isArray(arborist.ast) ? arborist.ast : [];
      if (Number.isInteger(prevId) && ast.some((n) => n.nodeId === prevId)) {
        this.selectedNodeId = prevId;
        this.selectedNodeSource = prevSource ?? 'ast';
        this.selectionParseRunId = parseRunId;
        const node = ast.find((n) => n.nodeId === prevId);
        if (node?.range?.length >= 2) {
          inputEditor.highlightRange?.(node.range[0], node.range[1]);
        }
      } else {
        this.setSelectedNode(null);
      }

      try {
        await this.rerunKnownStructureMatching();
        await this.runApiInteractionsMatcher();
      } catch (error) {
        this.logMessage(error instanceof Error ? error.message : String(error), 'error');
        return false;
      }

      if (typeof this.markParsedToolbarIcon === 'function') {
        this.markParsedToolbarIcon();
      }

      return true;
    },
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
    /**
     * When true, the next input editor doc change skips `resetParsedState` (used when replacing
     * the document and `arb` together from `applyArboristToWorkspace`).
     */
    suppressInputChangeParseReset: false,
    shouldAutoParseInitialInput: true,
    // eslint-disable-next-line no-unused-vars
    logMessage(text, level) {},
    tryAutoParseInitialInput() {
      return false;
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
    handleInputEditorChange() {
      this.inputContentVersion += 1;

      if (this.suppressInputChangeParseReset) {
        return;
      }

      if (this.parsedContentVersion !== -1 || Array.isArray(this.arb?.ast)) {
        this.resetParsedState();
      }
    },
    markCurrentInputParsed() {
      this.parsedContentVersion = this.inputContentVersion;
    },
    hasParsableInput() {
      return this.getCurrentScriptContent().trim().length > 0;
    },
    canBeautifyInput() {
      if (!this.hasParsableInput()) {
        return false;
      }

      if (this.lastBeautifiedContent === null) {
        return true;
      }

      return this.getCurrentScriptContent() !== this.lastBeautifiedContent;
    },
    isCurrentInputParsed() {
      return this.hasParsableInput() && this.parsedContentVersion === this.inputContentVersion;
    },
    canParseCurrentInput() {
      return this.hasParsableInput() && !this.isCurrentInputParsed();
    },
    setCurrentScriptSource({
      kind = 'custom',
      label = 'Custom script',
      baselineContent = this.getCurrentScriptContent(),
    } = {}) {
      this.lastBeautifiedContent = null;
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
    resetParsedState() {},
    parseContent() {},
  };
}
