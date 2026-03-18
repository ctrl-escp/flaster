<script setup>
import {computed, ref, watch} from 'vue';
import store from '../store';
import IconArrowLeft from './icons/IconArrowLeft.vue';
import IconArrowRight from './icons/IconArrowRight.vue';
import IconArrowUp from './icons/IconArrowUp.vue';
import IconArrowDown from './icons/IconArrowDown.vue';

const PAGE_SIZE = 100;
const currentPage = ref(0);

const modes = [
  {id: 'matches', label: 'Matches'},
  {id: 'ast', label: 'AST nodes'},
  {id: 'related', label: 'Related nodes'},
];

const visibleItems = computed(() => {
  if (store.activeResultMode === 'ast') {
    return (store.areFiltersActive ? store.filteredNodes : store.arb?.ast ?? []).map((node) => ({
      key: `node:${node.nodeId}`,
      label: node.type,
      summary: node.src?.slice(0, 120) ?? 'No source snippet',
      meta: node.parentNode?.type ?? 'Root',
      node,
      kind: 'node',
    }));
  }

  if (store.activeResultMode === 'related') {
    return store.getRelatedNodes().map((node) => ({
      key: `related:${node.nodeId}`,
      label: node.type,
      summary: node.src?.slice(0, 120) ?? 'No source snippet',
      meta: node.parentNode?.type ?? 'Root',
      node,
      kind: 'node',
    }));
  }

  return store.latestKnownStructureMatches.map((match) => ({
    key: `match:${match.structureId}:${match.index}`,
    label: match.structureTitle,
    summary: match.summary,
    meta: `${match.type ?? 'Unknown'} in ${match.parentType ?? 'Root'}`,
    match,
    node: match.node,
    kind: 'match',
  }));
});

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

const matchItems = computed(() => store.latestKnownStructureMatches.length);
const astItems = computed(() => (store.areFiltersActive ? store.filteredNodes : store.arb?.ast ?? []).length);
const relatedItems = computed(() => store.getRelatedNodes().length);

function canOpenMode(modeId) {
  if (store.activeResultMode === modeId) {
    return false;
  }

  if (modeId === 'matches') {
    return matchItems.value > 0;
  }

  if (modeId === 'ast') {
    return astItems.value > 0;
  }

  if (modeId === 'related') {
    return relatedItems.value > 0;
  }

  return false;
}

function selectItem(item) {
  if (item.kind === 'match') {
    store.setSelectedKnownStructureMatch(item.match.structureId, item.match.index);
    return;
  }

  store.inspectNode(item.node, store.activeResultMode);
}

