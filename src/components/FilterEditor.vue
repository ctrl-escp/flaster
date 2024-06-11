<script setup>
import store from '../store';
import {computed} from 'vue';
import CodeEditor from './CodeEditor.vue';
import IconCheckboxActive from './icons/IconCheckboxActive.vue';
import IconCheckboxInactive from './icons/IconCheckboxInactive.vue';
import IconTrash from './icons/IconTrash.vue';

const initialValue = `// write content for the filter function \`(n) => {<your code>}\`, like:
n.type === 'CallExpression' &&
n.callee.type === 'Identifier'`;

const messages = {
  disableFilters: 'Disable all',
  enableFilters: 'Enable all',
};

const numOfEnabledFilters = computed(() => store.filters.filter(f => f.enabled).length);
const numOfAvailableFilters = computed(() => store.filters.length);
const displayedNumOfFilters = computed(() => numOfAvailableFilters.value ? `${numOfEnabledFilters.value} / ${numOfAvailableFilters.value}` : 'No');

function applyFilter(filterSrc) {
  if (filterSrc && !store.filters.find(f => f.src === filterSrc)) {
    try {
      filterSrc = filterSrc.trim();
      store.filteredNodes = store.filteredNodes.filter(eval(`n => ${filterSrc}`));
      // noinspection JSCheckFunctionSignatures
      store.filters.push({
        src: filterSrc,
        enabled: true,
      });
      store.page = 0;
    } catch (e) {
      console.log(`Invalid filter code: ${e.message}`);
    }
  }
}

function reapplyFilters() {
  const availableFilters = store.filters;
  store.filters = [];
  store.filteredNodes = store.ast;
  for (const filter of availableFilters) {
    if (filter.enabled) applyFilter(filter.src);
    else store.filters.push(filter);
  }
  store.page = 0;
}

function toggleFilter(filter) {
  filter.enabled = !filter.enabled;
  reapplyFilters();
}

function clearAllFilters() {
  store.filters = [];
  store.filteredNodes = store.ast;
  store.page = 0;
}

function deleteFilter(filter) {
  store.filters = store.filters.filter(f => f !== filter);
  reapplyFilters();
}

function combineEnabledFilters() {
  const enabledFilters = store.filters.filter(f => f.enabled);
  if (enabledFilters.length > 1) {
    let filterString = `(${enabledFilters[0].src})\n`;
    for (const filter of enabledFilters.slice(1)) {
      filterString += ` && (${filter.src})\n`;
    }
    store.filters = store.filters.filter(f => !enabledFilters.includes(f));
    applyFilter(filterString);
  }
}

function setFilterEditorContent(filterSrc) {
  store.setContent(store.getEditor(store.editorIds.filterEditor),filterSrc);
}
</script>

<template>
  <div class="filter-controller" v-if="store.ast.length">
    <div class="btn-group">
      <span class="filter-edit-btn-group">
        <button class="btn btn-apply" @click="applyFilter(store.getEditor(store.editorIds.filterEditor).state.doc.toString())">Add</button>
        <button class="btn btn-clear" @click="setFilterEditorContent('')">Clear</button>
      </span>
      <span class="applied-filters-btn-group">
        <button class="btn btn-clear-all-filters" @click="clearAllFilters" :disabled="!numOfAvailableFilters">Clear all</button>
        <button class="btn btn-clear-all-filters" @click="store.areFiltersActive = !store.areFiltersActive"
                :disabled="!numOfAvailableFilters">
          {{ store.areFiltersActive ? messages.disableFilters : messages.enableFilters }}
        </button>
        <button class="btn btn-clear-all-filters" :disabled="!numOfEnabledFilters || numOfEnabledFilters < 2" @click="combineEnabledFilters">Combine active</button>
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
          <span class="filter-src" :title="filter.src" @click="setFilterEditorContent(filter.src)">{{
              filter.src
            }}</span>
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

.filter-controller {
  margin-top: 5px;
  width: 100%;
}

.filter-display {
  display: flex;
  flex-wrap: wrap;
  height: 90%;
}

.filter-editor-wrapper {
  flex: 1;
  overflow: auto;
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
}

legend {
  font-size: larger;
}
</style>
