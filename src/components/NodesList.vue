<script setup>
import {store} from '../store.js';
import {computed, onMounted} from 'vue';

let highlightedNodeId = null;

function highlightCode(node) {
  const editor = store.getEditor(store.editorIds.inputCodeEditor);
  if (highlightedNodeId !== null) {
    const previouslyHighlighted = document.querySelector(`div[data-nodeId="${highlightedNodeId}"]`);
    if (previouslyHighlighted) previouslyHighlighted.classList.remove('highlight-node');
  }
  if (node.nodeId === highlightedNodeId) {
    highlightedNodeId = null;
    editor.highlightRange();
  } else {
    highlightedNodeId = node.nodeId;
    editor.highlightRange(node.range[0], node.range[1]);
    document.querySelector(`div[data-nodeid="${node.nodeId}"]`).classList.add('highlight-node');
  }
}

const relevatNodes = computed(() => store.areFiltersActive ? store.filteredNodes : store.ast);

const currentPageStartIndex = computed(() => Number(store.page * store.nodesPageSize));

const pagedNodes = computed(() => relevatNodes.value
  .slice(currentPageStartIndex.value, currentPageStartIndex.value + store.nodesPageSize));

const numberOfPages = computed(() => !isPaged.value ? 1 : Math.floor(relevatNodes.value.length / store.nodesPageSize));

const absCurrentPageStartIndex = computed(() => currentPageStartIndex.value < 0 ? relevatNodes.value.length + currentPageStartIndex.value : currentPageStartIndex.value);
const isFiltered = computed(() => store.filteredNodes.length < store.ast.length);
const isPaged = computed(() => relevatNodes.value.length > store.nodesPageSize);
const pageRange = computed(() => {
  const start = isPaged.value ? absCurrentPageStartIndex.value + 1 : 1;
  let end = absCurrentPageStartIndex.value + pagedNodes.value.length;
  end = end > relevatNodes.value.length ? relevatNodes.value.length : end;
  return `${start} - ${end}`;
});

const nextPage = () => store.page === numberOfPages.value ? store.page = 0 : store.page++;
const prevPage = () => !store.page ? store.page = numberOfPages.value : store.page--;

onMounted(() => {
});
</script>

<template>
  <fieldset class="ast-list-wrapper">
    <legend v-if="store.ast.length">
      <span class="paged" v-if="isPaged">
        <button class="prev-page" title="Previous page" @click="prevPage">&lt;</button>
        <button class="next-page" title="Next page" @click="nextPage">&gt;</button>
      </span>
      <span>{{pageRange}} / {{ store.ast.length }}{{isFiltered ? ' filtered' : ''}} out of {{store.ast.length}} nodes</span>
    </legend>
    <legend v-else>Nodes</legend>
    <div v-for="node of pagedNodes" :key="node.nodeId" class="node-container" :data-nodeid="node.nodeId" @click="highlightCode(node)">
      <span class="node-type" :title="'NodeId: ' + node.nodeId">
        [<span class="node-parent-type"
               title="Parent node type">{{ node.parentNode ? node.parentNode.type + '=>' : '' }}</span>{{ node.type }}]
      </span>
      <span class="node-src"
            title="Click to show node in code">{{ node.src?.substring ? node.src.substring(0, 100) : 'N/A' }}</span>
    </div>
  </fieldset>
</template>

<style scoped>
.ast-list-wrapper {
  flex: 1;
  padding: 5px;
  width: 100%;
  height: 50vh;
  overflow-y: auto;
}

.prev-page, .next-page {
  background-color: transparent;
  color: white;
  font-size: large;
}

/*noinspection CssUnusedSymbol*/
.highlight-node {
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

.node-parent-type {
  color: green;
  vertical-align: super;
  font-size: x-small;
}

.node-type {
  color: #41e804;
}

.paged {
  margin-inline-end: 10px;
}
</style>
