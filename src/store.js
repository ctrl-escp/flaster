import {reactive} from 'vue';

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
  currentBottomPane: 'filter',
  changeViewTo(bottomPaneName) {this.currentBottomPane = bottomPaneName;},
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
  filters: [],
  // eslint-disable-next-line no-unused-vars
  logMessage(text, level) {},
  nodesPageSize: 100,
  page: 0,
  isTransformed: false,
  filteredNodes: [],
  areFiltersActive: true,
  // placeholders
  resetParsedState() {},
  parseContent() {},
});

export default store;