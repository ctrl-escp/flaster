<script setup>
import {computed, ref} from 'vue';
import store from '../store';
import {
  buildWorkbenchTransformOptions,
  resolveWorkbenchTemplateHelpDescription,
} from '../ui/composables/templateWorkbenchModel.js';
import {knownTransformExamples} from '../ui/data/knownTransformExamples.js';
import IconCheck from './icons/IconCheck.vue';
import IconClose from './icons/IconClose.vue';
import IconCopy from './icons/IconCopy.vue';
import TransformEditor from './TransformEditor.vue';

const activeStructure = computed(() =>
  store.getKnownStructureById(store.inspectedKnownStructureId ?? store.activeKnownStructureId));
const activeTemplate = computed(() =>
  store.templateCatalog.find((template) => template.type === store.activeTemplateType) ?? null);
const deleteRunSettings = computed(() => store.templateDrafts['delete-structure-matches'] ?? {});
const activeMatchCount = computed(() =>
  activeStructure.value ? store.getKnownStructureMatches(activeStructure.value.id).length : 0);
const hasBuiltInTransform = computed(() =>
  store.canPreviewKnownStructureTransform(activeStructure.value?.id));
const activeTransformExample = computed(() =>
  activeStructure.value ? knownTransformExamples[activeStructure.value.id] ?? null : null);
const exampleModalOpen = ref(false);

const transformOptions = computed(() => buildWorkbenchTransformOptions(store.templateCatalog, {
  hasBuiltInTransform: hasBuiltInTransform.value,
  activeStructure: activeStructure.value,
  activeMatchCount: activeMatchCount.value,
}));

const canApplyTemplate = computed(() => store.canApplyTemplate());

const activeTemplateDescription = computed(() => resolveWorkbenchTemplateHelpDescription({
  activeTemplate: activeTemplate.value,
  activeTemplateType: store.activeTemplateType,
  activeStructure: activeStructure.value,
  transformName: activeStructure.value?.implementation?.transformName ?? 'unknownTransform',
  exampleOutcome: activeTransformExample.value?.outcome,
}));

function selectTemplate(template) {
  if (template.disabled) {
    return;
  }

  store.setActiveTemplate(template.type);

  if (template.type === 'apply-known-transform' && activeStructure.value) {
    store.previewKnownStructureTransform(activeStructure.value.id);
    return;
  }

  if (activeStructure.value) {
    store.clearKnownStructureTransformPreview(activeStructure.value.id);
  }
}

function openExampleModal() {
  if (!activeTransformExample.value) {
    return;
  }

  exampleModalOpen.value = true;
}

function closeExampleModal() {
  exampleModalOpen.value = false;
}

async function copyTransformExample() {
  if (!activeTransformExample.value || !activeStructure.value) {
    return;
  }

  const exampleText = [
    `${activeStructure.value.title} Example`,
    '',
    'Before:',
    activeTransformExample.value.before,
    '',
    'After:',
    activeTransformExample.value.after,
  ].join('\n');

  try {
    await navigator.clipboard.writeText(exampleText);
    store.logMessage(`Copied example for ${activeStructure.value.title}`, 'success');
  } catch (error) {
    store.logMessage(`Unable to copy example: ${error.message}`, 'error');
  }
}
</script>

