import {reactive} from 'vue';

/**
 * @typedef {import('@codemirror/view').EditorView} EditorView
 */

/**
 *
 * @param {string} editorId
 * @returns {EditorView}
 */
function getEditor(editorId) {
  // noinspection JSUnresolvedReference
  return store.editors.find(e => e.editorId === editorId);
}

/**
 *
 * @param {EditorView} editor
 * @param {string} content
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
    transformEditor: 'transformEditor',
    composerEditor: 'composerEditor',
  },
  getEditor,
  setContent,
  // parsing
  ast: [],
  arb: {ast: []},
  states: [],
  saveState() {
    // noinspection JSUnresolvedReference
    this.states.push({
      script: store.arb.script,
      filters: this.filters,
      steps: this.steps,
      transformationCode: this.transformationCode,
    });
  },
  revertState() {
    if (this.states.length) {
      const state = this.states.shift();
      // noinspection JSValidateTypes
      this.loadNewScript(state.script);
      this.filters = state.filters;
      this.steps = state.steps;
      this.transformationCode = state.transformationCode;
    }
  },
  applyAndUpdateTransformation(transformSrc) {
    const changes = this.arb.applyChanges();
    if (changes > 0) {
      this.transformationCode = transformSrc;
      this.steps.push({
        filters: this.filters.filter(f => f.enabled),
        transformationCode: transformSrc,
      });
      this.logMessage(`${changes} changes were made`, 'success');
      this.loadNewScript(this.arb.script);
      return true;
    }
    this.logMessage('No changes made', 'error');
    return false;
  },
  loadNewScript(script) {
    this.setContent(this.getEditor(this.editorIds.inputCodeEditor), script);
    this.arb = new window.flast.Arborist(script);
    store.page = 0;
    this.filteredNodes = this.arb.ast;
    this.filters.length = 0;
  },
  combineFilters(filtersArr) {
    let filterSrc = `(${filtersArr[0]})\n`;
    for (const filter of filtersArr.slice(1)) {
      filterSrc += ` && (${filter})\n`;
    }
    return filterSrc;
  },
  steps: [],
  filters: [],
  transformationCode: '',
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

window.store = store;   // DEBUG
export default store;