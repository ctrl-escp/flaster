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
	isContentParsed: false,
	filteredNodes: [],
	filters: [],
	areFiltersActive: true,
	parsingError: '',
	// placeholders
	updateNodesInfoMsg() {},
	resetParsedState() {},
	parseContent() {},
	logMessage(text, level) {},
});