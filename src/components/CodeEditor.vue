<script setup>
import store from '../store';
import {ref, onMounted} from 'vue';
import {lintKeymap} from '@codemirror/lint';
import {EditorState} from '@codemirror/state';
import {javascript} from '@codemirror/lang-javascript';
import {StateEffect, StateField, SelectionRange} from '@codemirror/state';
import {defaultKeymap, history, historyKeymap} from '@codemirror/commands';
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
  Decoration,
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
  editorId: {
    type: String,
    require: true,
  },
  initialValue: {
    type: String,
    required: false,
    default: '',
  },
});

const editorElement = ref(null);

const highlightEffect = StateEffect.define();
const highlightRangeExt = StateField.define({
  create() {
    return Decoration.none;
  },
  update(value, transaction) {
    if (transaction.effects.some(effect => effect.is(highlightEffect))) {
      // Remove all previous decorations when a new highlight is set
      value = Decoration.none;
    }
    value = value.map(transaction.changes);
    for (let effect of [...transaction.effects].reverse()) {
      // Find the latest relevant effect and apply only it
      if (effect.is(highlightEffect)) {
        value = value.update({add: effect.value, sort: true});
        break;
      }
    }
    return value;
  },
  provide: f => EditorView.decorations.from(f),
});

const highlight_decoration = Decoration.mark({
  class: 'highlighted-code',
});

function highlightRange(start, end) {
  if (!arguments.length) {
    document.querySelectorAll('.highlighted-code').forEach(el => el.classList.remove('highlighted-code'));
  } else {
    // noinspection JSCheckFunctionSignatures
    this.dispatch({
      effects: highlightEffect.of([highlight_decoration.range(start, end)]),
    });
    const range = new SelectionRange(start, end);
    const ed = store.getEditor(store.editorIds.inputCodeEditor);
    ed?.dispatch({
      effects: EditorView.scrollIntoView(range, {
        y: 'center',
        x: 'center',
      }),
    });
  }
}

onMounted(() => {
  // noinspection JSCheckFunctionSignatures
  const editor = new EditorView({
    parent: editorElement.value,
    theme: 'dracula',
    state: EditorState.create({
      doc: props.initialValue,
      extensions: [
        autocompletion(),
        bracketMatching(),
        closeBrackets(),
        crosshairCursor(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        foldGutter(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        highlightRangeExt,
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
      ],
    }),
  });
  editor.editorId = props.editorId;
  editor.highlightRange = highlightRange;
  store.editors.push(editor);
});
</script>

<template>
  <div ref="editorElement" class="code-editor"></div>
</template>

<style scoped>
.code-editor {
  width: 100%;
  height: 100%;
}
</style>
