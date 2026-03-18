<script setup>
import {ref} from 'vue';
import store from '../store';
import IconFolder from './icons/IconFolder.vue';

const inputCodeEditorId = store.editorIds.inputCodeEditor;
const fileInput = ref(null);
const isOpen = ref(false);
const showSamples = ref(false);

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

function chooseUpload() {
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
      class="toolbar-btn"
      type="button"
      title="Open script actions for loading, sampling, or clearing the current script"
      @click="toggleMenu"
    >
      <icon-folder class="toolbar-icon" />
      <span>Script</span>
    </button>

    <div v-if="isOpen" class="load-menu">
      <div v-if="!showSamples" class="menu-stack">
        <button class="menu-btn" type="button" title="Upload a local JavaScript file" @click="chooseUpload">
          Upload file
        </button>
        <button class="menu-btn" type="button" title="Choose from bundled sample scripts" @click="chooseSamples">
          Load sample
        </button>
        <button class="menu-btn" type="button" title="Clear the current script and reset parsed state" @click="clearEditor">
          Clear
        </button>
      </div>

      <div v-else class="menu-stack">
        <button class="back-btn" type="button" title="Go back to load options" @click="showSamples = false">
          ‹ Back
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
}

.toolbar-btn {
  min-height: 2.5rem;
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  padding: 0.55rem 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
}

.toolbar-icon {
  width: 1.2rem;
  height: 1.2rem;
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

.sample-btn {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.sample-btn span,
.back-btn {
  color: var(--text-muted);
}

.input-file {
  display: none;
}
</style>
