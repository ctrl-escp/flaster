<script setup>
import store from '../store';
import CodeEditor from './CodeEditor.vue';

const initialValue = `// This is the default code for flASTer
// Click the button at the top to load a file or paste directly into the editor
(function() {
  function createMessage() {return 'Hello' + ' ' + 'there';}
  function print(msg) {console.log(msg)}
  print(createMessage());
})();`;

</script>

<template>
  <div class="code-editor-wrapper">
    <code-editor :editor-id="store.editorIds.inputCodeEditor" :initial-value="initialValue"/>
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
