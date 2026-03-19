<script setup>
import FilterEditor from '../FilterEditor.vue';
import TransformEditor from '../TransformEditor.vue';
</script>

<template>
  <section class="workspace-panel">
    <div class="panel-header">
      <h2>Raw filters and transforms</h2>
      <div class="panel-meta">Direct JS tools for advanced filter logic and AST mutations</div>
    </div>

    <div class="advanced-stack">
      <filter-editor />
      <transform-editor />
    </div>
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
  flex-wrap: wrap;
}

.panel-meta {
  color: var(--text-muted);
  font-size: 0.92rem;
}
</style>
