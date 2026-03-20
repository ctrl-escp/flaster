<script setup>
import initialScript from '../initialScript.js?raw';
import store from '../store';
import CodeEditor from './CodeEditor.vue';

</script>

<template>
  <div class="code-editor-wrapper">
    <code-editor :editor-id="store.editorIds.inputCodeEditor" :initial-value="initialScript"/>
  </div>
</template>

<style scoped>
.code-editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

.code-editor-wrapper :deep(.code-editor) {
  flex: 1;
  min-height: 0;
}
</style>
