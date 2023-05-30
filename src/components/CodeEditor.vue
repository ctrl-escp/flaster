<script setup>
import {store} from '../store.js';
import {ref, onMounted} from 'vue';
import {lintKeymap} from '@codemirror/lint';
import {EditorState} from '@codemirror/state';
import {javascript} from '@codemirror/lang-javascript';
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

function highlightSegment(startLineNumber, startColumn, endLineNumber, endColumn) {}

function highlightRange(start, end) {
	if (!arguments.length) {} else {}
}

function scrollToLine(lineNo) {}

onMounted(() => {
	const ed = new EditorView({
		parent: editorElement.value,
		theme: 'dracula',
		state: EditorState.create({
			doc: props.initialValue,
			extensions: [
				oneDark,
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightSpecialChars(),
				history(),
				foldGutter(),
				drawSelection(),
				dropCursor(),
				EditorState.allowMultipleSelections.of(true),
				indentOnInput(),
				syntaxHighlighting(oneDarkHighlightStyle, {fallback: true}),
				bracketMatching(),
				closeBrackets(),
				autocompletion(),
				rectangularSelection(),
				crosshairCursor(),
				highlightActiveLine(),
				highlightSelectionMatches(),
				keymap.of([
					...closeBracketsKeymap,
					...defaultKeymap,
					...searchKeymap,
					...historyKeymap,
					...foldKeymap,
					...completionKeymap,
					...lintKeymap,
				]),
				javascript(),
			],
		}),
	});
	ed.editorId = props.editorId;
	store.editors.push(ed);
});
</script>

<template>
	<div ref="editorElement"></div>
</template>

<style scoped>
</style>
