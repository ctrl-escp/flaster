<script setup>
import {computed} from 'vue';
import store from '../store';

const activeTemplate = computed(() =>
  store.templateCatalog.find((template) => template.type === store.activeTemplateType) ?? null);

const selectedNode = computed(() => store.getSelectedNode());
const activeStructure = computed(() => store.getKnownStructureById(store.inspectedKnownStructureId ?? store.activeKnownStructureId));
const canApplyTemplate = computed(() => store.canApplyTemplate());
const visibleTemplates = computed(() => store.templateCatalog.filter((template) => {
  if (template.type === 'apply-known-transform' || template.type === 'remove-dead-wrapper') {
    return !!activeStructure.value;
  }

  if (template.type === 'rename-identifiers') {
    return selectedNode.value?.type === 'Identifier' || !!selectedNode.value;
  }

  if (template.type === 'replace-literals') {
    return selectedNode.value?.type === 'Literal' || !!selectedNode.value;
  }

  if (template.type === 'match-structure') {
    return !!activeStructure.value;
  }

  if (template.type === 'custom-node-selection') {
    return !!selectedNode.value;
  }

  return ['advanced-js-step', 'inline-call-result'].includes(template.type);
}));

function updateDraft(key, event) {
  store.updateTemplateDraft(store.activeTemplateType, key, event.target.value);
}
</script>

<template>
  <section class="workspace-panel">
    <div class="panel-header">
      <h2>Stage reproducible steps</h2>
      <div class="panel-meta">{{ activeTemplate?.title || 'Choose a template' }}</div>
    </div>

    <div class="template-actions primary-actions">
      <button
        class="primary-btn"
        type="button"
        :disabled="!canApplyTemplate"
        :title="store.activeTemplateType === 'advanced-js-step'
          ? 'Switch to the advanced panel and open the raw editors'
          : canApplyTemplate
            ? 'Apply the selected template to the current script'
            : 'The selected template is not actionable yet'"
        @click="store.applyTemplate()"
      >
        {{ store.activeTemplateType === 'advanced-js-step' ? 'Open advanced' : 'Apply template' }}
      </button>
      <button
        class="secondary-btn"
        type="button"
        title="Switch to the advanced panel and show raw filter/transform editors"
        @click="store.openAdvancedTools()"
      >
        Advanced
      </button>
    </div>

    <div class="template-grid">
      <button
        v-for="template in visibleTemplates"
        :key="template.type"
        class="template-card"
        :class="{active: template.type === store.activeTemplateType}"
        type="button"
        :disabled="template.type === store.activeTemplateType"
        :title="template.description"
        @click="store.setActiveTemplate(template.type)"
      >
        <strong>{{ template.title }}</strong>
        <span>{{ template.description }}</span>
      </button>
    </div>

    <div class="template-editor">
      <p class="context-copy">
        Active structure: <strong>{{ activeStructure?.title || 'None' }}</strong>
        <span>·</span>
        Selected node: <strong>{{ selectedNode?.type || 'None' }}</strong>
      </p>

      <p class="ordering-note">
        Steps run top-to-bottom. After each applied transformation, known-structure matching reruns on the updated script.
      </p>

      <div v-if="store.activeTemplateType === 'rename-identifiers'" class="form-grid">
        <label>
          <span>Replacement name</span>
          <input
            class="panel-input"
            :value="store.templateDrafts['rename-identifiers'].nextName"
            @input="updateDraft('nextName', $event)"
          >
        </label>
        <label class="checkbox-row">
          <input
            :checked="store.templateDrafts['rename-identifiers'].useSelectedName"
            type="checkbox"
            @change="store.updateTemplateDraft('rename-identifiers', 'useSelectedName', $event.target.checked)"
          >
          <span>Only rename the currently selected identifier name</span>
        </label>
      </div>

      <div v-else-if="store.activeTemplateType === 'replace-literals'" class="form-grid">
        <label>
          <span>New literal value</span>
          <input
            class="panel-input"
            :value="store.templateDrafts['replace-literals'].nextValue"
            @input="updateDraft('nextValue', $event)"
          >
        </label>
        <label>
          <span>Value type</span>
          <select
            class="panel-input"
            :value="store.templateDrafts['replace-literals'].valueType"
            @change="updateDraft('valueType', $event)"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
          </select>
        </label>
      </div>

      <div v-else class="template-help">
        {{ activeTemplate?.description }}
      </div>

    </div>
  </section>
</template>

<style scoped>
.workspace-panel,
.template-editor {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.panel-header,
.template-actions,
.checkbox-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
}

.panel-meta,
.context-copy,
.template-help,
.ordering-note {
  color: var(--text-muted);
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.template-card {
  border: 1px solid var(--panel-border);
  background: var(--panel-card);
  border-radius: 12px;
  padding: 0.75rem;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: var(--text-primary);
  cursor: pointer;
}

.template-card:disabled,
.primary-btn:disabled,
.secondary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.template-card span {
  color: var(--text-muted);
}

.template-card.active {
  border-color: rgba(255, 191, 102, 0.55);
  background: rgba(255, 191, 102, 0.08);
  box-shadow: inset 0 0 0 1px rgba(255, 191, 102, 0.12);
}

.template-card.active:disabled {
  opacity: 1;
  cursor: default;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.panel-input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  background: var(--panel-input);
  color: var(--text-primary);
  padding: 0.6rem 0.75rem;
}

.primary-btn,
.secondary-btn {
  border-radius: 10px;
  padding: 0.5rem 0.8rem;
  border: 1px solid var(--panel-border);
  cursor: pointer;
}

.primary-btn {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: #081018;
  border-color: transparent;
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}

@media (max-width: 720px) {
  .template-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