function isActive(item) {
  if (item.kind === 'match') {
    return store.selectedKnownStructureMatch?.structureId === item.match.structureId &&
      store.selectedKnownStructureMatch?.index === item.match.index;
  }

  return store.selectedNodeId === item.node?.nodeId;
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
    () => store.latestKnownStructureMatches.length,
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
</script>

<template>
  <section class="workspace-panel">
    <div class="panel-header">
      <h2>Matches, nodes, and context</h2>
      <div class="panel-meta">
        <button
          v-if="isPaged"
          class="mini-btn icon-btn"
          type="button"
          title="Previous page"
          aria-label="Previous page"
          @click="prevPage"
        >
          <icon-arrow-left />
        </button>
        <button
          v-if="isPaged"
          class="mini-btn icon-btn"
          type="button"
          title="Next page"
          aria-label="Next page"
          @click="nextPage"
        >
          <icon-arrow-right />
        </button>
        <span v-if="isPaged">{{ pageRange }} / </span>{{ totalItems }} visible
      </div>
    </div>

    <div class="mode-switches">
      <button
        v-for="mode in modes"
        :key="mode.id"
        class="mode-btn"
        :class="{active: store.activeResultMode === mode.id}"
        type="button"
        :disabled="!canOpenMode(mode.id)"
        :title="`Show ${mode.label.toLowerCase()} in the result list`"
        @click="store.setActiveResultMode(mode.id)"
      >
        {{ mode.label }}
      </button>
    </div>

    <div class="browser-actions">
      <button
        class="mini-btn icon-btn"
        type="button"
        title="Jump to the previous item"
        aria-label="Previous item"
        :disabled="!store.getKnownStructureMatches().length"
        @click="store.selectKnownStructureMatchStep(-1)"
      >
        <icon-arrow-up />
      </button>
      <button
        class="mini-btn icon-btn"
        type="button"
        title="Jump to the next item"
        aria-label="Next item"
        :disabled="!store.getKnownStructureMatches().length"
        @click="store.selectKnownStructureMatchStep(1)"
      >
        <icon-arrow-down />
      </button>
      <button class="mini-btn" type="button" :disabled="!canOpenMode('related')" title="Show nodes related to the current selection" @click="store.setActiveResultMode('related')">Related</button>
      <button class="mini-btn" type="button" :disabled="!canOpenMode('ast')" title="Show raw AST nodes in the result list" @click="store.setActiveResultMode('ast')">AST</button>
    </div>

    <div class="result-list">
      <button
        v-for="item in pagedItems"
        :key="item.key"
        class="result-item"
        :class="{active: isActive(item)}"
        type="button"
        :disabled="isActive(item)"
        :title="item.summary"
        @click="selectItem(item)"
      >
        <strong>{{ item.label }}</strong>
        <span>{{ item.summary }}</span>
        <small>{{ item.meta }}</small>
      </button>
    </div>
  </section>
</template>

<style scoped>
.workspace-panel {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-height: 0;
  min-width: 0;
  height: 100%;
}

.panel-header,
.mode-switches,
.browser-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
}

.panel-header {
  justify-content: space-between;
  min-height: 1.5rem;
  min-width: 0;
}

.panel-header h2 {
  min-width: 0;
}

.panel-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  min-height: 1.25rem;
  white-space: nowrap;
}

.mode-btn,
.mini-btn,
.result-item {
  border: 1px solid var(--panel-border);
  color: var(--text-primary);
}

.mode-btn,
.mini-btn {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 9px;
  cursor: pointer;
}

.mode-btn:not(.icon-btn),
.mini-btn:not(.icon-btn) {
  padding: 0.42rem 0.65rem;
}

.mode-btn.active {
  background: rgba(126, 202, 255, 0.2);
  border-color: rgba(126, 202, 255, 0.42);
  color: #eef8ff;
  box-shadow: inset 0 0 0 1px rgba(126, 202, 255, 0.12);
}

.mode-btn:hover:not(:disabled):not(.active),
.mode-btn:focus-visible:not(:disabled):not(.active),
.mini-btn:hover:not(:disabled),
.mini-btn:focus-visible:not(:disabled) {
  background: rgba(126, 202, 255, 0.1);
  border-color: rgba(126, 202, 255, 0.24);
  outline: none;
}

.mode-btn:disabled,
.mini-btn:disabled,
.result-item:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.mode-btn.active:disabled,
.result-item.active:disabled {
  opacity: 1;
  cursor: default;
}

.mode-switches,
.browser-actions {
  flex: 0 0 auto;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
}

.result-item {
  text-align: left;
  background: var(--panel-card);
  border-radius: 12px;
  padding: 0.7rem 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.18rem;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
  flex: 0 0 auto;
  min-width: 0;
  max-width: 100%;
}

.result-item strong,
.result-item span,
.result-item small {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.result-item span,
.result-item small {
  color: var(--text-muted);
}

.result-item.active {
  border-color: rgba(126, 202, 255, 0.5);
  box-shadow: 0 0 0 1px rgba(126, 202, 255, 0.16);
  background: rgba(126, 202, 255, 0.08);
}

.icon-btn {
  min-width: 2.25rem;
  padding-inline: 0.55rem;
  font-size: 1.15rem;
  line-height: 1;
}
</style>
