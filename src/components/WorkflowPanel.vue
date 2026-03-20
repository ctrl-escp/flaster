<script setup>
import {computed, ref, watch} from 'vue';
import store from '../store';
import CodeStructuresStage from './CodeStructuresStage.vue';
import TemplateWorkbench from './TemplateWorkbench.vue';
import PipelineBuilder from './PipelineBuilder.vue';
import IconBrowse from './icons/IconBrowse.vue';
import IconTransform from './icons/IconTransform.vue';
import IconPipeline from './icons/IconPipeline.vue';
import IconExport from './icons/IconExport.vue';
import GenerateAutomationStage from './GenerateAutomationStage.vue';

const panels = {
  structures: CodeStructuresStage,
  transform: TemplateWorkbench,
  pipeline: PipelineBuilder,
  automation: GenerateAutomationStage,
};

const steps = computed(() => {
  const hasSelection = store.selectedKnownStructureIds.length > 0;
  const hasMatches = store.latestKnownStructureMatches.length > 0;
  const hasAstNodes = (store.areFiltersActive ? store.filteredNodes : store.arb?.ast ?? []).length > 0;
  const hasActiveStructureMatches = store.getKnownStructureMatches(
    store.inspectedKnownStructureId ?? store.activeKnownStructureId,
  ).length > 0;
  const hasPipeline = store.steps.length > 0;
  const hasInspectionTarget = Boolean(store.getSelectedNode());

  return [
    {
      id: 'structures',
      label: '1. Code Structures',
      description: 'Define and identify meaningful code structures',
      icon: IconBrowse,
      hint: hasSelection
        ? `${store.selectedKnownStructureIds.length} selected, ${store.latestKnownStructureMatches.length} matches`
        : hasMatches || hasAstNodes || hasInspectionTarget
          ? 'Structures are available to explore'
          : 'Pick structures to search for',
      ready: hasSelection || hasMatches || hasAstNodes || hasInspectionTarget,
      enabled: true,
    },
    {
      id: 'transform',
      label: '2. Transform',
      description: 'Modify, augment, move, or remove code structures',
      icon: IconTransform,
      hint: hasActiveStructureMatches
        ? store.getKnownStructureById(store.inspectedKnownStructureId ?? store.activeKnownStructureId)?.title || 'Ready'
        : 'Choose a matched structure first',
      ready: hasActiveStructureMatches,
      enabled: hasActiveStructureMatches,
    },
    {
      id: 'pipeline',
      label: '3. Pipeline',
      description: 'Orchestrate transformation order',
      icon: IconPipeline,
      hint: hasPipeline ? `${store.steps.length} steps` : 'No steps yet',
      ready: hasPipeline,
      enabled: true,
    },
    {
      id: 'automation',
      label: '4. Generate Automation',
      description: 'Export your pipeline to a Node.js script.',
      icon: IconExport,
      hint: hasPipeline ? `${store.steps.length} pipeline steps ready to export` : 'Add pipeline steps first',
      ready: hasPipeline,
      enabled: true,
    },
  ];
});

const forcedStage = ref(null);

const inferredStage = computed(() => {
  if (store.activeInspectorPanel === 'templates') {
    return 'transform';
  }

  if (store.activeInspectorPanel === 'pipeline') {
    return 'pipeline';
  }

  if (
    store.activeInspectorPanel === 'inspector' ||
    store.activeWorkspaceTab === 'results'
  ) {
    return 'structures';
  }

  return 'structures';
});

const activeStage = computed(() => forcedStage.value ?? inferredStage.value);

const activePanel = computed(() => panels[activeStage.value] ?? CodeStructuresStage);

watch(inferredStage, (nextStage) => {
  if (forcedStage.value && forcedStage.value !== nextStage) {
    forcedStage.value = null;
  }
});

function openStage(stageId) {
  forcedStage.value = stageId;

  if (stageId === 'structures') {
    store.setActiveWorkspaceTab('explorer');
    return;
  }

  if (stageId === 'transform') {
    store.setActiveInspectorPanel('templates');
    return;
  }

  if (stageId === 'pipeline') {
    store.setActiveInspectorPanel('pipeline');
  }
}
</script>

<template>
  <section class="workflow-pane">
    <div class="flow-rail" aria-label="Workflow steps">
      <button
        v-for="step in steps"
        :key="step.id"
        class="flow-step"
        :class="{
          active: step.id === activeStage,
          ready: step.ready,
        }"
        type="button"
        :disabled="!step.enabled || step.id === activeStage"
        :title="step.description"
        @click="openStage(step.id)"
      >
        <component :is="step.icon" class="flow-step-icon" />
        <span class="flow-step-copy">
          <strong>{{ step.label }}</strong>
          <small>{{ step.description }}</small>
        </span>
      </button>
    </div>
    <div class="workflow-content">
      <component :is="activePanel" />
    </div>
  </section>
</template>

<style scoped>
.workflow-pane {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-height: 0;
  min-width: 0;
  height: 100%;
}

.flow-step {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.flow-step-copy small {
  color: var(--text-muted);
}

.flow-rail {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.55rem;
}

.flow-step {
  width: 100%;
  justify-content: flex-start;
  text-align: left;
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  cursor: pointer;
}

.flow-step-icon {
  width: 1.2rem;
  height: 1.2rem;
  flex: 0 0 auto;
}

.flow-step-copy {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}

.flow-step-copy strong,
.flow-step-copy small {
  overflow-wrap: anywhere;
}

.flow-step.ready:not(.active) {
  border-color: rgba(126, 202, 255, 0.28);
  background: rgba(126, 202, 255, 0.08);
}

.flow-step.active {
  border-color: rgba(255, 191, 102, 0.45);
  background: rgba(255, 191, 102, 0.14);
  box-shadow: inset 0 0 0 1px rgba(255, 191, 102, 0.12);
}

.flow-step:hover:not(:disabled):not(.active),
.flow-step:focus-visible:not(:disabled):not(.active) {
  background: rgba(126, 202, 255, 0.1);
  border-color: rgba(126, 202, 255, 0.26);
  outline: none;
}

.flow-step:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.flow-step.active:disabled {
  opacity: 1;
  cursor: default;
}
.workflow-content {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  overflow: hidden;
}

.workflow-content :deep(.workspace-panel) {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
}

@media (max-width: 900px) {
  .flow-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .flow-rail {
    grid-template-columns: 1fr;
  }
}
</style>
