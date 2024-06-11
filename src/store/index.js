import {reactive} from 'vue';
import explorationStore from './exploration';
import transformationStore from './transformation';

/**
 * @typedef {import('@codemirror/view').EditorView} EditorView
 */

/**
 *
 * @param {string} editorId
 * @returns {EditorView<*>}
 */
function getEditor(editorId) {
  // noinspection JSUnresolvedReference
  return store.editors.find(e => e.editorId === editorId);
}

/**
 *
 * @param editor
 * @param content
 */
function setContent(editor, content) {
  editor.dispatch({
    changes: [
      {from: 0, to: editor.state.doc.length},
      {from: 0, insert: content},
    ],
  });
}

const store = reactive({
  currentTab: 'explore',
  // editor
  editors: [],
  editorIds: {
    inputCodeEditor: 'inputCodeEditor',
    filterEditor: 'filterEditor',
  },
  getEditor,
  setContent,
  // parsing
  ast: [],
  // eslint-disable-next-line no-unused-vars
  logMessage(text, level) {},
  ...explorationStore,
  ...transformationStore,
});

export default store;