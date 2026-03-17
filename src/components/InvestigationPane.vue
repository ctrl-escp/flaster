<script setup>
import {computed} from 'vue';
import store from '../store';
import StructureExplorer from './StructureExplorer.vue';
import ResultBrowser from './ResultBrowser.vue';

const activeStructure = computed(() => store.getKnownStructureById(store.activeKnownStructureId));
const selectedNode = computed(() => store.getSelectedNode());
const hasResults = computed(() => {
  const astCount = store.areFiltersActive
    ? store.filteredNodes.length
    : (store.arb?.ast?.length ?? 0);

  return store.latestKnownStructureMatches.length > 0 ||
    store.getRelatedNodes().length > 0 ||
    astCount > 0;
});
</script>

<template>
  <section class="investigation-pane">
    <div class="pane-header">
      <h2>Structures and matches</h2>
      <div class="header-status">
        <span v-if="activeStructure">{{ activeStructure.title }}</span>
        <span v-if="selectedNode">{{ selectedNode.type }}</span>
      </div>
    </div>

    <div class="pane-switches">
      <button
        class="pane-switch"
        :class="{active: store.activeWorkspaceTab === 'explorer'}"
        type="button"
        title="Browse known structures and choose which ones to search for"
        @click="store.setActiveWorkspaceTab('explorer')"
      >
        Structures
      </button>
      <button
        class="pane-switch"
        :class="{active: store.activeWorkspaceTab === 'results', ready: hasResults}"
        type="button"
        :disabled="!hasResults"
        :title="hasResults
          ? 'Browse the current matches, AST nodes, and related nodes'
          : 'Results become available after parsing or after structure matching finds something to inspect'"
        @click="hasResults && store.setActiveWorkspaceTab('results')"
      >
        Results
      </button>
    </div>

    <div class="panel-content">
      <structure-explorer v-if="store.activeWorkspaceTab === 'explorer'" />
      <result-browser v-else />
    </div>
  </section>
</template>

<style scoped>
.investigation-pane {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  min-width: 0;
  height: 100%;
}

.pane-header,
.pane-switches,
.header-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.header-status {
  justify-content: flex-end;
  flex-wrap: wrap;
  color: var(--text-muted);
}

.pane-switches {
  justify-content: flex-start;
}

.pane-switch {
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  border-radius: 9px;
  padding: 0.45rem 0.7rem;
  cursor: pointer;
}

.pane-switch.active {
  background: rgba(255, 191, 102, 0.12);
  border-color: rgba(255, 191, 102, 0.32);
}

.pane-switch.ready:not(.active) {
  background: rgba(126, 202, 255, 0.1);
  border-color: rgba(126, 202, 255, 0.28);
}

.pane-switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.panel-content {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  overflow: hidden;
}

.panel-content :deep(.workspace-panel) {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
}
</style>
