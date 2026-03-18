<script setup>
import store from './store';
import {onActivated} from 'vue';
import CodeEditor from './components/CodeEditor.vue';
import IconExport from './components/icons/IconExport.vue';
import IconCopy from './components/icons/IconCopy.vue';
import IconRefresh from './components/icons/IconRefresh.vue';
import {
  composeTransformationScript,
  getGeneratedScriptFilename,
} from './composition/scriptGenerator.js';

function composeCode() {
  return composeTransformationScript({
    steps: store.steps,
    combineFilters: store.combineFilters,
  });
}

function downloadFlaster() {
  const src = store.getEditor(store.editorIds.composerEditor)?.state.doc.toString();
  const blob = new Blob([src], {type: 'text/javascript'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getGeneratedScriptFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function recompose() {
  store.setContent(store.getEditor(store.editorIds.composerEditor), composeCode());
}

function copy() {
  navigator.clipboard.writeText(store.getEditor(store.editorIds.composerEditor)?.state.doc.toString());
}

onActivated(() => recompose());
</script>

<template>
  <div class="composer-controller">
    <div class="btn-group">
      <span class="composer-btn-group">
        <button class="btn btn-download icon-btn" title="Download the generated script" aria-label="Download script" @click="downloadFlaster()">
          <icon-export />
        </button>
        <button class="btn btn-copy icon-btn" title="Copy the generated script" aria-label="Copy script" @click="copy()">
          <icon-copy />
        </button>
        <button class="btn btn-recompose icon-btn" title="Re-compose the generated script from the current pipeline" aria-label="Re-compose script" @click="recompose()">
          <icon-refresh />
        </button>
      </span>
    </div>
    <fieldset class="composer-editor-wrapper">
      <legend>Complete code</legend>
      <code-editor :editor-id="store.editorIds.composerEditor" :initial-value="composeCode()"/>
    </fieldset>
  </div>
</template>

<style scoped>
.btn-download {
  background-color: greenyellow;
}
.btn-recompose {
  background-color: crimson;
}
.btn-group {
  display: flex;
  justify-content: space-between;
}
.btn-group > * > button {
  margin-right: 5px;
}
.composer-btn-group {
  display: flex;
}
.composer-controller {
  margin-top: .2rem;
  width: 100%;
}
.composer-editor-wrapper {
  flex: 1;
  overflow: auto;
  padding: 0;
  max-height: 37vh;
  min-inline-size: 40vw;
}
legend {
  font-size: larger;
}
</style>
