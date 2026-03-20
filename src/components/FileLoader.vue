<script setup>
import {computed, ref} from 'vue';
import store from '../store';
import IconBrowse from './icons/IconBrowse.vue';
import IconFolder from './icons/IconFolder.vue';
import IconListChecks from './icons/IconListChecks.vue';
import IconTrash from './icons/IconTrash.vue';
import IconArrowLeft from './icons/IconArrowLeft.vue';

const inputCodeEditorId = store.editorIds.inputCodeEditor;
const fileInput = ref(null);
const isOpen = ref(false);
const showSamples = ref(false);
const shouldHighlightLoad = computed(() =>
  store.currentScriptKind === 'custom' &&
  !store.isCurrentScriptModified,
);
const canClearEditor = computed(() => !!(
  store.getCurrentScriptContent().length ||
  store.isCurrentInputParsed() ||
  store.steps.length ||
  store.filters.length ||
  store.states.length ||
  store.hasKnownStructureResultsToClear() ||
  store.selectedNodeId !== null
));

function toggleMenu() {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) {
    showSamples.value = false;
  }
}

function closeMenu() {
  isOpen.value = false;
  showSamples.value = false;
}

function chooseFile() {
  fileInput.value?.click();
}

function chooseSamples() {
  showSamples.value = true;
}

function clearEditor() {
  const inputEditor = store.getEditor(inputCodeEditorId);

  if (inputEditor) {
    store.setContent(inputEditor, '');
  }

  store.activeSampleScriptId = null;
  store.resetParsedState();
  store.filteredNodes = [];
  store.filters.length = 0;
  store.steps = [];
  store.states = [];
  store.transformationCode = '';
  store.selectedPipelineStepIndex = -1;
  store.activeResultMode = 'matches';
  store.selectedNodeId = null;
  store.selectedNodeSource = null;
  store.setCurrentScriptSource({
    kind: 'custom',
    label: 'Custom script',
    baselineContent: '',
  });
  store.logMessage('Editor cleared', 'success');
  closeMenu();
}

function fileChanged(event) {
  const files = event.target?.files || [];
  const file = files[0];

  if (file) {
    file.text().then((content) => {
      store.setContent(store.getEditor(inputCodeEditorId), content);
      store.activeSampleScriptId = null;
      store.setCurrentScriptSource({
        kind: 'upload',
        label: file.name,
        baselineContent: content,
      });
      store.resetParsedState();
      closeMenu();
    });
    return;
  }

  closeMenu();
}

function loadSample(sampleId) {
  store.activeSampleScriptId = sampleId;
  store.loadSampleScript(sampleId);
  closeMenu();
}
</script>

<template>
  <div class="file-loader">
    <button
      class="toolbar-btn load-btn"
      :class="{highlighted: shouldHighlightLoad}"
      type="button"
      title="Open script actions for loading, sampling, or clearing the current script"
      aria-label="Open script actions"
      @click="toggleMenu"
    >
      <icon-folder class="toolbar-icon" />
      <span class="load-btn-label">Load</span>
    </button>

    <div v-if="isOpen" class="load-menu">
      <div v-if="!showSamples" class="menu-stack">
        
        <button class="menu-btn icon-action-btn" type="button" title="Choose from bundled sample scripts" @click="chooseSamples">
          <icon-list-checks class="menu-icon" />
          <span>Load sample</span>
        </button>
        <button class="menu-btn icon-action-btn" type="button" title="Load a local JavaScript file" @click="chooseFile">
          <icon-browse class="menu-icon" />
          <span>Load file</span>
        </button>
        <button
          class="menu-btn icon-action-btn"
          type="button"
          :disabled="!canClearEditor"
          :title="canClearEditor ? 'Clear the current script and reset parsed state' : 'There is nothing to clear right now'"
          @click="clearEditor"
        >
          <icon-trash class="menu-icon" />
          <span>Clear</span>
        </button>
      </div>

      <div v-else class="menu-stack">
        <button class="back-btn" type="button" title="Go back to load options" @click="showSamples = false">
          <icon-arrow-left class="menu-icon" />
          <span>Back</span>
        </button>
        <button
          v-for="sample in store.availableSampleScripts"
          :key="sample.id"
          class="sample-btn"
          type="button"
          :title="sample.description"
          @click="loadSample(sample.id)"
        >
          <strong>{{ sample.title }}</strong>
          <span>{{ sample.family }}</span>
        </button>
      </div>
    </div>

    <input ref="fileInput" class="input-file" type="file" @change="fileChanged">
  </div>
</template>

<style scoped>
.file-loader {
  position: relative;
  isolation: isolate;
}

.toolbar-btn {
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
  padding: 0.5rem 0.8rem;
}

.toolbar-btn.highlighted {
  border-color: rgba(0, 204, 255, 0.95);
  background: rgba(0, 204, 255, 0.22);
  box-shadow: 0 0 0 0 rgba(0, 204, 255, 0.7);
  animation: pulse-glow 2s infinite;
  position: relative;
  z-index: 1;
}

.toolbar-btn.highlighted:hover,
.toolbar-btn.highlighted:focus-visible {
  border-color: rgba(0, 204, 255, 1);
  background: rgba(0, 204, 255, 0.28);
  outline: none;
}

.toolbar-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.load-btn-label {
  white-space: nowrap;
}

@keyframes pulse-glow {
  0% {
    box-shadow:
      0 0 0 0 rgba(0, 204, 255, 0.7),
      0 0 9px rgba(0, 204, 255, 0.32);
  }

  100% {
    box-shadow:
      0 0 0 7.5px rgba(0, 204, 255, 0),
      0 0 12px rgba(0, 204, 255, 0.14);
  }
}

.load-menu {
  position: absolute;
  top: calc(100% + 0.45rem);
  left: 0;
  min-width: 14rem;
  max-width: 20rem;
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  background: #0f1724;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28);
  padding: 0.5rem;
  z-index: 10;
}

.menu-stack {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.menu-btn,
.sample-btn,
.back-btn {
  width: 100%;
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  padding: 0.6rem 0.75rem;
  text-align: left;
  cursor: pointer;
}

.icon-action-btn,
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.menu-btn:disabled,
.sample-btn:disabled,
.back-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.sample-btn {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.sample-btn span,
.back-btn {
  color: var(--text-muted);
}

.menu-icon {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
}

.input-file {
  display: none;
}

@media (max-width: 1100px) {
  .load-btn-label {
    display: none;
  }

  .toolbar-btn {
    padding: 0.5rem;
  }
}
</style>
