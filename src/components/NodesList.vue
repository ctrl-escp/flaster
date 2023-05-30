<script setup>
import {computed, onMounted, watch} from 'vue';
import {store} from '../store.js';

let nodesToDisplay = [];

let highlightedNodeId = null;

function highlightCode(node) {
	if (node.nodeId === highlightedNodeId) {
		highlightedNodeId = null;
		store.getEditor(store.editorIds.inputCodeEditor).highlightRange();
	} else {
		if (highlightedNodeId !== null) {
			const previouslyHighlighted = document.querySelector(`div[data-nodeId="${highlightedNodeId}"]`);
			if (previouslyHighlighted) previouslyHighlighted.classList.remove('highlight');
		}
		highlightedNodeId = node.nodeId;
		store.getEditor(store.editorIds.inputCodeEditor).highlightRange(node.range[0], node.range[1]);
	}
	document.querySelector(`div[data-nodeid="${node.nodeId}"]`).classList.toggle('highlight');
}

const numberOfDisplayedNodes = computed(() => {
	let msg = '0/0';
	const allNodes = store.ast.length;
	const relevantLength = (store.areFiltersActive ? store.filteredNodes : store.ast).length;
	if (allNodes && relevantLength) msg = `${relevantLength} / ${allNodes}`;
	return msg;
});

onMounted(() => {
	watch(() => store.filteredNodes, () => nodesToDisplay = store.filteredNodes);
});

</script>

<template>
	<fieldset class="ast-list-wrapper">
		<legend>{{ numberOfDisplayedNodes }} nodes</legend>
		<div v-for="node of (store.areFiltersActive ? nodesToDisplay : store.ast)" :key="node.nodeId" class="node-container"
		     :data-nodeid="node.nodeId" @click="highlightCode(node)">
      <span class="node-type" :title="'NodeId: ' + node.nodeId">
        [<span class="node-parent-type"
               title="Parent node type">{{ node.parentNode ? node.parentNode.type + '=>' : '' }}</span>{{ node.type }}]
      </span>
			<span class="node-src" :title="node.src">{{ node.src.substring(0, 100) }}</span>
			<span class="node-length" :title="'length: ' + node.src.length">[<span>{{ node.src.length }}</span>]</span>
		</div>
	</fieldset>
</template>

<style scoped>
.ast-list-wrapper {
	padding: 5px;
	width: 100%;
	height: 50vh;
	overflow-y: auto;
}

/*noinspection CssUnusedSymbol*/
.highlight {
	background-color: rgba(255, 234, 0, 0.27);
}

legend {
	font-size: larger;
}

.node-container {
	margin: 5px 0;
}

.node-container > * {
	margin-right: 2px;
}

.node-length {
	float: right;
}

.node-parent-type {
	color: green;
	vertical-align: super;
	font-size: x-small;
}

.node-type {
	color: #41e804;
}
</style>
