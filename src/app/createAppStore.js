import {reactive, watch} from 'vue';
import appPackage from '../../package.json' with {type: 'json'};
import {createKnownStructureState} from '../integrations/restringer/matchingEngine.js';
import {saveWorkspace} from './persistence/index.js';
import {createStoreBlueprint} from './store/storeBlueprint.js';
import {cloneValue, debounce} from './store/storeUtils.js';

function buildWorkspaceSnapshot(store) {
  const editor = store.getEditor(store.editorIds.inputCodeEditor);
  const mainSel = editor?.state.selection.main;
  return {
    appVersion: appPackage.version,
    script: store.arb?.script ?? '',
    currentScriptKind: store.currentScriptKind ?? 'custom',
    currentScriptLabel: store.currentScriptLabel ?? '',
    currentScriptBaseline: store.currentScriptBaseline ?? store.arb?.script ?? '',
    editorContent: editor?.state.doc.toString() ?? store.arb?.script ?? '',
    editorSelectionAnchor: mainSel?.anchor ?? 0,
    editorSelectionHead: mainSel?.head ?? 0,
    editorScrollTop: editor?.scrollDOM.scrollTop ?? 0,
    editorScrollLeft: editor?.scrollDOM.scrollLeft ?? 0,
    steps: cloneValue(store.steps),
    filters: cloneValue(store.filters),
    transformationCode: store.transformationCode,
    undoStates: cloneValue(store.states),
    customStructures: store.availableKnownStructures
      .filter((structure) => structure.categoryGroup === 'user-defined')
      .map((structure) => ({
        id: structure.id,
        title: structure.title,
        filterSrc: structure.codeExample,
        category: structure.category,
      })),
    selectedKnownStructureIds: cloneValue(store.selectedKnownStructureIds),
  };
}

/**
 * Creates the root reactive application store (facade over domain modules).
 *
 * @param {readonly unknown[]} [structures] optional catalog override (primarily for tests)
 * @param {{skipPersistence?: boolean}} [options]
 */
export function createAppStore(structures, {skipPersistence = false} = {}) {
  const knownStructureState = createKnownStructureState(structures);
  const store = reactive(createStoreBlueprint(knownStructureState));

  if (skipPersistence) {
    store.persistenceReady = true;
    return store;
  }

  const persistWorkspace = debounce(async () => {
    if (!store.persistenceReady) {
      return;
    }
    try {
      await saveWorkspace(buildWorkspaceSnapshot(store));
    } catch (error) {
      console.warn('[flASTer] Failed to save workspace:', error);
    }
  }, 400);

  watch(
    () => [
      store.arb?.script,
      store.currentScriptKind,
      store.currentScriptLabel,
      store.currentScriptBaseline,
      store.inputContentVersion,
      store.steps,
      store.filters,
      store.transformationCode,
      store.states,
      store.knownStructureSelectionVersion,
      store.selectedKnownStructureIds,
    ],
    persistWorkspace,
    {deep: true},
  );

  globalThis.window?.addEventListener('pagehide', () => {
    if (!store.persistenceReady) {
      return;
    }
    void saveWorkspace(buildWorkspaceSnapshot(store));
  });

  void store.restoreFromStorage();

  return store;
}
