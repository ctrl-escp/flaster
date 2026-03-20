<script setup>
import {computed} from 'vue';
import store from '../store';
import StructureExplorer from './StructureExplorer.vue';
import ResultBrowser from './ResultBrowser.vue';
import NodeInspector from './NodeInspector.vue';
import IconBrowse from './icons/IconBrowse.vue';
import IconListChecks from './icons/IconListChecks.vue';
import IconInspect from './icons/IconInspect.vue';

const hasResults = computed(() =>
  store.getKnownStructureMatches().length > 0 ||
  (store.areFiltersActive ? store.filteredNodes : store.arb?.ast ?? []).length > 0,
);
const hasNodeInfo = computed(() => Boolean(store.getSelectedNode()));
const shouldHighlightResults = computed(() =>
  hasResults.value &&
  !store.hasVisitedExploreNodes &&
  !store.shouldPulseCodeStructuresStage,
);
const shouldPulseStructures = computed(() =>
  store.shouldPulseCodeStructuresStage,
);

const tabs = computed(() => [
  {
    id: 'structures',
    label: 'Code Structures',
    icon: IconBrowse,
    enabled: true,
  },
  {
    id: 'results',
    label: 'Explore Nodes',
    icon: IconListChecks,
    enabled: hasResults.value,
  },
  {
    id: 'inspector',
    label: 'Node Info',
    icon: IconInspect,
    enabled: hasNodeInfo.value,
  },
]);

const activeSubview = computed(() => {
  if (
    store.activeWorkspaceTab === 'results' &&
    store.activeInspectorPanel === 'inspector' &&
    hasNodeInfo.value
  ) {
    return 'inspector';
  }

  if (store.activeWorkspaceTab === 'results' && hasResults.value) {
    return 'results';
  }

  return 'structures';
});

const activePanel = computed(() => {
  if (activeSubview.value === 'inspector') {
    return NodeInspector;
  }

  if (activeSubview.value === 'results') {
    return ResultBrowser;
  }

  return StructureExplorer;
});

function openTab(tabId) {
  if (tabId === 'results') {
    store.setActiveWorkspaceTab('results');
    if (store.activeInspectorPanel === 'inspector' && hasNodeInfo.value) {
      store.setActiveInspectorPanel('browser');
    }
    return;
  }

  if (tabId === 'inspector') {
    store.setActiveWorkspaceTab('results');
    store.setActiveInspectorPanel('inspector');
    return;
  }

  store.shouldPulseCodeStructuresStage = false;
  store.setActiveWorkspaceTab('explorer');
}
</script>

<template>
  <section class="code-structures-stage">
    <div class="subtab-row" aria-label="Code structure tools">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="subtab-btn"
        :class="{
          active: activeSubview === tab.id,
          highlighted: tab.id === 'results' && shouldHighlightResults,
          pulsating: tab.id === 'structures' && shouldPulseStructures,
        }"
        type="button"
        :disabled="!tab.enabled || activeSubview === tab.id"
        :title="tab.label"
        @click="openTab(tab.id)"
      >
        <component :is="tab.icon" class="subtab-icon" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <component :is="activePanel" />
  </section>
</template>

<style scoped>
.code-structures-stage {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.75rem;
  min-height: 0;
  min-width: 0;
  height: 100%;
  width: 100%;
}

.subtab-row {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
  padding-top: 0.35rem;
  padding-left: 0.35rem;
}

.subtab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  padding: 0.55rem 0.8rem;
  cursor: pointer;
}

.subtab-btn.active {
  background: rgba(126, 202, 255, 0.18);
  border-color: rgba(126, 202, 255, 0.42);
  color: #eef8ff;
  box-shadow: inset 0 0 0 1px rgba(126, 202, 255, 0.12);
}

.subtab-btn.highlighted {
  border-color: rgba(255, 215, 64, 0.95);
  background: rgba(255, 215, 64, 0.2);
  box-shadow: 0 0 0 0 rgba(255, 215, 64, 0.65);
  animation: pulse-results-glow 2s infinite;
}

.subtab-btn.highlighted:hover:not(:disabled):not(.active),
.subtab-btn.highlighted:focus-visible:not(:disabled):not(.active) {
  background: rgba(255, 215, 64, 0.26);
  border-color: rgba(255, 215, 64, 1);
}

.subtab-btn.pulsating {
  border-color: rgba(255, 215, 64, 0.95);
  background: rgba(255, 215, 64, 0.22);
  box-shadow: 0 0 0 0 rgba(255, 215, 64, 0.7);
  animation: pulse-structures-glow 2s infinite;
  position: relative;
  z-index: 1;
}

.subtab-btn.pulsating:hover:not(:disabled):not(.active),
.subtab-btn.pulsating:focus-visible:not(:disabled):not(.active) {
  background: rgba(255, 215, 64, 0.28);
  border-color: rgba(255, 215, 64, 1);
  outline: none;
}

.subtab-btn:hover:not(:disabled):not(.active),
.subtab-btn:focus-visible:not(:disabled):not(.active) {
  background: rgba(126, 202, 255, 0.1);
  border-color: rgba(126, 202, 255, 0.24);
  outline: none;
}

.subtab-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.subtab-btn.active:disabled {
  opacity: 1;
  cursor: default;
}

.subtab-icon {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 900px) {
  .code-structures-stage {
    flex: 0 0 auto;
    height: auto;
  }
}

@keyframes pulse-results-glow {
  0% {
    box-shadow:
      0 0 0 0 rgba(255, 215, 64, 0.65),
      0 0 18px rgba(255, 215, 64, 0.28);
  }

  100% {
    box-shadow:
      0 0 0 15px rgba(255, 215, 64, 0),
      0 0 24px rgba(255, 215, 64, 0.12);
  }
}

@keyframes pulse-structures-glow {
  0% {
    box-shadow:
      0 0 0 0 rgba(255, 215, 64, 0.7),
      0 0 9px rgba(255, 215, 64, 0.32);
  }

  100% {
    box-shadow:
      0 0 0 7.5px rgba(255, 215, 64, 0),
      0 0 12px rgba(255, 215, 64, 0.14);
  }
}
</style>
