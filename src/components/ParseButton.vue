<script setup>
import {onMounted, ref} from 'vue';
import { store } from '../store.js';

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
  parsedStatus.value.innerText = messages.contentParsed;
}

function setContentUnparsed() {
  parsedStatus.value.classList.add('unparsed');
  parsedStatus.value.classList.remove('parsed');
  parsedStatus.value.innerText = store.parsingError || messages.parseContent;
}

function resetParsedState() {
  store.parsingError = '';
  store.isContentParsed = false;
  store.ast = [];
  store.matchingNodes = [];
  setContentUnparsed();
  store.updateNodesInfoMsg();
}

onMounted(() => {
  store.resetParsedState = resetParsedState;
  store.parseContent = parseContent;
  if (parsedStatus.value) setContentUnparsed();
});

function parseContent() {
  try {
    resetParsedState();
    const code = store.getEditor(store.editorIds.inputCodeEditor).getValue();
    if (!code.length) store.parsingError = messages.emptyCode;
    else {
      // eslint-disable-next-line no-undef
      store.ast = flast.generateFlatAST(code);
      if (!store.ast.length) store.parsingError = messages.astParseFail;
    }
  } catch (e) {
    store.parsingError = e.message;
  }
  store.parsingError ? setContentUnparsed() : setContentParsed();
  store.filteredNodes = store.ast;
}
</script>

<template>
  <div>
    <button ref="parsedStatus" class="btn-parse unparsed" @click="parseContent"></button>
  </div>
</template>

<style scoped>
.btn-parse {
  border-radius: 8px;
  padding: 3px 8px;
  font-size: large;
}
.unparsed {
  background-color: #d05858;
}

/*noinspection CssUnusedSymbol*/
.parsed {
  background-color: #41e804;
}
</style>
