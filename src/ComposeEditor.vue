<script setup>
import store from './store';
import {onActivated} from 'vue';
import CodeEditor from './components/CodeEditor.vue';

function composeCode() {
  let code = `const fs = require('node:fs');
const {utils} = require('flast');
br(); // fake code that'll be replaced with a new line
const inputFilename = process.argv[2];
const code = fs.readFileSync(inputFilename, 'utf-8');
utils.logger.setLogLevelNone();  // Replace with setLogLevelDebug to debug
let script = code;
br();
`;
  for (const step of store.steps) {
    const filter = store.combineFilters(step?.filters.filter(f => f?.enabled && !!f?.src).map(f => f?.src));
    code += `script = utils.applyIteratively(script, [
  utils.treeModifier(
    (n, arb) => {return ${filter}},
    (n, arb) => {${step?.transformationCode}}
  )]);
br();
utils.logger.setLogLevelLog();
`;
  }
  code += `if (script !== code) {
  console.debug('[+] Transformation successful');
  console.log(script);
  fs.writeFileSync(inputFilename + '-flastered.js', script, 'utf-8');
} else console.log('[-] Nothing transformed :/');`;
  code = '// Generated via flASTer (https://ctrl-escp.github.io/flaster)\n' + window.flast.generateCode(window.flast.parseCode(code));
  return code.replaceAll('br();\n', '\n');
}

function downloadFlaster() {
  const src = store.getEditor(store.editorIds.composerEditor)?.state.doc.toString();
  const blob = new Blob([src], {type: 'text/javascript'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flaster.js';
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
        <button class="btn btn-download" @click="downloadFlaster()">Download</button>
        <button class="btn btn-copy" @click="copy()">Copy</button>
        <button class="btn btn-recompose" @click="recompose()">Re-compose</button>
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