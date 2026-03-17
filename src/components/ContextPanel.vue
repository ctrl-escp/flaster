<script setup>
import store from '../store';
import NodeInspector from './NodeInspector.vue';
import TemplateWorkbench from './TemplateWorkbench.vue';
import PipelineBuilder from './PipelineBuilder.vue';
import AdvancedWorkspace from './AdvancedWorkspace.vue';

const panels = {
  inspector: NodeInspector,
  templates: TemplateWorkbench,
  pipeline: PipelineBuilder,
  advanced: AdvancedWorkspace,
};

const tabs = [
  {id: 'inspector', label: 'Inspector'},
  {id: 'templates', label: 'Templates'},
  {id: 'pipeline', label: 'Pipeline'},
  {id: 'advanced', label: 'Advanced'},
];
</script>

<template>
  <section class="context-pane">
    <div class="pane-header">
      <h2>Focused workspace</h2>
      <div class="tab-row">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{active: store.activeInspectorPanel === tab.id}"
          type="button"
          :title="`Open the ${tab.label.toLowerCase()} panel`"
          @click="store.setActiveInspectorPanel(tab.id)"
        >
          {{ tab.label }}
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
.tab-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.tab-btn {
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  border-radius: 9px;
  padding: 0.45rem 0.7rem;
  cursor: pointer;
}

.tab-btn.active {
  background: rgba(126, 202, 255, 0.12);
  border-color: rgba(126, 202, 255, 0.32);
}

.panel-content {
  min-height: 0;
  overflow: auto;
  padding-right: 0.1rem;
}
</style>
