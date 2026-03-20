<script setup>
import {computed} from 'vue';
import store from '../store';
import IconExport from './icons/IconExport.vue';

const canExport = computed(() => store.steps.length > 0);
</script>

<template>
  <section class="workspace-panel automation-panel">
    <div class="panel-header">
      <h2>Generate Automation</h2>
      <div class="panel-meta">{{ store.steps.length }} steps ready</div>
    </div>

    <p class="panel-copy">Export your pipeline to a Node.js script.</p>

    <button
      class="export-cta"
      type="button"
      :disabled="!canExport"
      :title="canExport ? 'Open the generated Node.js export' : 'Add at least one pipeline step before exporting'"
      @click="store.exportPanelOpen = true"
    >
      <icon-export class="export-icon" />
      <strong>Export Node.js Script</strong>
      <span>Open a generated script you can copy or download.</span>
    </button>
  </section>
</template>

<style scoped>
.automation-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  height: 100%;
  justify-content: center;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.panel-meta,
.panel-copy {
  color: var(--text-muted);
}

.export-cta {
  width: 100%;
  min-height: 14rem;
  border: 1px solid rgba(126, 202, 255, 0.28);
  border-radius: 18px;
  background:
    radial-gradient(circle at top, rgba(126, 202, 255, 0.16), transparent 58%),
    rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
}

.export-cta:hover:not(:disabled),
.export-cta:focus-visible:not(:disabled) {
  border-color: rgba(126, 202, 255, 0.45);
  background:
    radial-gradient(circle at top, rgba(126, 202, 255, 0.22), transparent 58%),
    rgba(126, 202, 255, 0.08);
  outline: none;
}

.export-cta:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.export-icon {
  width: 2.4rem;
  height: 2.4rem;
}

.export-cta strong {
  font-size: 1.05rem;
}

.export-cta span {
  max-width: 24rem;
  color: var(--text-muted);
}
</style>
