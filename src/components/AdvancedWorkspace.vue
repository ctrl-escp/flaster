<script setup>
import store from '../store';
import FilterEditor from '../FilterEditor.vue';
import TransformEditor from '../TransformEditor.vue';
import IconEye from './icons/IconEye.vue';
import IconClose from './icons/IconClose.vue';
</script>

<template>
  <section class="workspace-panel">
    <div class="panel-header">
      <h2>Raw filters and transforms</h2>
      <button
        class="toggle-btn icon-btn"
        type="button"
        :title="store.advancedToolsOpen ? 'Hide the raw filter and transform editors' : 'Show the raw filter and transform editors'"
        :aria-label="store.advancedToolsOpen ? 'Hide advanced editors' : 'Show advanced editors'"
        @click="store.advancedToolsOpen = !store.advancedToolsOpen"
      >
        <icon-close v-if="store.advancedToolsOpen" />
        <icon-eye v-else />
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
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.empty-copy {
  color: var(--text-muted);
  border: 1px dashed var(--panel-border);
  border-radius: 12px;
  padding: 0.9rem;
}
</style>
