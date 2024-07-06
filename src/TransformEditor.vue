<script setup>
/* eslint-disable no-unused-vars */
import store from './store';
import CodeEditor from './components/CodeEditor.vue';

const initialValue = `// write the logic to apply to the node \`(n) => {<your code>}\`.
// to delete a node use arb.markNode(n);
// to replace a node with a new 'replacementNode' use arb.markNode(n, replacementNode);
const replacements = {Hello: 'General', there: 'Kenobi'};
if (replacements[n.value]) arb.markNode(n, {
  type: 'Literal',
  value: replacements[n.value]
});
`;

function applyTransformation(transformSrc) {
  transformSrc = transformSrc || store.getEditor(store.editorIds.transformEditor)?.state?.doc?.toString();
  if (!transformSrc) return store.logMessage('Missing transformation code', 'error');
  store.saveState();
  try {
    transformSrc = transformSrc.trim();
    // noinspection JSUnusedLocalSymbols
    const arb = store.arb;
    for (const n of store.filteredNodes) {
      eval(transformSrc);
    }
    if (!store.applyAndUpdateTransformation(transformSrc)) store.states.pop();
  } catch (e) {
    console.log(`Invalid transformer code: ${e.message}`);
    store.states.pop();
  }
}

function setTransformEditorContent(transformSrc) {
  store.setContent(store.getEditor(store.editorIds.transformEditor), transformSrc);
}

function revertTransformation() {
  store.revertState();
}

</script>

<template>
  <div class="transformer-controller" v-if="store.arb?.ast?.length">
    <div class="btn-group">
      <span class="transform-edit-btn-group">
        <button class="btn btn-apply" @click="applyTransformation()">Apply</button>
        <button class="btn btn-revert" @click="revertTransformation" :disabled="!store.states.length">Revert</button>
        <button class="btn btn-clear" @click="setTransformEditorContent('')">Clear</button>
      </span>
    </div>
    <div class="transformer-display">
      <fieldset class="transformer-editor-wrapper">
        <legend>Filter code</legend>
        <code-editor :editor-id="store.editorIds.transformEditor" :initial-value="initialValue"/>
      </fieldset>
    </div>
  </div>
</template>

<style scoped>
.btn-apply {
  background-color: greenyellow;
}
.btn-revert {
  background-color: crimson;
}
.btn-group {
  display: flex;
  justify-content: space-between;
}
.btn-group > * > button {
  margin-right: 5px;
}
.transformer-controller {
  margin-top: 5px;
  width: 100%;
}
.transformer-display {
  display: flex;
  flex-wrap: wrap;
  height: 90%;
}
.transform-edit-btn-group {
  display: flex;
}
.transformer-editor-wrapper {
  flex: 1;
  overflow: auto;
  padding: 0;
}
legend {
  font-size: larger;
}
</style>
