import {clearDatabase, loadWorkspace} from '../../persistence/index.js';
import {createCustomStructureDescriptor} from '../../../domain/structures/customStructures.js';

/**
 * Persistence lifecycle: boot restore, clear storage.
 * @returns {Record<string, unknown>}
 */
export function createPersistenceSection() {
  return {
    persistenceReady: false,
    pendingEditorRestore: null,
    suppressEditorChangeProcessing: false,

    async restoreFromStorage() {
      try {
        await this._restoreWorkspace();
      } catch (error) {
        this.logMessage(`Could not restore workspace: ${error.message}`, 'error');
      } finally {
        this.persistenceReady = true;
      }
    },

    async _restoreWorkspace() {
      const snapshot = await loadWorkspace();
      if (!snapshot || typeof snapshot.script !== 'string') {
        return;
      }

      this._restoreCustomStructures(snapshot.customStructures ?? []);

      const savedIds = Array.isArray(snapshot.selectedKnownStructureIds)
        ? snapshot.selectedKnownStructureIds
        : [];
      this.setSelectedKnownStructureIds(savedIds);

      await this.loadNewScript(snapshot.script);

      this.steps = Array.isArray(snapshot.steps) ? snapshot.steps : [];
      this.filters = Array.isArray(snapshot.filters) ? snapshot.filters : [];
      this.transformationCode = typeof snapshot.transformationCode === 'string'
        ? snapshot.transformationCode
        : '';
      this.states = Array.isArray(snapshot.undoStates)
        ? snapshot.undoStates.map((record) => ({
          script: record.script ?? '',
          filters: record.filters ?? [],
          steps: record.steps ?? [],
          transformationCode: record.transformationCode ?? '',
        }))
        : [];
      this.setCurrentScriptSource({
        kind: snapshot.currentScriptKind ?? 'custom',
        label: snapshot.currentScriptLabel ?? 'Custom script',
        baselineContent: snapshot.currentScriptBaseline ?? snapshot.script,
      });
      this.shouldAutoParseInitialInput = false;

      const editorPayload = {
        editorContent: snapshot.editorContent,
        script: snapshot.script,
        anchor: snapshot.editorSelectionAnchor ?? 0,
        head: snapshot.editorSelectionHead ?? 0,
        scrollTop: snapshot.editorScrollTop ?? 0,
        scrollLeft: snapshot.editorScrollLeft ?? 0,
      };
      const editor = this.getEditor(this.editorIds.inputCodeEditor);
      if (editor) {
        this._applyEditorRestorePayload(editor, editorPayload);
      } else {
        this.pendingEditorRestore = editorPayload;
      }
    },

    _restoreCustomStructures(records) {
      let skipped = 0;
      for (const record of records) {
        try {
          const descriptor = createCustomStructureDescriptor(
            record.title,
            record.filterSrc,
            record.category,
            record.id,
          );
          this.availableKnownStructures = [...this.availableKnownStructures, descriptor];
        } catch (error) {
          skipped += 1;
          console.warn('[flASTer] Skipped stored custom structure with invalid filter:', record.id, error.message);
        }
      }
      if (skipped > 0) {
        this.logMessage(
          `Skipped ${skipped} saved custom structure${skipped === 1 ? '' : 's'} with invalid filter rules`,
          'error',
        );
      }
    },

    /**
     * @param {import('@codemirror/view').EditorView} editor
     */
    consumePendingEditorRestore(editor) {
      const payload = this.pendingEditorRestore;
      if (!payload) {
        return;
      }
      this.pendingEditorRestore = null;
      this._applyEditorRestorePayload(editor, payload);
    },

    _applyEditorRestorePayload(editor, payload) {
      if (typeof payload.editorContent === 'string' && payload.editorContent !== payload.script) {
        this.suppressEditorChangeProcessing = true;
        try {
          this.setContent(editor, payload.editorContent);
        } finally {
          this.suppressEditorChangeProcessing = false;
        }
      }

      const docLength = editor.state.doc.length;
      const anchor = Math.min(payload.anchor, docLength);
      const head = Math.min(payload.head, docLength);
      editor.dispatch({selection: {anchor, head}});

      if (payload.scrollTop || payload.scrollLeft) {
        requestAnimationFrame(() => {
          editor.scrollDOM.scrollTop = payload.scrollTop;
          editor.scrollDOM.scrollLeft = payload.scrollLeft;
        });
      }
    },

    async clearAllStorage() {
      const confirmed = typeof globalThis.window?.confirm === 'function'
        ? globalThis.window.confirm(
          'This will permanently delete your saved workspace, pipeline, undo history, and custom structures. Continue?',
        )
        : true;
      if (!confirmed) {
        return;
      }
      await clearDatabase();
      globalThis.window?.location.reload();
    },
  };
}
