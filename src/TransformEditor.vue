<script setup>
import {computed} from 'vue';
import store from './store';
import CodeEditor from './components/CodeEditor.vue';
import IconCheck from './components/icons/IconCheck.vue';
import IconReset from './components/icons/IconReset.vue';
import IconTrash from './components/icons/IconTrash.vue';
import IconTransform from './components/icons/IconTransform.vue';

const initialValue = `// write the logic to apply to the node \`(n) => {<your code>}\`.
// to delete a node use arb.markNode(n);
// to replace a node with a new 'replacementNode' use arb.markNode(n, replacementNode);
const replacements = {Hello: 'General', there: 'Kenobi'};
if (replacements[n.value]) arb.markNode(n, {
  type: 'Literal',
  value: replacements[n.value]
});
`;

const activeStructure = computed(() =>
  store.getKnownStructureById(store.inspectedKnownStructureId ?? store.activeKnownStructureId));
const runSettings = computed(() => store.templateDrafts['advanced-js-step'] ?? {});
const activeFilterCount = computed(() => store.filters.filter((filter) => filter?.enabled).length);
const transformContext = computed(() =>
  activeStructure.value
    ? `Runs against nodes matched by ${activeStructure.value.title}`
    : activeFilterCount.value
      ? `Runs against nodes that match ${activeFilterCount.value} active filters`
      : 'Runs against the current result set when no filters are active');

function applyTransformation() {
  const structureFilter = activeStructure.value
    ? store.copyKnownStructureRuleSeed(activeStructure.value.id)
    : '';

  store.applyCustomTransformation(undefined, {
    label: 'Advanced JS transform',
    templateType: 'advanced-js-step',
    previewSummary: activeStructure.value
      ? `Custom transform for ${activeStructure.value.title}`
      : 'Raw JS transformation using the active filter selection',
    selectionSource: activeStructure.value
      ? {
        kind: 'known-structure',
        structureId: activeStructure.value.id,
      }
      : {
        kind: 'advanced-js',
      },
    filters: structureFilter ? [{src: structureFilter, enabled: true}] : undefined,
    runMode: runSettings.value.runMode,
    maxIterations: Number.parseInt(runSettings.value.maxIterations, 10) || 1,
  });
}

function setTransformEditorContent(transformSrc) {
  store.setContent(store.getEditor(store.editorIds.transformEditor), transformSrc);
}

function revertTransformation() {
  store.revertState();
}
</script>

<template>
  <section v-if="store.arb?.ast?.length" class="advanced-section">
    <div class="section-header">
      <div class="section-intro">
        <h3>Define New Transformation</h3>
        <p class="section-copy">Write a direct Arborist transform for cases where the built-in templates are too limiting.</p>
      </div>
      <div class="panel-meta">
        <icon-transform class="meta-icon" />
        <span>{{ transformContext }}</span>
      </div>
    </div>

    <article class="editor-card">
      <div class="card-header">
        <h4>Transform code</h4>
        <div class="card-actions">
          <button
            class="mini-btn icon-btn icon-btn-sm emphasis"
            type="button"
            title="Apply the current transform editor code"
            aria-label="Apply transform"
            @click="applyTransformation"
          >
            <icon-check />
          </button>
          <button
            class="mini-btn icon-btn icon-btn-sm"
            type="button"
            title="Revert the last transformation state"
            aria-label="Revert transformation"
            :disabled="!store.states.length"
            @click="revertTransformation"
          >
            <icon-reset />
          </button>
          <button
            class="mini-btn icon-btn icon-btn-sm"
            type="button"
            title="Clear the transform editor"
            aria-label="Clear transform editor"
            @click="setTransformEditorContent('')"
          >
            <icon-trash />
          </button>
        </div>
      </div>
      <div class="editor-shell editor-shell-lg">
        <code-editor :editor-id="store.editorIds.transformEditor" :initial-value="initialValue" />
      </div>
      <div class="run-controls">
        <label class="run-field">
          <span>Run mode</span>
          <select
            class="panel-input"
            :value="runSettings.runMode || 'until-stable'"
            @change="store.updateTemplateDraft('advanced-js-step', 'runMode', $event.target.value)"
          >
            <option value="once">Run 1 time</option>
            <option value="count">Run X times</option>
            <option value="until-stable">Run until no longer effective</option>
          </select>
        </label>
        <label v-if="runSettings.runMode === 'count'" class="run-field run-field-count">
          <span>Iterations</span>
          <input
            class="panel-input"
            type="number"
            min="1"
            step="1"
            :value="runSettings.maxIterations || 3"
            @input="store.updateTemplateDraft('advanced-js-step', 'maxIterations', $event.target.value)"
          >
        </label>
      </div>
    </article>
  </section>
</template>

<style scoped>
.advanced-section {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-height: 0;
}

.section-header,
.card-actions,
.card-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.section-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(13rem, max-content);
  align-items: center;
  column-gap: 0.75rem;
  row-gap: 0.6rem;
}

.card-header {
  justify-content: space-between;
}

.section-copy,
.panel-meta,
.card-note {
  color: var(--text-muted);
}

.section-copy {
  font-size: 0.92rem;
  max-width: 42rem;
}

.section-intro {
  flex: 1 1 16rem;
  min-width: 0;
}

.panel-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  white-space: nowrap;
  min-width: 13rem;
  justify-self: end;
  justify-content: flex-end;
  text-align: right;
}

.meta-icon {
  width: 1rem;
  height: 1rem;
}

.editor-card {
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  background: var(--panel-card);
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  min-height: 0;
}

.run-controls {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
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

.panel-input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  background: var(--panel-input);
  color: var(--text-primary);
  padding: 0.6rem 0.75rem;
}

.editor-shell {
  min-height: 15rem;
  height: clamp(15rem, 34vh, 22rem);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  overflow: hidden;
  background: #0b111b;
}

.editor-shell-lg {
  min-height: 16rem;
}

.mini-btn {
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  border-radius: 9px;
  cursor: pointer;
}

.mini-btn:hover:not(:disabled),
.mini-btn:focus-visible:not(:disabled) {
  background: rgba(126, 202, 255, 0.1);
  border-color: rgba(126, 202, 255, 0.24);
  outline: none;
}

.mini-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.mini-btn.emphasis {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: #081018;
  border-color: transparent;
}

.mini-btn.emphasis:hover:not(:disabled),
.mini-btn.emphasis:focus-visible:not(:disabled) {
  background: linear-gradient(135deg, #ffc778 0%, #ff9c60 100%);
  border-color: transparent;
}

.editor-shell :deep(.code-editor) {
  height: 100%;
}

@media (max-width: 900px) {
  .section-header {
    display: flex;
    justify-content: flex-start;
  }

  .panel-meta {
    min-width: 0;
    justify-self: auto;
    text-align: left;
  }

  .card-header {
    align-items: flex-start;
  }
}
</style>
