<script setup>
import {computed} from 'vue';
import store from '../store';

const selectedStep = computed(() => store.getPipelineStep());
</script>

<template>
  <section class="workspace-panel">
    <div class="panel-header">
      <h2>Transformation timeline</h2>
      <div class="panel-meta">{{ store.steps.length }} steps</div>
    </div>

    <p class="order-note">Execution order is top to bottom. Reorder steps to change what structures become visible next.</p>

    <div class="step-list">
      <article
        v-for="(step, index) in store.steps"
        :key="`${step.sequenceIndex || index}:${step.label}`"
        class="step-card"
        :class="{active: store.selectedPipelineStepIndex === index, disabled: step.enabled === false}"
        @click="store.setSelectedPipelineStep(index)"
      >
        <div class="step-top">
          <strong>{{ step.label }}</strong>
          <span class="step-badge">{{ step.templateType }}</span>
        </div>
        <p>{{ step.previewSummary || step.transformName || 'Custom transformation step' }}</p>
        <div class="step-actions">
          <button class="mini-btn" type="button" title="Move this step earlier in the pipeline" @click.stop="store.movePipelineStep(index, -1)">Up</button>
          <button class="mini-btn" type="button" title="Move this step later in the pipeline" @click.stop="store.movePipelineStep(index, 1)">Down</button>
          <button class="mini-btn" type="button" title="Enable or disable this step without deleting it" @click.stop="store.togglePipelineStep(index)">
            {{ step.enabled === false ? 'Enable' : 'Disable' }}
          </button>
          <button class="mini-btn" type="button" title="Remove this step from the pipeline" @click.stop="store.removePipelineStep(index)">Remove</button>
        </div>
      </article>
    </div>

    <div v-if="selectedStep" class="selected-step-card">
      <h3>Selected step</h3>
      <p>{{ selectedStep.label }}</p>
      <pre>{{ JSON.stringify(selectedStep.params || {}, null, 2) }}</pre>
    </div>
  </section>
</template>

<style scoped>
.workspace-panel,
.step-list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.panel-header,
.step-top,
.step-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.step-actions {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.panel-meta,
.step-card p,
.order-note {
  color: var(--text-muted);
}

.step-card,
.selected-step-card {
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  padding: 0.8rem;
  background: var(--panel-card);
}

.step-card.active {
  border-color: rgba(255, 191, 102, 0.55);
}

.step-card.disabled {
  opacity: 0.6;
}

.step-badge {
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
}

.mini-btn {
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  border-radius: 9px;
  padding: 0.42rem 0.65rem;
  cursor: pointer;
}

pre {
  white-space: pre-wrap;
  color: var(--text-muted);
}
</style>
