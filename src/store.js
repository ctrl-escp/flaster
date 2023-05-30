import { reactive } from 'vue';

export const store = reactive({
	// editor
	monaco: undefined,
	editorIds: {
		inputCodeEditor: 'inputCodeEditor',
		filterEditor: 'filterEditor',
	},
	getEditor(editorId) {
		// noinspection JSUnresolvedReference
		return this.monaco.editor.getModels().find(m => m.editorId === editorId);
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
})