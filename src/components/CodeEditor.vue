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

/**
 * @typedef {{
 *   from: number,
 *   to: number,
 *   className?: string,
 * }} EditorHighlightRange
 */

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

/**
 * Creates a CodeMirror decoration range from normalized highlight metadata.
 *
 * @param {EditorHighlightRange} range
 * @returns {import('@codemirror/view').Range<Decoration>}
 */
function createHighlightDecoration(range) {
  const className = range.className || 'highlighted-code';
  return Decoration.mark({class: className}).range(range.from, range.to);
}

function highlightRange(start, end) {
  if (!arguments.length) {
    this.dispatch({
      effects: highlightEffect.of([]),
    });
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

/**
 * Applies one or more persistent highlight ranges to the editor and optionally
 * scrolls the active range into view.
 *
 * @this {EditorView}
 * @param {EditorHighlightRange[]} ranges
 * @param {EditorHighlightRange | null} [activeRange=null]
 * @param {{scrollToActive?: boolean}} [options={}]
 * @returns {void}
 */
function highlightRanges(ranges, activeRange = null, options = {}) {
  const normalizedRanges = Array.isArray(ranges)
    ? ranges
      .filter((range) => Number.isInteger(range?.from) && Number.isInteger(range?.to) && range.from < range.to)
      .map((range) => createHighlightDecoration(range))
    : [];

  this.dispatch({
    effects: highlightEffect.of(normalizedRanges),
  });

  if (!options.scrollToActive ||
    !activeRange ||
    !Number.isInteger(activeRange.from) ||
    !Number.isInteger(activeRange.to)) {
    return;
  }

  const range = new SelectionRange(activeRange.from, activeRange.to);
  this.dispatch({
    effects: EditorView.scrollIntoView(range, {
      y: 'center',
      x: 'center',
    }),
  });
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
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || props.editorId !== store.editorIds.inputCodeEditor) {
            return;
          }

          const content = update.state.doc.toString();
          store.handleInputEditorChange();

          if (store.currentScriptKind === 'custom') {
            store.markCurrentScriptAsCustom(content);
            return;
          }

          store.updateCurrentScriptDirtyState(content);
        }),
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
  editor.highlightRanges = highlightRanges;
  store.editors.push(editor);

  if (props.editorId === store.editorIds.inputCodeEditor && store.currentScriptKind === 'custom') {
    store.setCurrentScriptSource({
      kind: 'custom',
      label: store.currentScriptLabel,
      baselineContent: editor.state.doc.toString(),
    });

    store.tryAutoParseInitialInput();
  }
});
</script>

<template>
  <div ref="editorElement" class="code-editor"></div>
</template>

<style scoped>
.code-editor {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
