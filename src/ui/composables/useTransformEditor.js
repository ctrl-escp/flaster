import {computed} from 'vue';
import store from '../../store.js';
import {
  TRANSFORM_EDITOR_INITIAL_VALUE,
  buildApplyCustomTransformationOptions,
  transformEditorContextMessage,
} from './transformEditorModel.js';

export function useTransformEditor() {
  const activeStructure = computed(() =>
    store.getKnownStructureById(store.inspectedKnownStructureId ?? store.activeKnownStructureId));

  const activeMatchShape = computed(() =>
    activeStructure.value ? store.getKnownStructureMatchShape(activeStructure.value.id) : null);

  const runSettings = computed(() => store.templateDrafts['advanced-js-step'] ?? {});

  const activeFilterCount = computed(() => store.filters.filter((filter) => filter?.enabled).length);

  const transformContext = computed(() =>
    transformEditorContextMessage(activeStructure.value, activeFilterCount.value));

  function applyTransformation() {
    const structureFilterSeed = activeStructure.value
      ? store.copyKnownStructureRuleSeed(activeStructure.value.id)
      : '';

    void store.applyCustomTransformation(
      undefined,
      buildApplyCustomTransformationOptions({
        activeStructure: activeStructure.value,
        runSettings: runSettings.value,
        structureFilterSeed,
      }),
    );
  }

  function setTransformEditorContent(transformSrc) {
    store.setContent(store.getEditor(store.editorIds.transformEditor), transformSrc);
  }

  function revertTransformation() {
    void store.revertState();
  }

  return {
    store,
    initialValue: TRANSFORM_EDITOR_INITIAL_VALUE,
    activeStructure,
    activeMatchShape,
    runSettings,
    transformContext,
    applyTransformation,
    setTransformEditorContent,
    revertTransformation,
  };
}
