<script setup>
import {computed} from 'vue';
import store from '../store';

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
</script>

<template>
  <section class="workspace-panel">
    <div class="panel-header">
      <h2>Matches, nodes, and context</h2>
      <div class="panel-meta">{{ visibleItems.length }} visible</div>
    </div>

    <div class="mode-switches">
      <button
        v-for="mode in modes"
        :key="mode.id"
        class="mode-btn"
        :class="{active: store.activeResultMode === mode.id}"
        type="button"
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
        title="Jump to the previous known-structure match"
        :disabled="!store.activeKnownStructureId"
        @click="store.selectKnownStructureMatchStep(-1)"
      >
        ‹
      </button>
      <button
        class="mini-btn icon-btn"
        type="button"
        title="Jump to the next known-structure match"
        :disabled="!store.activeKnownStructureId"
        @click="store.selectKnownStructureMatchStep(1)"
      >
        ›
      </button>
      <button class="mini-btn" type="button" title="Show nodes related to the current selection" @click="store.setActiveResultMode('related')">Related</button>
      <button class="mini-btn" type="button" title="Show raw AST nodes in the result list" @click="store.setActiveResultMode('ast')">AST</button>
    </div>

    <div class="result-list">
      <button
        v-for="item in visibleItems"
        :key="item.key"
        class="result-item"
        :class="{active: isActive(item)}"
        type="button"
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
  padding: 0.42rem 0.65rem;
  cursor: pointer;
}

.mode-btn.active {
  background: rgba(126, 202, 255, 0.16);
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
}

.icon-btn {
  min-width: 2.25rem;
  padding-inline: 0.55rem;
  font-size: 1.15rem;
  line-height: 1;
}
</style>
