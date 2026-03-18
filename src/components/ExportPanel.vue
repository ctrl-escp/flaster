<script setup>
import {computed} from 'vue';
import store from '../store';
import IconClose from './icons/IconClose.vue';
import IconExport from './icons/IconExport.vue';
import IconCopy from './icons/IconCopy.vue';
import {
  composeTransformationScript,
  getGeneratedScriptFilename,
} from '../composition/scriptGenerator.js';

const generatedScript = computed(() => composeTransformationScript({
  steps: store.steps,
  combineFilters: store.combineFilters,
}));

function copyScript() {
  navigator.clipboard.writeText(generatedScript.value);
}

function downloadScript() {
  const blob = new Blob([generatedScript.value], {type: 'text/javascript'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getGeneratedScriptFilename();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="export-modal-backdrop" @click.self="store.exportPanelOpen = false">
    <section class="export-modal">
      <div class="panel-header">
        <h2>Generated Node.js output</h2>
        <div class="header-actions">
          <span class="panel-meta">{{ store.steps.filter((step) => step.enabled !== false).length }} active steps</span>
          <button class="close-btn icon-btn" type="button" title="Close the export window" aria-label="Close export window" @click="store.exportPanelOpen = false">
            <icon-close />
          </button>
        </div>
      </div>

      <div class="export-actions">
        <button class="primary-btn icon-btn" type="button" title="Download the generated Node.js script" aria-label="Download export" @click="downloadScript">
          <icon-export />
        </button>
        <button class="secondary-btn icon-btn" type="button" title="Copy the generated Node.js script to the clipboard" aria-label="Copy export" @click="copyScript">
          <icon-copy />
        </button>
      </div>

      <p class="order-note">Generated steps are emitted in pipeline order. Adjacent custom steps stay in the same `applyIteratively([...])` sequence in that order.</p>

      <textarea class="generated-script" :value="generatedScript" readonly spellcheck="false"></textarea>
    </section>
  </div>
</template>

<style scoped>
.export-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(4, 9, 16, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 20;
}

.export-modal {
  width: min(1100px, 100%);
  height: min(80vh, 900px);
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: #0b111b;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.panel-header,
.export-actions,
.header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.panel-meta,
.order-note {
  color: var(--text-muted);
  font-size: 0.92rem;
}

.primary-btn,
.secondary-btn,
.close-btn {
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  cursor: pointer;
}

.primary-btn:not(.icon-btn),
.secondary-btn:not(.icon-btn),
.close-btn:not(.icon-btn) {
  padding: 0.5rem 0.8rem;
}

.primary-btn {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: #081018;
  border-color: transparent;
}

.secondary-btn,
.close-btn {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}

.generated-script {
  flex: 1;
  min-height: 0;
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--panel-border);
  background: #0b111b;
  color: #dce6f4;
  padding: 1rem;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
}
</style>
