<script setup>
import {computed} from 'vue';
import store from '../store';
import NodeInspector from './NodeInspector.vue';
import TemplateWorkbench from './TemplateWorkbench.vue';
import PipelineBuilder from './PipelineBuilder.vue';
import IconInspect from './icons/IconInspect.vue';
import IconCompose from './icons/IconCompose.vue';
import IconExport from './icons/IconExport.vue';
import IconPipeline from './icons/IconPipeline.vue';

const panels = {
  inspector: NodeInspector,
  templates: TemplateWorkbench,
  pipeline: PipelineBuilder,
};

const tabs = [
  {id: 'inspector', label: 'Node Info', icon: IconInspect},
  {id: 'templates', label: 'Templates', icon: IconCompose},
  {id: 'pipeline', label: 'Pipeline', icon: IconPipeline},
];

const canExport = computed(() => store.steps.length > 0);
</script>

<template>
  <section class="context-pane">
    <div class="pane-header">
      <h2>Focused flASTer</h2>
      <div class="pane-actions">
        <div class="tab-row">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-btn icon-btn"
            :class="{active: store.activeInspectorPanel === tab.id}"
            type="button"
            :disabled="store.activeInspectorPanel === tab.id"
            :title="`Open the ${tab.label.toLowerCase()} panel`"
            :aria-label="`Open ${tab.label} panel`"
            @click="store.setActiveInspectorPanel(tab.id)"
          >
            <component :is="tab.icon" />
          </button>
        </div>
        <button
          class="export-btn icon-btn"
          type="button"
          :disabled="!canExport"
          :title="canExport ? 'Open the generated Node.js export in a modal' : 'Add at least one pipeline step before exporting'"
          aria-label="Open export panel"
          @click="store.exportPanelOpen = true"
        >
          <icon-export />
        </button>
      </div>
    </div>

    <div class="panel-content">
      <component :is="panels[store.activeInspectorPanel]" />
    </div>
  </section>
</template>

<style scoped>
.context-pane {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  height: 100%;
}

.pane-header,
.pane-actions,
.tab-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.pane-actions {
  justify-content: flex-end;
}

.tab-row {
  justify-content: flex-end;
}

.tab-btn {
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  border-radius: 9px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tab-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tab-btn.active {
  background: rgba(126, 202, 255, 0.18);
  border-color: rgba(126, 202, 255, 0.42);
  color: #eef8ff;
  box-shadow: inset 0 0 0 1px rgba(126, 202, 255, 0.12);
}

.tab-btn:hover:not(:disabled):not(.active),
.tab-btn:focus-visible:not(:disabled):not(.active) {
  background: rgba(126, 202, 255, 0.1);
  border-color: rgba(126, 202, 255, 0.24);
  outline: none;
}

.tab-btn.active:disabled {
  opacity: 1;
  cursor: default;
}

.export-btn {
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  border-radius: 9px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.export-btn:hover:not(:disabled),
.export-btn:focus-visible:not(:disabled) {
  background: rgba(126, 202, 255, 0.1);
  border-color: rgba(126, 202, 255, 0.24);
  outline: none;
}

.export-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.panel-content {
  min-height: 0;
  overflow: auto;
  padding-right: 0.1rem;
}
</style>
