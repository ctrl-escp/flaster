<script setup>
import store from '../store';
import FileLoader from './FileLoader.vue';
import ParseButton from './ParseButton.vue';
import IconRefresh from './icons/IconRefresh.vue';
import IconReset from './icons/IconReset.vue';
import IconExport from './icons/IconExport.vue';
</script>

<template>
  <section class="workspace-header">
    <h1>flASTer Workspace</h1>
    <div class="header-actions">
      <file-loader />
      <parse-button />
      <button class="header-btn" type="button" title="Clear parsed state and structure matches for the current script" @click="store.resetParsedState()">
        <icon-reset class="header-icon" />
        <span>Reset</span>
      </button>
      <button class="header-btn" type="button" title="Run known-structure matching again on the current script" @click="store.runKnownStructureMatching()">
        <icon-refresh class="header-icon" />
        <span>Refresh</span>
      </button>
      <button class="header-btn primary" type="button" title="Open the generated Node.js export in a modal" @click="store.exportPanelOpen = true">
        <icon-export class="header-icon" />
        Export
      </button>
    </div>
  </section>
</template>

<style scoped>
.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
}

h1 {
  font-size: 1.2rem;
  line-height: 1.1;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  flex: 1;
}

.header-btn {
  min-height: 2.5rem;
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  padding: 0.55rem 0.8rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.header-btn.primary {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: #081018;
  border-color: transparent;
  font-weight: 700;
}

.header-icon {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 980px) {
  .header-actions {
    justify-content: flex-start;
  }

  .workspace-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
