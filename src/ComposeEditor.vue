<script setup>
import store from './store';
import {onActivated} from 'vue';
import CodeEditor from './components/CodeEditor.vue';

function composeCode() {
  let code = `// Generated via flASTer (https://ctrl-escp.github.io/flaster)
const fs = require('node:fs');
const {
  utils: {runLoop, logger},
} = require('restringer').deobModules;

const inputFilename = process.argv[2];
const code = fs.readFileSync(inputFilename, 'utf-8');
// logger.setLogLevel(logger.logLevels.DEBUG); // Uncomment to debug
let script = code;

`;
  for (const step of store.steps) {
    const filter = store.combineFilters(step?.filters.filter(f => f?.enabled && !!f?.src).map(f => f?.src));
    code += `script = runLoop(script, [function(arb) {
  for (let i = 0; i < arb.ast.length; i++) {
    const n = arb.ast[i];
    if (${filter}) {
      ${step?.transformationCode}
    }
  }
  return arb;
  }]);

`;
  }
  code += `if (script !== code) {
  console.log('[+] Transformation successful');
  fs.writeFileSync(inputFilename + '-flastered.js', script, 'utf-8');
} else console.log('[-] Nothing transformed :/');`;
  return code;
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

onActivated(() => recompose());
</script>

<template>
  <div class="composer-controller">
    <div class="btn-group">
      <span class="composer-btn-group">
        <button class="btn btn-download" @click="downloadFlaster()">Download</button>
        <button class="btn btn-recompose" @click="recompose()">Re-compose</button>
      </span>
    </div>
    <div class="composer-display">
      <fieldset class="composer-editor-wrapper">
        <legend>Complete code</legend>
        <code-editor :editor-id="store.editorIds.composerEditor" :initial-value="composeCode()"/>
      </fieldset>
    </div>
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
.composer-controller {
  margin-top: 5px;
  width: 100%;
}
.composer-display {
  display: flex;
  flex-wrap: wrap;
  height: 90%;
}
.composer-editor-wrapper {
  flex: 1;
  overflow: auto;
  padding: 0;
}
legend {
  font-size: larger;
}
</style>