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
      label: '4. Automate',
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

function onStepActivate(step) {
  if (!step.enabled || step.id === activeStage.value) {
    return;
  }
  openStage(step.id);
}

/** Hide tooltip for one pointer gesture / key activation, then hover works again (including when active). */
const suppressedBubbleStepId = ref(null);

function clearBubbleSuppression() {
  suppressedBubbleStepId.value = null;
}

function onStepPointerDown(step) {
  suppressedBubbleStepId.value = step.id;
  window.addEventListener('pointerup', clearBubbleSuppression, { once: true });
  window.addEventListener('pointercancel', clearBubbleSuppression, { once: true });
}

function onStepKeydown(e, step) {
  if (e.key !== 'Enter' && e.key !== ' ') {
    return;
  }
  suppressedBubbleStepId.value = step.id;
  const el = e.currentTarget;
  const onKeyUp = (up) => {
    if (up.key !== 'Enter' && up.key !== ' ') {
      return;
    }
    el.removeEventListener('keyup', onKeyUp);
    clearBubbleSuppression();
  };
  el.addEventListener('keyup', onKeyUp);
}
</script>

<template>
  <section class="workflow-pane">
    <div class="flow-rail" aria-label="Workflow steps">
      <div
        v-for="step in steps"
        :key="step.id"
        class="flow-step-wrap"
        :class="{
          active: step.id === activeStage,
          ready: step.ready,
          'is-suppress-bubble': suppressedBubbleStepId === step.id,
        }"
      >
        <button
          type="button"
          class="flow-icon-btn"
          :aria-current="step.id === activeStage ? 'step' : undefined"
          :aria-disabled="!step.enabled || step.id === activeStage"
          :aria-label="`${step.label}. ${step.description}`"
          @pointerdown="onStepPointerDown(step)"
          @keydown="onStepKeydown($event, step)"
          @click="onStepActivate(step)"
        >
          <component :is="step.icon" class="flow-step-icon" />
          <span class="flow-step-title">{{ step.label }}</span>
        </button>
        <div class="flow-bubble" aria-hidden="true">
          <strong class="flow-bubble-title">{{ step.label }}</strong>
          <span class="flow-bubble-desc">{{ step.description }}</span>
        </div>
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
  gap: 0.65rem;
  min-height: 0;
  min-width: 0;
  height: 100%;
}

.flow-rail {
  position: relative;
  z-index: 4;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: stretch;
  flex-wrap: nowrap;
  gap: 0.3rem;
  min-width: 0;
  width: 100%;
  padding: 0.15rem 0 0.35rem;
}

.flow-step-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: 1 1 0;
  min-width: 0;
}

.flow-bubble {
  --flow-bubble-bg: rgba(22, 30, 42, 0.98);
  --flow-bubble-edge: rgba(255, 255, 255, 0.1);
  position: absolute;
  top: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  min-width: 12rem;
  max-width: min(22rem, calc(100vw - 2rem));
  padding: 0.6rem 0.75rem 0.65rem;
  border-radius: 14px;
  border: 1px solid var(--panel-border);
  background: var(--flow-bubble-bg);
  color: var(--text-primary);
  box-shadow:
    0 6px 22px rgba(0, 0, 0, 0.42),
    0 0 0 1px var(--flow-bubble-edge),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.08s ease-out, visibility 0.08s ease-out;
}

/* Speech-bubble tail pointing up toward the icon */
.flow-bubble::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 100%;
  width: 0;
  height: 0;
  margin-bottom: -1px;
  transform: translateX(-50%);
  border-style: solid;
  border-width: 0 10px 11px 10px;
  border-color: transparent transparent var(--panel-border) transparent;
}

.flow-bubble::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 100%;
  width: 0;
  height: 0;
  margin-bottom: -1px;
  transform: translateX(-50%);
  border-style: solid;
  border-width: 0 9px 10px 9px;
  border-color: transparent transparent var(--flow-bubble-bg) transparent;
}

.flow-bubble-title {
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.flow-bubble-desc {
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--text-muted);
  overflow-wrap: anywhere;
}

/* Hover: include active. :focus-within for inactive only — active button keeps focus
   after click and would pin the bubble open. Active + :focus-visible still shows for keyboard. */
.flow-step-wrap:not(.is-suppress-bubble):hover .flow-bubble,
.flow-step-wrap:not(.is-suppress-bubble):not(.active):focus-within .flow-bubble,
.flow-step-wrap:not(.is-suppress-bubble).active:has(.flow-icon-btn:focus-visible) .flow-bubble {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.flow-step-wrap.is-suppress-bubble .flow-bubble {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

.flow-icon-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 0.35rem;
  min-height: 2.35rem;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 0.35rem 0.45rem 0.35rem 0.4rem;
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}

.flow-step-icon {
  width: 1.2rem;
  height: 1.2rem;
  flex: 0 0 auto;
}

.flow-step-title {
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.2;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-step-wrap.ready:not(.active) .flow-icon-btn {
  border-color: rgba(126, 202, 255, 0.28);
  background: rgba(126, 202, 255, 0.08);
}

.flow-step-wrap.active .flow-icon-btn {
  border-color: rgba(255, 191, 102, 0.45);
  background: rgba(255, 191, 102, 0.14);
  box-shadow: inset 0 0 0 1px rgba(255, 191, 102, 0.12);
}

.flow-icon-btn:hover:not([aria-disabled='true']):not(:disabled),
.flow-icon-btn:focus-visible:not([aria-disabled='true']):not(:disabled) {
  background: rgba(126, 202, 255, 0.1);
  border-color: rgba(126, 202, 255, 0.26);
  outline: none;
}

.flow-icon-btn[aria-disabled='true'] {
  opacity: 0.55;
  cursor: not-allowed;
}

.flow-step-wrap.active .flow-icon-btn[aria-disabled='true'] {
  opacity: 1;
  cursor: default;
}

.workflow-content {
  position: relative;
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
  overflow-x: hidden;
  overflow-y: auto;
}

@media (max-width: 900px) {
  .workflow-pane {
    height: auto;
  }

  .workflow-content {
    flex: 0 0 auto;
    overflow: visible;
  }

  .workflow-content :deep(.workspace-panel) {
    flex: 0 0 auto;
  }
}
</style>
