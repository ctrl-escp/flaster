<script setup>
import {computed} from 'vue';
import {store} from '../store.js';
import CodeEditor from './CodeEditor.vue';
import IconCheckboxActive from './icons/IconCheckboxActive.vue';
import IconCheckboxInactive from './icons/IconCheckboxInactive.vue';
import IconTrash from './icons/IconTrash.vue';

const initialValue = `// write content for the filter function \`(n) => {<your code>}\`, like:
n.type === 'CallExpression' &&
n.callee.type === 'Identifier'`;

const messages = {
	disableFilters: 'Disable filters',
	enableFilters: 'Re-enable filters',
};

const numOfEnabledFilters = computed(() => store.filters.filter(f => f.enabled).length);
const numOfAvailableFilters = computed(() => store.filters.length);
const displayedNumOfFilters = computed(() => numOfAvailableFilters.value ? `${numOfEnabledFilters.value} / ${numOfAvailableFilters.value}` : 'No');

function applyFilter(filterSrc) {
	if (filterSrc && !store.filters.find(f => f.src === filterSrc)) {
		try {
			filterSrc = filterSrc.trim();
			store.filteredNodes = store.filteredNodes.filter(eval(`n => ${filterSrc}`));
			store.filters.push({
				src: filterSrc,
				enabled: true,
			});
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
}

function toggleFilter(filter) {
	filter.enabled = !filter.enabled;
	reapplyFilters();
}

function clearAllFilters() {
	store.filters = [];
	store.filteredNodes = store.ast;
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
	const editor = store.getEditor(store.editorIds.filterEditor);
	editor.dispatch({
		changes: {
			from: 0,
			to: editor.state.doc.length,
			insert: filterSrc
		}
	});
}
</script>

<template>
	<div class="filter-controller" v-if="store.ast.length">
		<div class="btn-group">
			<button class="btn btn-apply" @click="applyFilter(store.getEditor(store.editorIds.filterEditor).state.doc.toString())">Add
				filter
			</button>
			<button class="btn btn-clear" @click="setFilterEditorContent('')">Clear current code</button>
			<button class="btn btn-clear-all-filters" @click="clearAllFilters" :disabled="!numOfAvailableFilters">Clear all filters</button>
			<button class="btn btn-clear-all-filters" @click="store.areFiltersActive = !store.areFiltersActive" :disabled="!numOfAvailableFilters">
				{{ store.areFiltersActive ? messages.disableFilters : messages.enableFilters }}
			</button>
			<button class="btn btn-clear-all-filters" :disabled="!numOfEnabledFilters || numOfEnabledFilters < 2" @click="combineEnabledFilters">Combine active filters</button>
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
	overflow: hidden;
	overflow-y: auto;
	height: 100%;
}

.btn-apply {
	background-color: greenyellow;
}

.btn-clear-all-filters {
	float: right;
	margin-right: 0 !important;
	margin-left: 5px;
}

.btn-group > button {
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
	height: 92%;
}

.filter-editor-wrapper {
	overflow: auto;
	flex: 1;
	padding: 0;
}

.filter-line {
	display: flex;
}

.filter-src {
	width: 900px;
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
