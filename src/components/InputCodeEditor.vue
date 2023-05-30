<script setup>
import CodeEditor from './CodeEditor.vue';
import { store } from '../store.js';

const initialValue = `// This is the default code for flASTer
// Click the button at the top to load a file or paste directly into the editor
(function() {
  function helloWorld() { return 'hello world';}
  function print(msg) {console.log(msg)}
  print(helloWorld());
})();`;

</script>

<template>
  <fieldset class="code-editor-wrapper">
    <legend>Your code</legend>
    <code-editor :editor-id="store.editorIds.inputCodeEditor" :initial-value="initialValue"/>
  </fieldset>
</template>

<style scoped>
.code-editor-wrapper {
  padding: 0;
  width: 100%;
  height: 50vh;
}
legend {
  font-size: larger;
}
</style>
