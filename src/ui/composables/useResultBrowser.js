import {computed, ref, watch} from 'vue';
import {isKnownStructureMatchSelectionActive} from '../../domain/selection/nodeSelection.js';
import store from '../../store.js';
import {buildResultBrowserItems, canOpenResultBrowserMode} from './resultBrowserModel.js';

const PAGE_SIZE = 100;

export function useResultBrowser() {
  const currentPage = ref(0);

  const modes = [
    {id: 'matches', label: 'Matches'},
    {id: 'ast', label: 'AST nodes'},
  ];

  const visibleItems = computed(() =>
    buildResultBrowserItems({
      activeResultMode: store.activeResultMode,
      areFiltersActive: store.areFiltersActive,
      filteredNodes: store.filteredNodes,
      astNodes: store.arb?.ast ?? [],
      relatedNodeEntries: store.getRelatedNodeEntries(),
      knownStructureMatches: store.getKnownStructureMatches(),
      getStructureTitle: (structureId) => store.getKnownStructureById(structureId)?.title ?? structureId,
    }),
  );

  const totalItems = computed(() => visibleItems.value.length);
  const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / PAGE_SIZE)));
  const isPaged = computed(() => totalItems.value > PAGE_SIZE);
  const pagedItems = computed(() => {
    const start = currentPage.value * PAGE_SIZE;
    return visibleItems.value.slice(start, start + PAGE_SIZE);
  });
  const pageRange = computed(() => {
    if (!totalItems.value) {
      return '0 - 0';
    }

    const start = currentPage.value * PAGE_SIZE + 1;
    const end = Math.min(totalItems.value, start + PAGE_SIZE - 1);
    return `${start} - ${end}`;
  });

  const matchItems = computed(() => store.getKnownStructureMatches().length);
  const astItems = computed(() => (store.areFiltersActive ? store.filteredNodes : store.arb?.ast ?? []).length);
  const relatedItems = computed(() => store.getRelatedNodes().length);

  function canOpenMode(modeId) {
    return canOpenResultBrowserMode(modeId, {
      activeResultMode: store.activeResultMode,
      matchCount: matchItems.value,
      astCount: astItems.value,
      relatedCount: relatedItems.value,
    });
  }

  function selectItem(item) {
    store.setActiveWorkspaceTab('results');
    store.setActiveInspectorPanel('browser');

    if (item.kind === 'match') {
      store.setSelectedKnownStructureMatch(item.match.structureId, item.match.metadata.matchOrdinal, false);
      return;
    }

    store.setSelectedNode(item.node, store.activeResultMode);
  }

  function openItemDetails(item) {
    if (item.kind === 'match') {
      store.setSelectedKnownStructureMatch(item.match.structureId, item.match.metadata.matchOrdinal);
      return;
    }

    store.inspectNode(item.node, store.activeResultMode);
  }

  function isActive(item) {
    if (item.kind === 'match') {
      return isKnownStructureMatchSelectionActive(store.selectedKnownStructureMatch, item.match);
    }

    return store.getSelectedNode()?.nodeId === item.node?.nodeId;
  }

  function nextPage() {
    currentPage.value = currentPage.value >= totalPages.value - 1 ? 0 : currentPage.value + 1;
  }

  function prevPage() {
    currentPage.value = currentPage.value <= 0 ? totalPages.value - 1 : currentPage.value - 1;
  }

  watch(
    [
      () => store.activeResultMode,
      () => store.activeKnownStructureId,
      () => store.getKnownStructureMatches().length,
      () => (store.areFiltersActive ? store.filteredNodes.length : store.arb?.ast?.length ?? 0),
      () => store.getRelatedNodes().length,
    ],
    () => {
      currentPage.value = 0;
    },
  );

  watch(totalPages, (nextTotalPages) => {
    if (currentPage.value > nextTotalPages - 1) {
      currentPage.value = Math.max(0, nextTotalPages - 1);
    }
  });

  return {
    store,
    modes,
    currentPage,
    visibleItems,
    totalItems,
    totalPages,
    isPaged,
    pagedItems,
    pageRange,
    canOpenMode,
    selectItem,
    openItemDetails,
    isActive,
    nextPage,
    prevPage,
  };
}
