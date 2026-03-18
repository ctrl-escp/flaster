<script setup>
import store from './store';
import {computed} from 'vue';
import CodeEditor from './components/CodeEditor.vue';
import IconTrash from './components/icons/IconTrash.vue';
import IconCheckboxActive from './components/icons/IconCheckboxActive.vue';
import IconCheckboxInactive from './components/icons/IconCheckboxInactive.vue';
import IconPlus from './components/icons/IconPlus.vue';
import IconEye from './components/icons/IconEye.vue';
import IconStructure from './components/icons/IconStructure.vue';

const initialValue = `// write content for the filter function \`(n) => {<your code>}\`, like:
n.type === 'Literal' &&
n.value.trim().length`;

const messages = {
  disableFilters: 'Disable all',
  enableFilters: 'Enable all',
};

const numOfEnabledFilters = computed(() => store.filters.filter(f => f?.enabled).length);
const numOfAvailableFilters = computed(() => store.filters.length);
const displayedNumOfFilters = computed(() => numOfAvailableFilters.value ? `${numOfEnabledFilters.value} / ${numOfAvailableFilters.value}` : 'No');

function findFilter(filterSrc) {
  return store.findFilter(filterSrc);
}

function applyFilter(filterSrc) {
  return store.addFilter(filterSrc, {
    label: 'Advanced filter',
    templateType: 'advanced-js-step',
    selectionSource: {
      kind: 'advanced-js',
    },
  });
}

function reapplyFilters() {
  store.reapplyFilters();
}

function toggleFilter(filter) {
  store.toggleFilterEnabled(filter);
}

function clearAllFilters() {
  store.clearAllFilters();
}

function deleteFilter(filter) {
  store.deleteFilter(filter);
}

function combineEnabledFilters() {
  store.combineEnabledFilters();
}

function setFilterEditorContent(filterSrc) {
  store.setContent(store.getEditor(store.editorIds.filterEditor), filterSrc);
}

function addNewFilter() {
  const filterSrc = store.getEditor(store.editorIds.filterEditor)?.state.doc.toString();
  if (!findFilter(filterSrc)) applyFilter(filterSrc);
  else store.logMessage('Filter already exists', 'info');
}

</script>

<template>
  <div class="filter-controller" v-if="store.arb?.ast?.length">
    <div class="btn-group">
      <span class="filters-btn-group">
        <button class="btn btn-apply icon-btn" title="Add the current filter editor code as a filter" aria-label="Add filter" @click="addNewFilter"><icon-plus /></button>
        <button class="btn btn-clear icon-btn" title="Clear the filter editor" aria-label="Clear filter editor" @click="setFilterEditorContent('')"><icon-trash /></button>
      </span>
      <span class="filters-btn-group">
        <button class="btn btn-clear-all-filters icon-btn" title="Clear all applied filters" aria-label="Clear all filters" @click="clearAllFilters" :disabled="!numOfAvailableFilters"><icon-trash /></button>
        <button class="btn btn-clear-all-filters icon-btn" @click="store.areFiltersActive = !store.areFiltersActive"
                :disabled="!numOfAvailableFilters" :title="store.areFiltersActive ? messages.disableFilters : messages.enableFilters" :aria-label="store.areFiltersActive ? messages.disableFilters : messages.enableFilters"><icon-eye />
        </button>
        <button class="btn btn-clear-all-filters icon-btn" :disabled="!numOfEnabledFilters || numOfEnabledFilters < 2" title="Combine all active filters into one filter" aria-label="Combine active filters" @click="combineEnabledFilters"><icon-structure /></button>
      </span>
    </div>
    <div class="filter-display">
      <fieldset class="filter-editor-wrapper">
        <legend>Filter code</legend>
        <code-editor :editor-id="store.editorIds.filterEditor" :initial-value="initialValue"/>
      </fieldset>
      <fieldset class="applied-filters-wrapper">
        <legend><span>{{ displayedNumOfFilters }} </span> Filters Applied</legend>
        <div v-for="filter of store.filters" :key="filter" class="filter-line">
          <span class="btn-group-inline" @click="toggleFilter(filter)"
                :title="'Click to ' + (filter.enabled ? 'disable' : 'enable') + ' filter'">
            <icon-checkbox-active class="icon-inline" v-if="filter.enabled"/>
            <icon-checkbox-inactive class="icon-inline" v-else/>
          </span>
          <span class="filter-src" :title="filter.src" @click="setFilterEditorContent(filter.src)">{{ filter.src }}</span>
          <icon-trash class="icon-inline" @click="deleteFilter(filter)" title="Delete filter"/>
        </div>
      </fieldset>
    </div>
  </div>
</template>

<style scoped>
.applied-filters-wrapper {
  flex: 1;
  padding: 5px;
  overflow: auto;
  min-width: 41%;
}
.applied-filters-wrapper > fieldset {
  min-width: 40vw;
}
.btn-apply {
  background-color: greenyellow;
}
.btn-clear-all-filters {
  float: right;
  margin-right: 0 !important;
  margin-left: 5px;
}
.btn-group {
  display: flex;
  justify-content: space-between;
}
.btn-group > * > button {
  margin-right: 5px;
}
.btn-group-inline {
  display: flex;
  align-items: center;
  float: right;
  margin-right: 5px;
}
.filters-btn-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}
.filter-controller {
  margin-top: 5px;
  width: 100%;
  display: flex;
  flex-direction: column;
}
.filter-display {
  display: flex;
  flex-wrap: wrap;
  height: 90%;
}
.filter-editor-wrapper {
  flex: 1;
  padding: 0;
}
.filter-line {
  display: flex;
  flex: 1;
}
.filter-src {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.icon-inline {
  cursor: pointer;
  width: 20px;
  margin: 0 .3rem;
}
legend {
  font-size: larger;
}
</style>
