<script setup>
import store from '../store';
import IconFolder from './icons/IconFolder.vue';

const inputCodeEditorId = store.editorIds.inputCodeEditor;

function fileChanged(el) {
  const files = el.target?.files || [];
  let file;
  if (files.length) file = files[0];
  if (file) {
    file.text().then(c => {
      store.setContent(store.getEditor(inputCodeEditorId), c);
      store.resetParsedState();
    });
  } else {
    store.setContent(store.getEditor(inputCodeEditorId), '');
    store.resetParsedState();
  }
}
</script>

<template>
  <span>
    <icon-folder class="btn btn-load-file">
        <label><input class="inputFile" type="file" @change="fileChanged"></label>
    </icon-folder>
    <span class="top-btn-text">Load</span>
  </span>
</template>

<style scoped>
.btn-load-file {
  padding: 0;
  width: 2rem;
  height: 2rem;
  border: none;
}
.inputFile {
  display: none;
}
.top-btn-text {
  font-size: 1rem;
  @media (max-width: 700px) {
    display: none;
  }
}
</style>