<template>
  <section class="workspace-panel">
    <div class="panel-header">
      <h2>Transform</h2>
      <div class="panel-meta">
        {{ activeStructure?.title || 'Choose a structure' }}
      </div>
    </div>

    <div class="template-editor">
      <p class="context-copy">
        <strong>{{ activeMatchCount }}</strong> matches selected
        <span v-if="activeStructure">for {{ activeStructure.title }}</span>
      </p>

      <p class="ordering-note">
        Pick one transformation path for the current structure.
      </p>

      <div class="template-grid">
        <button
          v-for="template in transformOptions"
          :key="template.type"
          class="template-card"
          :class="{active: template.type === store.activeTemplateType}"
          type="button"
          :disabled="template.disabled"
          :title="template.description"
          @click="selectTemplate(template)"
        >
          <strong>{{ template.title }}</strong>
          <span>{{ template.description }}</span>
          <small class="template-detail">{{ template.detail }}</small>
        </button>
      </div>

      <div v-if="activeTemplate" class="template-help">
        <template v-if="store.activeTemplateType === 'apply-known-transform'">
          <p
            v-for="line in activeTemplateDescription"
            :key="line"
            class="template-help-line"
          >
            {{ line }}
          </p>
          <button
            v-if="activeTransformExample"
            class="secondary-btn template-example-btn"
            type="button"
            title="Open a before and after example for this transform"
            aria-label="Open transform example"
            @click="openExampleModal()"
          >
            Example
          </button>
        </template>
        <template v-else>
          <p class="template-help-line">{{ activeTemplateDescription }}</p>
        </template>
      </div>

      <div
        v-if="store.activeTemplateType === 'delete-structure-matches'"
        class="run-controls template-run-controls"
      >
        <label class="run-field">
          <span>Run mode</span>
          <select
            class="panel-input"
            :value="deleteRunSettings.runMode || 'until-stable'"
            @change="store.updateTemplateDraft('delete-structure-matches', 'runMode', $event.target.value)"
          >
            <option value="once">Run 1 time</option>
            <option value="count">Run X times</option>
            <option value="until-stable">Run until no longer effective</option>
          </select>
        </label>
        <label v-if="deleteRunSettings.runMode === 'count'" class="run-field run-field-count">
          <span>Iterations</span>
          <input
            class="panel-input"
            type="number"
            min="1"
            step="1"
            :value="deleteRunSettings.maxIterations || 3"
            @input="store.updateTemplateDraft('delete-structure-matches', 'maxIterations', $event.target.value)"
          >
        </label>
      </div>
    </div>

    <div
      v-if="store.activeTemplateType !== 'advanced-js-step'"
      class="template-actions primary-actions"
    >
      <button
        class="primary-btn apply-btn"
        type="button"
        :disabled="!canApplyTemplate"
        :title="canApplyTemplate
          ? 'Apply the selected transformation'
          : 'The selected transformation is not available yet'"
        aria-label="Apply transformation"
        @click="store.applyTemplate()"
      >
        <icon-check />
        <span>Apply</span>
      </button>
    </div>

    <transform-editor v-if="store.activeTemplateType === 'advanced-js-step'" />

    <div
      v-if="exampleModalOpen && activeTransformExample && activeStructure"
      class="example-modal-backdrop"
      @click.self="closeExampleModal()"
    >
      <section
        class="example-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="`${activeStructure.title} transform example`"
      >
        <div class="example-modal-header">
          <div class="example-modal-copy">
            <h3>{{ activeStructure.title }} Example</h3>
          </div>
          <div class="example-modal-actions">
            <button
              class="secondary-btn icon-btn"
              type="button"
              title="Copy the full example"
              aria-label="Copy full example"
              @click="copyTransformExample()"
            >
              <icon-copy />
            </button>
            <button
              class="secondary-btn icon-btn"
              type="button"
              title="Close example"
              aria-label="Close example"
              @click="closeExampleModal()"
            >
              <icon-close />
            </button>
          </div>
        </div>
        <p class="example-modal-description">{{ activeStructure.description }}</p>
        <div class="template-example-modal-grid">
          <div>
            <strong>Before</strong>
            <pre class="example-modal-code"><code>{{ activeTransformExample.before }}</code></pre>
          </div>
          <div>
            <strong>After</strong>
            <pre class="example-modal-code"><code>{{ activeTransformExample.after }}</code></pre>
          </div>
        </div>
      </section>
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
.template-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
}

.panel-meta,
.context-copy,
.template-help,
.ordering-note,
.template-detail {
  color: var(--text-muted);
}

.template-help {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.run-controls {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.template-run-controls {
  margin-top: 0.25rem;
  padding-left: 0.1rem;
}

.run-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: min(18rem, 100%);
  color: var(--text-muted);
}

.run-field-count {
  min-width: 8rem;
}

.template-help-line {
  margin: 0;
}

.apply-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.58rem 0.95rem;
}

.template-example-btn {
  align-self: flex-start;
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
  gap: 0.3rem;
  color: var(--text-primary);
  cursor: pointer;
}

.template-card.active {
  border-color: rgba(255, 191, 102, 0.55);
  background: rgba(255, 191, 102, 0.08);
  box-shadow: inset 0 0 0 1px rgba(255, 191, 102, 0.12);
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

.example-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(4, 9, 16, 0.72);
}

.example-modal,
.example-modal-copy {
  display: flex;
  flex-direction: column;
}

.example-modal {
  width: min(840px, 100%);
  max-height: min(80vh, 900px);
  gap: 0.8rem;
  padding: 1rem;
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: #0b111b;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.example-modal-actions,
.example-modal-header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.example-modal-actions {
  flex-shrink: 0;
}

.example-modal-description {
  margin: 0;
  color: var(--text-muted);
}

.template-example-modal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.example-modal-code {
  margin: 0.35rem 0 0;
  overflow: auto;
  padding: 1rem;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
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
  border: 1px solid var(--panel-border);
  cursor: pointer;
}

.primary-btn:not(.icon-btn),
.secondary-btn:not(.icon-btn) {
  padding: 0.5rem 0.8rem;
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
  .template-example-modal-grid {
    grid-template-columns: 1fr;
  }
}
</style>
