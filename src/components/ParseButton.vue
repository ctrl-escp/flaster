<script setup>
import store from '../store';
import {computed, onMounted, ref} from 'vue';
import IconParse from './icons/IconParse.vue';

const messages = {
  astParseFail: 'Unable to Parse AST',
  emptyCode: 'N/A',
};

const parsedStatusEl = ref(null);
const canParse = computed(() => store.canParseCurrentInput());
const parseTitle = computed(() => {
  if (!store.hasParsableInput()) {
    return 'Add or load a script before parsing';
  }

  if (store.isCurrentInputParsed()) {
    return 'The current script is already parsed';
  }

  return 'Parse the current script into AST nodes and rerun structure matching';
});

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
  store.parsedContentVersion = -1;
  setContentUnparsed();
  store.page = 0;
}

function parseContent() {
  if (!canParse.value) {
    return;
  }

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
        store.rerunKnownStructureMatching();
      }
      store.filteredNodes = store.arb.ast;
      store.markCurrentInputParsed();
      setContentParsed();
    }).catch((error) => store.logMessage(error.message, 'error'));
  } catch (error) {
    store.logMessage(error.message, 'error');
  }
}

onMounted(() => {
  store.resetParsedState = resetParsedState;
  store.parseContent = parseContent;
  store.tryAutoParseInitialInput = () => {
    if (!store.shouldAutoParseInitialInput || !canParse.value || !store.getEditor(store.editorIds.inputCodeEditor)) {
      return false;
    }

    store.shouldAutoParseInitialInput = false;
    parseContent();
    return true;
  };

  if (parsedStatusEl.value) {
    setContentUnparsed();
  }

  store.tryAutoParseInitialInput();
});
</script>

<template>
  <button
    class="toolbar-btn parse-btn"
    :class="{disabled: !canParse}"
    type="button"
    :disabled="!canParse"
    :title="parseTitle"
    aria-label="Parse script"
    @click="parseContent"
  >
    <icon-parse ref="parsedStatusEl" class="toolbar-icon unparsed" />
    <span class="parse-btn-label">Parse</span>
  </button>
</template>

<style scoped>
.toolbar-btn {
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
  padding: 0.5rem 0.8rem;
}

.toolbar-btn:disabled,
.toolbar-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.parse-btn-label {
  white-space: nowrap;
}

.unparsed {
  fill: #d05858;
}

.parsed {
  fill: #67df8d;
}

@media (max-width: 1100px) {
  .parse-btn-label {
    display: none;
  }

  .toolbar-btn {
    padding: 0.5rem;
  }
}
</style>
