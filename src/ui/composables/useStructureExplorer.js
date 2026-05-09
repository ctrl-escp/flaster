import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import {
  advanceStructureMatchOrdinal,
  structureMatchDisplayIndex,
} from '../../domain/selection/nodeSelection.js';
import store from '../../store.js';
import {
  STRUCTURE_EXPLORER_PAGE_SIZE,
  buildCategoryGroupOptions,
  buildCategoryOptions,
  filterVisibleStructures,
  formatCategoryLabel,
  formatStructureExplorerPageRange,
  listCategoriesForGroup,
  slicePage,
  totalPagesForCount,
} from './structureExplorerModel.js';

export function useStructureExplorer() {
  const PAGE_SIZE = STRUCTURE_EXPLORER_PAGE_SIZE;

  const filters = reactive({
    search: '',
    categoryGroup: '',
    category: '',
  });

  const expandedStructureId = ref(null);
  /** Shown on the inline Next match control until the user steps through matches (encourages review before transform/edit). */
  const structureNextNavHintId = ref(null);
  const currentPage = ref(0);
  const exampleStructureId = ref('');
  const showMatchesOnly = ref(false);
  const showDefineStructure = ref(false);
  const structureEditorSession = ref(null);
  const structureList = ref(null);

  const categoryGroupOptions = computed(() =>
    buildCategoryGroupOptions(store.availableKnownStructures));

  const categories = computed(() =>
    listCategoriesForGroup(store.availableKnownStructures, filters.categoryGroup));

  const categoryOptions = computed(() =>
    buildCategoryOptions(store.availableKnownStructures, {
      categoryGroup: filters.categoryGroup,
      categories: categories.value,
    }));

  const visibleStructures = computed(() =>
    filterVisibleStructures(store.availableKnownStructures, {
      search: filters.search,
      categoryGroup: filters.categoryGroup,
      category: filters.category,
      showMatchesOnly: showMatchesOnly.value,
      getMatchCount: (structure) => store.knownStructureMatchCounts[structure?.id] ?? 0,
    }));

  const totalStructures = computed(() => visibleStructures.value.length);
  const totalPages = computed(() => totalPagesForCount(totalStructures.value, PAGE_SIZE));
  const isPaged = computed(() => totalStructures.value > PAGE_SIZE);
  const pagedStructures = computed(() =>
    slicePage(visibleStructures.value, currentPage.value, PAGE_SIZE));
  const pageRange = computed(() =>
    formatStructureExplorerPageRange({
      totalStructures: totalStructures.value,
      currentPage: currentPage.value,
      pageSize: PAGE_SIZE,
    }));

  const selectedCount = computed(() => store.selectedKnownStructureIds.length);
  const activeStructure = computed(() => store.getKnownStructureById(store.activeKnownStructureId));
  const activePreview = computed(() => store.getKnownStructureTransformPreview(activeStructure.value?.id));
  const exampleStructure = computed(() => store.getKnownStructureById(exampleStructureId.value));
  const canFindMatches = computed(() => store.hasPendingKnownStructureScan());
  const canClearResults = computed(() => store.hasKnownStructureResultsToClear());
  const firstMatchedStructureId = computed(() =>
    visibleStructures.value.find((structure) => hasStructureMatches(structure))?.id ?? null);

  function toggleSelection(structureId) {
    const nextIds = store.selectedKnownStructureIds.includes(structureId)
      ? store.selectedKnownStructureIds.filter((id) => id !== structureId)
      : [...store.selectedKnownStructureIds, structureId];

    store.setSelectedKnownStructureIds(nextIds);
  }

  function activateStructure(structureId) {
    store.setActiveKnownStructure(structureId);
    store.setActiveWorkspaceTab('explorer');
  }

  function findStructure(structureId) {
    activateStructure(structureId);
    store.runActiveKnownStructureMatching();
  }

  function canFindStructure(structure) {
    if (structure?.executionMode !== 'no-eval' || !store.isCurrentInputParsed()) {
      return false;
    }

    return store.activeKnownStructureId !== structure.id ||
      store.activeWorkspaceTab !== 'explorer' ||
      store.hasPendingKnownStructureScan([structure.id]);
  }

  function canInspectStructure(structure) {
    return Boolean(
      structure?.executionMode === 'no-eval' &&
      store.isCurrentInputParsed() &&
      store.getKnownStructureMatches(structure.id).length > 0,
    );
  }

  function getStructureMatchCount(structure) {
    return store.knownStructureMatchCounts[structure?.id] ?? 0;
  }

  function hasStructureMatches(structure) {
    return getStructureMatchCount(structure) > 0;
  }

  function stepStructureMatch(structureId, direction = 1) {
    const matches = store.getKnownStructureMatches(structureId);

    if (!matches.length) {
      return;
    }

    store.setActiveKnownStructure(structureId);

    const rememberedIndex = store.knownStructureSelectionById[structureId];
    const nextOrdinal = advanceStructureMatchOrdinal(
      matches,
      structureId,
      store.selectedKnownStructureMatch,
      rememberedIndex,
      direction,
    );

    if (!Number.isInteger(nextOrdinal)) {
      return;
    }

    store.setSelectedKnownStructureMatch(structureId, nextOrdinal);
    if (structureNextNavHintId.value === structureId) {
      structureNextNavHintId.value = null;
    }
  }

  function getCurrentStructureMatchPosition(structureId) {
    const matches = store.getKnownStructureMatches(structureId);

    return structureMatchDisplayIndex(
      matches,
      structureId,
      store.selectedKnownStructureMatch,
      store.knownStructureSelectionById[structureId],
    );
  }

  function canTransformStructure(structure) {
    return Boolean(
      structure?.executionMode === 'no-eval' &&
      store.isCurrentInputParsed() &&
      hasStructureMatches(structure),
    );
  }

  function openStructureTransform(structureId) {
    const defaultTemplate = store.canPreviewKnownStructureTransform(structureId)
      ? 'apply-known-transform'
      : 'advanced-js-step';

    store.setInspectedKnownStructure(structureId);
    activateStructure(structureId);
    store.setActiveInspectorPanel('templates');
    store.setActiveTemplate(defaultTemplate);

    if (defaultTemplate === 'apply-known-transform') {
      store.previewKnownStructureTransform(structureId);
    } else {
      store.clearKnownStructureTransformPreview(structureId);
    }
  }

  function toggleExpandedStructure(structureId) {
    expandedStructureId.value = expandedStructureId.value === structureId ? null : structureId;
  }

  function openExample(structureId) {
    exampleStructureId.value = structureId;
  }

  function closeExample() {
    exampleStructureId.value = '';
  }

  async function revealNewStructureInList(created) {
    if (!created?.id) {
      return;
    }

    showMatchesOnly.value = false;
    filters.search = '';
    filters.categoryGroup = created.categoryGroup ?? 'user-defined';
    filters.category = created.category ?? '';

    expandedStructureId.value = created.id;

    await nextTick();

    const targetIndex = visibleStructures.value.findIndex((structure) => structure.id === created.id);
    if (targetIndex >= 0) {
      currentPage.value = Math.floor(targetIndex / PAGE_SIZE);
    }

    await nextTick();

    const container = structureList.value;
    const targetCard = container?.querySelector(`[data-structure-id="${created.id}"]`);

    if (!container || !targetCard) {
      return;
    }

    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const targetScrollTop = Math.min(
      Math.max(0, targetCard.offsetTop - container.offsetTop),
      maxScrollTop,
    );

    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });
  }

  function toggleDefineStructurePanel() {
    if (showDefineStructure.value) {
      showDefineStructure.value = false;
      structureEditorSession.value = null;
      return;
    }

    structureEditorSession.value = {type: 'new'};
    showDefineStructure.value = true;
  }

  function openStructureEditorForEdit(structureId) {
    structureEditorSession.value = {type: 'edit', structureId};
    showDefineStructure.value = true;
  }

  function openStructureEditorForFork(structureId) {
    structureEditorSession.value = {type: 'fork', structureId};
    showDefineStructure.value = true;
  }

  function isUserDefinedStructure(structure) {
    return (structure?.categoryGroup ?? '') === 'user-defined';
  }

  function handleStructureCreated(created) {
    showDefineStructure.value = false;
    structureEditorSession.value = null;
    void revealNewStructureInList(created);
  }

  function cancelStructureEditor() {
    showDefineStructure.value = false;
    structureEditorSession.value = null;
  }

  async function copyExample() {
    if (!exampleStructure.value?.codeExample) {
      return;
    }

    try {
      await navigator.clipboard.writeText(exampleStructure.value.codeExample);
      store.logMessage(`Copied example for ${exampleStructure.value.title}`, 'success');
    } catch (error) {
      store.logMessage(`Unable to copy example: ${error.message}`, 'error');
    }
  }

  function nextPage() {
    currentPage.value = currentPage.value >= totalPages.value - 1 ? 0 : currentPage.value + 1;
  }

  function prevPage() {
    currentPage.value = currentPage.value <= 0 ? totalPages.value - 1 : currentPage.value - 1;
  }

  async function scrollFirstMatchedStructureIntoView() {
    const targetStructureId = firstMatchedStructureId.value;

    if (!targetStructureId) {
      return;
    }

    const targetIndex = visibleStructures.value.findIndex((structure) => structure.id === targetStructureId);

    if (targetIndex === -1) {
      return;
    }

    const targetPage = Math.floor(targetIndex / PAGE_SIZE);

    if (currentPage.value !== targetPage) {
      currentPage.value = targetPage;
    }

    await nextTick();

    const container = structureList.value;
    const targetCard = container?.querySelector(`[data-structure-id="${targetStructureId}"]`);

    if (!container || !targetCard) {
      return;
    }

    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const targetScrollTop = Math.min(
      Math.max(0, targetCard.offsetTop - container.offsetTop),
      maxScrollTop,
    );

    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });
  }

  watch(expandedStructureId, (structureId) => {
    if (!structureId) {
      structureNextNavHintId.value = null;
      return;
    }
    const count = store.knownStructureMatchCounts[structureId] ?? 0;
    structureNextNavHintId.value = count > 0 ? structureId : null;
  });

  watch(
    [
      () => filters.search,
      () => filters.categoryGroup,
      () => filters.category,
      () => store.availableKnownStructures.length,
    ],
    () => {
      currentPage.value = 0;
      if (expandedStructureId.value &&
        !pagedStructures.value.some((structure) => structure.id === expandedStructureId.value)) {
        expandedStructureId.value = null;
      }
    },
  );

  watch(
    [() => filters.categoryGroup, categories],
    () => {
      if (filters.category && !categories.value.includes(filters.category)) {
        filters.category = '';
      }
    },
  );

  watch(totalPages, (nextTotalPages) => {
    if (currentPage.value > nextTotalPages - 1) {
      currentPage.value = Math.max(0, nextTotalPages - 1);
    }
  });

  watch(
    () => store.knownStructureExecutionStatus.lastRunAt,
    async (lastRunAt, previousLastRunAt) => {
      if (!lastRunAt || lastRunAt === previousLastRunAt) {
        return;
      }

      await scrollFirstMatchedStructureIntoView();
    },
  );

  function handleWindowKeydown(event) {
    if (event.key === 'Escape' && exampleStructure.value) {
      closeExample();
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleWindowKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleWindowKeydown);
  });

  return {
    store,
    filters,
    expandedStructureId,
    structureNextNavHintId,
    currentPage,
    exampleStructureId,
    showMatchesOnly,
    showDefineStructure,
    structureEditorSession,
    structureList,
    formatCategoryLabel,
    categoryGroupOptions,
    categories,
    categoryOptions,
    visibleStructures,
    totalStructures,
    totalPages,
    isPaged,
    pagedStructures,
    pageRange,
    selectedCount,
    activeStructure,
    activePreview,
    exampleStructure,
    canFindMatches,
    canClearResults,
    toggleSelection,
    activateStructure,
    findStructure,
    canFindStructure,
    canInspectStructure,
    getStructureMatchCount,
    hasStructureMatches,
    stepStructureMatch,
    getCurrentStructureMatchPosition,
    canTransformStructure,
    openStructureTransform,
    toggleExpandedStructure,
    openExample,
    closeExample,
    handleStructureCreated,
    cancelStructureEditor,
    toggleDefineStructurePanel,
    openStructureEditorForEdit,
    openStructureEditorForFork,
    isUserDefinedStructure,
    copyExample,
    nextPage,
    prevPage,
  };
}
