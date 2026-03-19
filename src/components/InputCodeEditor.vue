<script setup>
import store from '../store';
import CodeEditor from './CodeEditor.vue';

const initialValue = `/*
flASTer usage:

1. Paste JavaScript here or load a local file / saved sample from the top menu.
2. Samples parse automatically. For pasted code or loaded files, click Parse to build the AST and enable structure matching.
3. Use the Structure Explorer to match patterns, inspect results, and open transforms.
4. Apply built-in or custom transforms from the inspector when you are ready.

Replace this comment with the code you want to analyze.
*/`;

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
