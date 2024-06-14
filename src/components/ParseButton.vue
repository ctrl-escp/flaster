<script setup>
import store from '../store';
import {onMounted, ref} from 'vue';

const messages = {
  parseContent: 'Parse Content',
  contentParsed: 'Content is Parsed ',
  astParseFail: 'Unable to Parse AST',
  emptyCode: 'No Content',
};

const parsedStatusEl = ref(null);

function setContentParsed() {
  /** @type {HTMLElement} */
  const ps = parsedStatusEl.value;
  store.getEditor(store.editorIds.inputCodeEditor).isParsed = true;
  ps.classList.add('parsed');
  ps.classList.remove('unparsed');
}

function setContentUnparsed() {
  /** @type {HTMLElement} */
  const ps = parsedStatusEl.value;
  const editor = store.getEditor(store.editorIds.inputCodeEditor);
  editor ? editor.isParsed = false : void 0;
  ps.classList.add('unparsed');
  ps.classList.remove('parsed');
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
    const code = store.getEditor(store.editorIds.inputCodeEditor).state.doc.toString();
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
  <button ref="parsedStatusEl" class="btn unparsed" @click="parseContent">{{ messages.parseContent }}</button>
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
