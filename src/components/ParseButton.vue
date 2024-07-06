<script setup>
import store from '../store';
import {onMounted, ref} from 'vue';
import IconParse from './icons/IconParse.vue';

const messages = {
  parseContent: 'Parse',
  contentParsed: 'Parsed ',
  astParseFail: 'Unable to Parse AST',
  emptyCode: 'N/A',
};

const parsedStatusEl = ref(null);

function setContentParsed() {
  /** @type {HTMLElement} */
  const ps = parsedStatusEl.value;
  store.getEditor(store.editorIds.inputCodeEditor).isParsed = true;
  ps?.classList?.add('parsed');
  ps?.classList?.remove('unparsed');
}

function setContentUnparsed() {
  /** @type {HTMLElement} */
  const ps = parsedStatusEl.value;
  const editor = store.getEditor(store.editorIds.inputCodeEditor);
  editor ? editor.isParsed = false : void 0;
  ps?.classList?.add('unparsed');
  ps?.classList?.remove('parsed');
}

function resetParsedState() {
  // noinspection JSValidateTypes
  store.arb = {ast: [], script: ''};
  store.matchingNodes = [];
  setContentUnparsed();
  store.page = 0;
}

onMounted(() => {
  store.resetParsedState = resetParsedState;
  store.parseContent = parseContent;
  if (parsedStatusEl.value) setContentUnparsed();
});

function parseContent() {
  try {
    resetParsedState();
    const code = store.getEditor(store.editorIds.inputCodeEditor)?.state.doc.toString();
    if (!code?.length) store.logMessage(messages.emptyCode, 'error');
    else {
      new Promise(() => {
        store.filteredNodes = [];
        // noinspection JSValidateTypes
        store.arb = new window.flast.Arborist(code);
        if (!store.arb?.ast?.length) store.logMessage(messages.astParseFail, 'error');
        else store.logMessage(`Parsed ${code.length} chars into ${store.arb.ast.length} nodes`, 'success');
        store.filteredNodes = store.arb.ast;
        setContentParsed();
      }).catch(e => store.logMessage(e.message, 'error'));
    }
  } catch (e) {
    store.logMessage(e.message, 'error');
  }
}

// TOOD: change to unparsed on content change
</script>

<template>
  <span>
    <icon-parse ref="parsedStatusEl" class="btn btn-parse unparsed" @click="parseContent"></icon-parse>
    <span class="top-btn-text">Parse</span>
  </span>
</template>

<style scoped>
.btn-parse {
  border: none;
  height: 2rem;
}
.unparsed {
  fill: #d05858;
}
/*noinspection CssUnusedSymbol*/
.parsed {
  fill: #41e804;
}
.top-btn-text {
  font-size: 1rem;
  @media (max-width: 700px) {
    display: none;
  }
}
</style>
