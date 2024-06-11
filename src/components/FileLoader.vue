<script setup>
import store from '../store';
import {onMounted, ref} from 'vue';

const messages = {
  noFile: 'Load File',
  loaded: '',
};

const status = ref(null);
const inputCodeEditorId = store.editorIds.inputCodeEditor;

onMounted(() => {
  if (status.value) status.value.innerText = messages.noFile;
});

function fileChanged(el) {
  const files = el.target?.files || [];
  let file;
  if (files.length) file = files[0];
  if (file) {
    file.text().then(c => {
      store.setContent(store.getEditor(inputCodeEditorId), c);
      store.resetParsedState();
    });
    status.value.innerText = messages.loaded + file.name.substring(0, 30);
  } else {
    store.setContent(store.getEditor(inputCodeEditorId), '');
    status.value.innerText = messages.noFile;
    store.resetParsedState();
  }
}
</script>

<template>
  <div>
    <button class="btn btn-load-file">
      <label>
        <span class="file-status" ref="status"></span>
        <input class="inputFile" type="file" @change="fileChanged">
      </label>
    </button>

  </div>
</template>

<style scoped>
.btn-load-file {
  background-color: #a892cb;
}

.inputFile {
  display: none;
}
</style>
