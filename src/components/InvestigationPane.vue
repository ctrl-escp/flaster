<script setup>
import {computed} from 'vue';
import store from '../store';
import StructureExplorer from './StructureExplorer.vue';
import ResultBrowser from './ResultBrowser.vue';

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
    </div>

    <div class="pane-switches">
      <button
        class="pane-switch"
        :class="{active: store.activeWorkspaceTab === 'explorer'}"
        type="button"
        :disabled="store.activeWorkspaceTab === 'explorer'"
        title="Browse known structures and choose which ones to search for"
        @click="store.setActiveWorkspaceTab('explorer')"
      >
        Structures
      </button>
      <button
        class="pane-switch"
        :class="{active: store.activeWorkspaceTab === 'results', ready: hasResults}"
        type="button"
        :disabled="!hasResults || store.activeWorkspaceTab === 'results'"
        :title="hasResults
          ? store.activeWorkspaceTab === 'results'
            ? 'The results workspace is already open'
            : 'Browse the current matches, AST nodes, and related nodes'
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
.pane-switches {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
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
  background: rgba(255, 191, 102, 0.2);
  border-color: rgba(255, 191, 102, 0.45);
  color: #fff3df;
  box-shadow: inset 0 0 0 1px rgba(255, 191, 102, 0.14);
}

.pane-switch.ready:not(.active) {
  background: rgba(126, 202, 255, 0.1);
  border-color: rgba(126, 202, 255, 0.28);
}

.pane-switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pane-switch.active:disabled {
  opacity: 1;
  cursor: default;
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
