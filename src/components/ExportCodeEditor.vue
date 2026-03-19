<script setup>
import {onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {EditorState} from '@codemirror/state';
import {javascript} from '@codemirror/lang-javascript';
import {defaultKeymap, history, historyKeymap} from '@codemirror/commands';
import {lintKeymap} from '@codemirror/lint';
import {highlightSelectionMatches, searchKeymap} from '@codemirror/search';
import {autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap} from '@codemirror/autocomplete';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import {oneDark, oneDarkHighlightStyle} from '@codemirror/theme-one-dark';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

const editorElement = ref(null);
let editor = null;
let applyingExternalValue = false;

function createExtensions() {
  return [
    autocompletion(),
    bracketMatching(),
    closeBrackets(),
    crosshairCursor(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (!update.docChanged || applyingExternalValue) {
        return;
      }

      emit('update:modelValue', update.state.doc.toString());
    }),
    foldGutter(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    highlightSelectionMatches(),
    highlightSpecialChars(),
    history(),
    indentOnInput(),
    javascript(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
    ]),
    lineNumbers(),
    oneDark,
    rectangularSelection(),
    syntaxHighlighting(oneDarkHighlightStyle, {fallback: true}),
    EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '0.95rem',
      },
      '.cm-scroller': {
        fontFamily: "'IBM Plex Mono', 'SFMono-Regular', monospace",
      },
      '.cm-gutters': {
        backgroundColor: '#0b111b',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'rgba(126, 202, 255, 0.12)',
      },
    }),
  ];
}

function syncEditorValue(nextValue) {
  if (!editor) {
    return;
  }

  const currentValue = editor.state.doc.toString();
  if (currentValue === nextValue) {
    return;
  }

  applyingExternalValue = true;
  editor.dispatch({
    changes: {
      from: 0,
      to: currentValue.length,
      insert: nextValue,
    },
  });
  applyingExternalValue = false;
}

onMounted(() => {
  editor = new EditorView({
    parent: editorElement.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: createExtensions(),
    }),
  });
});

onBeforeUnmount(() => {
  editor?.destroy();
  editor = null;
});

watch(() => props.modelValue, (nextValue) => {
  syncEditorValue(nextValue);
});
</script>

<template>
  <div ref="editorElement" class="export-code-editor"></div>
</template>

<style scoped>
.export-code-editor {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
