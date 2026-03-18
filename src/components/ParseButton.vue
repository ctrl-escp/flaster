<script setup>
import store from '../store';
import {onMounted, ref} from 'vue';
import IconParse from './icons/IconParse.vue';

const messages = {
  astParseFail: 'Unable to Parse AST',
  emptyCode: 'N/A',
};

const parsedStatusEl = ref(null);

function setContentParsed() {
  const icon = parsedStatusEl.value;
  store.getEditor(store.editorIds.inputCodeEditor).isParsed = true;
  icon?.classList?.add('parsed');
  icon?.classList?.remove('unparsed');
}

function setContentUnparsed() {
  const icon = parsedStatusEl.value;
  const editor = store.getEditor(store.editorIds.inputCodeEditor);
  if (editor) {
    editor.isParsed = false;
  }
  icon?.classList?.add('unparsed');
  icon?.classList?.remove('parsed');
}

function resetParsedState() {
  store.arb = {ast: [], script: ''};
  store.clearKnownStructureResults();
  setContentUnparsed();
  store.page = 0;
}

function parseContent() {
  try {
    resetParsedState();
    const code = store.getEditor(store.editorIds.inputCodeEditor)?.state.doc.toString();

    if (!code?.length) {
      store.logMessage(messages.emptyCode, 'error');
      return;
    }

    new Promise(() => {
      store.filteredNodes = [];
      store.arb = new window.flast.Arborist(code);
      store.markKnownStructureInputChanged();
      if (!store.arb?.ast?.length) {
        store.logMessage(messages.astParseFail, 'error');
      } else {
        store.logMessage(`Parsed ${code.length} chars into ${store.arb.ast.length} nodes`, 'success');
        store.rerunKnownStructureMatching();
      }
      store.filteredNodes = store.arb.ast;
      setContentParsed();
    }).catch((error) => store.logMessage(error.message, 'error'));
  } catch (error) {
    store.logMessage(error.message, 'error');
  }
}

onMounted(() => {
  store.resetParsedState = resetParsedState;
  store.parseContent = parseContent;
  if (parsedStatusEl.value) {
    setContentUnparsed();
  }
});
</script>

<template>
  <button class="toolbar-btn parse-btn" type="button" title="Parse the current script into AST nodes and rerun structure matching" @click="parseContent">
    <icon-parse ref="parsedStatusEl" class="toolbar-icon unparsed" />
    <span>Parse</span>
  </button>
</template>

<style scoped>
.toolbar-btn {
  min-height: 2.5rem;
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  padding: 0.55rem 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
}

.toolbar-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.unparsed {
  fill: #d05858;
}

.parsed {
  fill: #67df8d;
}
</style>
