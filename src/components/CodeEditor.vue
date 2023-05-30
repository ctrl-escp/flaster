<script setup>
import { ref, onMounted } from 'vue';
import loader from "@monaco-editor/loader";
import { store } from '../store.js';

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
let monaco;
const currentHighlight = {
  id: 0,
  range: [0, 0],
};
function highlightSegment(startLineNumber, startColumn, endLineNumber, endColumn) {
  const editor = store.getEditor(store.editorIds[props.editorId]);
  const decorations = {
    range: new monaco.Range(startLineNumber, startColumn, endLineNumber, endColumn),
    options: {
      isWholeLine: false,
      className: 'highlighted-code',
    }
  };
  editor.deltaDecorations(currentHighlight.id, []);
  currentHighlight.id = editor.deltaDecorations([], [decorations]);
}

function highlightRange(start, end) {
  const ed = store.getEditor(store.editorIds[props.editorId]);
  if (!arguments.length) {
    ed.deltaDecorations(currentHighlight.id, []);
    currentHighlight.id = 0;
    currentHighlight.range = [0, 0];
  }
  else {
    const startPos = ed.getPositionAt(start);
    const endPos = ed.getPositionAt(end);
    currentHighlight.range = [start, end];
    highlightSegment(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column);
    scrollToLine(startPos.lineNumber);
  }
}

function scrollToLine(lineNo) {
  store.getEditor(store.editorIds[props.editorId]).editor.revealLine(lineNo, 0);
}

onMounted(() => loader.init().then((m) => {
  store.monaco = m;
  monaco = m;
  if (editorElement.value) {
    const editor = m.editor.create(editorElement.value, {
      value: props.initialValue,
      language: 'javascript',
      minimap: {enabled: false},
      theme: 'vs-dark',
      automaticLayout: true,
      smoothScrolling: true,
    });
    // noinspection JSUndefinedPropertyAssignment
    const model = m.editor.getModels().slice(-1)[0];
    editor.editorId = props.editorId;
    model.editor = editor;
    model.editorId = props.editorId;
    model.highlightRange = highlightRange;
    model.scrollToLine = scrollToLine;
  }
}));
</script>

<template>
    <div ref="editorElement" class="code-editor"></div>
</template>

<style scoped>
.code-editor {
  height: 100%;
  width: 100%;
}
</style>
