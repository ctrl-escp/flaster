import {reactive} from 'vue';

export const store = reactive({
  // editor
  editors: [],
  editorIds: {
    inputCodeEditor: 'inputCodeEditor',
    filterEditor: 'filterEditor',
  },
  getEditor(editorId) {
    return this.editors.find(e => e.editorId === editorId);
  },
  // parsing
  ast: [],
  nodesPageSize: 100,
  page: 0,
  isContentParsed: false,
  filteredNodes: [],
  filters: [],
  areFiltersActive: true,
  // placeholders
  updateNodesInfoMsg() {},
  resetParsedState() {},
  parseContent() {},
  // eslint-disable-next-line no-unused-vars
  logMessage(text, level) {
  },
});