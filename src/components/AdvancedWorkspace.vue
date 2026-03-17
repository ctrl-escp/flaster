<script setup>
import store from '../store';
import FilterEditor from '../FilterEditor.vue';
import TransformEditor from '../TransformEditor.vue';
</script>

<template>
  <section class="workspace-panel">
    <div class="panel-header">
      <h2>Raw filters and transforms</h2>
      <button
        class="toggle-btn"
        type="button"
        :title="store.advancedToolsOpen ? 'Hide the raw filter and transform editors' : 'Show the raw filter and transform editors'"
        @click="store.advancedToolsOpen = !store.advancedToolsOpen"
      >
        {{ store.advancedToolsOpen ? 'Hide' : 'Show' }}
      </button>
    </div>

    <div v-if="store.advancedToolsOpen" class="advanced-stack">
      <filter-editor />
      <transform-editor />
    </div>
    <p v-else class="empty-copy">
      Power-user editors are tucked away here so the main workflow can stay structure-first.
    </p>
  </section>
</template>

<style scoped>
.workspace-panel,
.advanced-stack {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.toggle-btn {
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  border-radius: 10px;
  padding: 0.45rem 0.7rem;
  cursor: pointer;
}

.empty-copy {
  color: var(--text-muted);
  border: 1px dashed var(--panel-border);
  border-radius: 12px;
  padding: 0.9rem;
}
</style>
