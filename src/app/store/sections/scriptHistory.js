import {generateCode, generateRootNode} from 'flast';
import {parseSource} from '../../../domain/parse/parseSource.js';
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
    beautifyInputScript() {
      const code = this.getCurrentScriptContent();
      if (!code.trim()) {
        return false;
      }

      const filtersSnapshot = cloneValue(this.filters);
      const stepsSnapshot = cloneValue(this.steps);
      const transformationSnapshot = this.transformationCode;

      this.saveState({script: code});

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

      this.loadNewScript(beautified);
      this.filters = filtersSnapshot;
      this.steps = stepsSnapshot;
      this.transformationCode = transformationSnapshot;
      this.selectedPipelineStepIndex = this.steps.length ? this.steps.length - 1 : -1;
      this.lastBeautifiedContent = beautified;
      this.logMessage('Script beautified', 'info');
      return true;
    },
    loadNewScript(script) {
      this.lastBeautifiedContent = null;
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
