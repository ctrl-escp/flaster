<script setup>
import {onMounted, ref} from 'vue';
import {store} from '../store.js';

const messages = {
  parseContent: 'Parse content',
  contentParsed: 'Content is parsed ',
  astParseFail: 'Unable to parse AST',
  emptyCode: 'No content',
};

const parsedStatus = ref(null);

function setContentParsed() {
  parsedStatus.value.classList.add('parsed');
  parsedStatus.value.classList.remove('unparsed');
  store.logMessage(messages.contentParsed, 'success');
}

function setContentUnparsed() {
  parsedStatus.value.classList.add('unparsed');
  parsedStatus.value.classList.remove('parsed');
}

function resetParsedState() {
  store.isContentParsed = false;
  store.ast = [];
  store.matchingNodes = [];
  setContentUnparsed();
  store.updateNodesInfoMsg();
  store.page = 0;
}

onMounted(() => {
  store.resetParsedState = resetParsedState;
  store.parseContent = parseContent;
  if (parsedStatus.value) setContentUnparsed();
});

function parseContent() {
  try {
    resetParsedState();
    const code = store.getEditor(store.editorIds.inputCodeEditor).state.doc.toString();
    if (!code.length) store.logMessage(messages.emptyCode, 'error');
    else {
      new Promise(() => {
        store.filteredNodes = store.ast = [];
        // noinspection JSValidateTypes
        store.ast = window.flast.generateFlatAST(code, {detailed: false});
        if (!store.ast.length) store.logMessage(messages.astParseFail, 'error');
        else store.logMessage(`Parsed ${code.length} chars into ${store.ast.length} nodes`, 'success');
        store.filteredNodes = store.ast;
      })
          .then(() => {
            debugger;

          })
          .catch(e => store.logMessage(e.message, 'error'));
    }
  } catch (e) {
    store.logMessage(e.message, 'error');
  }
}
</script>

<template>
  <button ref="parsedStatus" class="btn unparsed" @click="parseContent">{{ messages.parseContent }}</button>
</template>

<style scoped>

.unparsed {
  background-color: #d05858;
}

/*noinspection CssUnusedSymbol*/
.parsed {
  background-color: #41e804;
}
</style>
