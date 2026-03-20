<script setup>
import {computed, ref, watch} from 'vue';
import store from '../store';
import StructureExplorer from './StructureExplorer.vue';
import ResultBrowser from './ResultBrowser.vue';
import TemplateWorkbench from './TemplateWorkbench.vue';
import PipelineBuilder from './PipelineBuilder.vue';
import NodeInspector from './NodeInspector.vue';
import IconBrowse from './icons/IconBrowse.vue';
import IconListChecks from './icons/IconListChecks.vue';
import IconTransform from './icons/IconTransform.vue';
import IconPipeline from './icons/IconPipeline.vue';
import IconInspect from './icons/IconInspect.vue';

const panels = {
  structures: StructureExplorer,
  matches: ResultBrowser,
  transform: TemplateWorkbench,
  pipeline: PipelineBuilder,
  inspect: NodeInspector,
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
      label: '1. Find',
      title: 'Choose structures and run matching',
      icon: IconBrowse,
      hint: hasSelection
        ? `${store.selectedKnownStructureIds.length} selected`
        : 'Pick structures to search for',
      ready: hasSelection,
      enabled: true,
    },
    {
      id: 'matches',
      label: '2. Review',
      title: 'Browse matches, AST nodes, and related nodes',
      icon: IconListChecks,
      hint: hasMatches
        ? `${store.latestKnownStructureMatches.length} matches`
        : hasAstNodes
          ? `${store.areFiltersActive ? store.filteredNodes.length : store.arb?.ast?.length ?? 0} nodes available`
          : 'Parse code first',
      ready: hasMatches || hasAstNodes,
      enabled: hasMatches || hasAstNodes,
    },
    {
      id: 'transform',
      label: '3. Transform',
      title: 'Choose how to transform the active structure',
      icon: IconTransform,
      hint: hasActiveStructureMatches
        ? store.getKnownStructureById(store.inspectedKnownStructureId ?? store.activeKnownStructureId)?.title || 'Ready'
        : 'Choose a matched structure first',
      ready: hasActiveStructureMatches,
      enabled: hasActiveStructureMatches,
    },
    {
      id: 'pipeline',
      label: '4. Pipeline',
      title: 'Review and reorder the transformation timeline',
      icon: IconPipeline,
      hint: hasPipeline ? `${store.steps.length} steps` : 'No steps yet',
      ready: hasPipeline,
      enabled: true,
    },
    {
      id: 'inspect',
      label: '5. Inspect',
      title: 'Inspect the selected node or match details',
      icon: IconInspect,
      hint: hasInspectionTarget ? store.getSelectedNode()?.type || 'Selected node' : 'Pick a node or match',
      ready: hasInspectionTarget,
      enabled: hasInspectionTarget,
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

  if (store.activeInspectorPanel === 'inspector' && store.selectedNodeId !== null) {
    return 'inspect';
  }

  if (store.activeWorkspaceTab === 'results') {
    return 'matches';
  }

  return 'structures';
});

const activeStage = computed(() => forcedStage.value ?? inferredStage.value);

const activeStep = computed(() =>
  steps.value.find((step) => step.id === activeStage.value) ?? steps.value[0]);

const activePanel = computed(() => panels[activeStage.value] ?? StructureExplorer);

watch(inferredStage, (nextStage) => {
  if (!forcedStage.value) {
    return;
  }

  if (['transform', 'pipeline', 'inspect'].includes(nextStage) || forcedStage.value === nextStage) {
    forcedStage.value = null;
  }
});

function openStage(stageId) {
  forcedStage.value = stageId;

  if (stageId === 'structures') {
    store.setActiveWorkspaceTab('explorer');
    return;
  }

  if (stageId === 'matches') {
    store.setActiveWorkspaceTab('results');
    return;
  }

  if (stageId === 'transform') {
    store.setActiveInspectorPanel('templates');
    return;
  }

  if (stageId === 'pipeline') {
    store.setActiveInspectorPanel('pipeline');
    return;
  }

  store.setActiveInspectorPanel('inspector');
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
        :title="step.title"
        @click="openStage(step.id)"
      >
        <component :is="step.icon" class="flow-step-icon" />
        <span class="flow-step-copy">
          <strong>{{ step.label }}</strong>
          <small>{{ step.hint }}</small>
        </span>
      </button>
    </div>

    <div class="active-stage-card">
      <div class="active-stage-meta">
        <strong>{{ activeStep.title }}</strong>
        <span>{{ activeStep.hint }}</span>
      </div>
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

.active-stage-card,
.flow-step,
.active-stage-meta {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.active-stage-meta span,
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

.active-stage-card {
  justify-content: space-between;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 191, 102, 0.1), rgba(126, 202, 255, 0.08));
}

.active-stage-meta {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.12rem;
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
