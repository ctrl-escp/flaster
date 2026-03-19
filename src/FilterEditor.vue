<script setup>
import {computed, ref} from 'vue';
import store from './store';
import CodeEditor from './components/CodeEditor.vue';
import IconCheck from './components/icons/IconCheck.vue';
import IconClose from './components/icons/IconClose.vue';
import IconEye from './components/icons/IconEye.vue';
import IconFilter from './components/icons/IconFilter.vue';
import IconPlus from './components/icons/IconPlus.vue';
import IconStructure from './components/icons/IconStructure.vue';
import IconTrash from './components/icons/IconTrash.vue';

const props = defineProps({
  createStructure: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['complete']);

const initialValue = `// write content for the filter function \`(n) => {<your code>}\`, like:
n.type === 'Literal' &&
n.value?.trim?.()?.length`;

const messages = {
  disableFilters: 'Disable all active filters',
  enableFilters: 'Enable all saved filters',
};

const enabledFilters = computed(() => store.filters.filter((filter) => filter?.enabled));
const numOfEnabledFilters = computed(() => enabledFilters.value.length);
const numOfAvailableFilters = computed(() => store.filters.length);
const structureName = ref('');
const filterSummary = computed(() => {
  if (!numOfAvailableFilters.value) {
    return 'No saved filters';
  }

  return `${numOfEnabledFilters.value} of ${numOfAvailableFilters.value} active`;
});

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
  const filterSrc = store.getEditor(store.editorIds.filterEditor)?.state.doc.toString()?.trim();

  if (!filterSrc) {
    store.logMessage('Missing filter code', 'error');
    return;
  }

  if (!findFilter(filterSrc)) {
    applyFilter(filterSrc);
  } else {
    store.logMessage('Filter already exists', 'info');
  }
}

function addNewStructure() {
  const filterSrc = store.getEditor(store.editorIds.filterEditor)?.state.doc.toString()?.trim();
  const nextStructure = store.addCustomKnownStructure(structureName.value, filterSrc);

  if (!nextStructure) {
    return;
  }

  structureName.value = '';
  store.setContent(store.getEditor(store.editorIds.filterEditor), initialValue);
  emit('complete', nextStructure);
}
</script>

<template>
  <section v-if="store.arb?.ast?.length" class="advanced-section">
    <div class="section-header">
      <div class="section-intro">
        <h3>Define New Structure</h3>
        <p class="section-copy">Write a reusable structure rule as a filter and save it alongside the built-in structures.</p>
      </div>
      <div class="panel-meta">
        <icon-filter class="meta-icon" />
        <span>{{ filterSummary }}</span>
      </div>
    </div>

    <div class="advanced-grid">
      <article class="editor-card">
        <div class="card-header">
          <h4>Structure rule</h4>
          <div class="card-actions">
            <button
              class="mini-btn icon-btn icon-btn-sm emphasis"
              type="button"
              :title="createStructure ? 'Add this rule as a new structure' : 'Save the current filter editor code as a reusable filter'"
              :aria-label="createStructure ? 'Add new structure' : 'Add filter'"
              @click="createStructure ? addNewStructure() : addNewFilter()"
            >
              <icon-plus />
            </button>
            <button
              class="mini-btn icon-btn icon-btn-sm"
              type="button"
              title="Clear the filter editor"
              aria-label="Clear filter editor"
              @click="setFilterEditorContent('')"
            >
              <icon-trash />
            </button>
            <template v-if="!createStructure">
            <button
              class="mini-btn icon-btn icon-btn-sm"
              type="button"
              :disabled="!numOfAvailableFilters"
              title="Clear all saved filters"
              aria-label="Clear all filters"
              @click="clearAllFilters"
            >
              <icon-close />
            </button>
            <button
              class="mini-btn icon-btn icon-btn-sm"
              type="button"
              :disabled="!numOfAvailableFilters"
              :title="store.areFiltersActive ? messages.disableFilters : messages.enableFilters"
              :aria-label="store.areFiltersActive ? messages.disableFilters : messages.enableFilters"
              @click="store.areFiltersActive = !store.areFiltersActive"
            >
              <icon-eye />
            </button>
            <button
              class="mini-btn icon-btn icon-btn-sm"
              type="button"
              :disabled="numOfEnabledFilters < 2"
              title="Combine all active filters into one filter"
              aria-label="Combine active filters"
              @click="combineEnabledFilters"
            >
              <icon-structure />
            </button>
            </template>
          </div>
        </div>
        <label v-if="createStructure" class="name-field">
          <span class="name-label">Structure name</span>
          <input
            v-model="structureName"
            class="name-input"
            type="text"
            placeholder="Custom Structure"
          >
        </label>
        <div class="editor-shell">
          <code-editor :editor-id="store.editorIds.filterEditor" :initial-value="initialValue" />
        </div>
      </article>

      <article v-if="!createStructure" class="list-card">
        <div class="card-header">
          <h4>Saved filters</h4>
          <span class="card-note">{{ numOfAvailableFilters ? `${numOfAvailableFilters} total` : 'Nothing saved yet' }}</span>
        </div>
        <div v-if="store.filters.length" class="filter-list">
          <article
            v-for="filter in store.filters"
            :key="filter.src"
            class="filter-item"
          >
            <button
              class="filter-state"
              :class="{active: filter.enabled}"
              type="button"
              :title="filter.enabled ? 'Disable filter' : 'Enable filter'"
              :aria-label="filter.enabled ? 'Disable filter' : 'Enable filter'"
              @click.stop="toggleFilter(filter)"
            >
              <icon-check v-if="filter.enabled" />
            </button>
            <span class="filter-actions">
              <button
                class="mini-btn icon-btn icon-btn-sm"
                type="button"
                title="Delete filter"
                aria-label="Delete filter"
                @click.stop="deleteFilter(filter)"
              >
                <icon-trash />
              </button>
            </span>
            <button
              class="filter-preview-btn"
              type="button"
              :title="filter.src"
              @click="setFilterEditorContent(filter.src)"
            >
              <span class="filter-preview">{{ filter.src }}</span>
            </button>
          </article>
        </div>
        <p v-else class="empty-copy">Save filters here to quickly reselect the same node patterns later.</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.advanced-section {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-height: 0;
}

.section-header,
.card-actions,
.card-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.section-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(13rem, max-content);
  align-items: center;
  column-gap: 0.75rem;
  row-gap: 0.6rem;
}

.card-header {
  justify-content: space-between;
}

.section-copy,
.panel-meta,
.card-note,
.empty-copy,
.name-label {
  color: var(--text-muted);
}

.section-copy {
  font-size: 0.92rem;
  max-width: 44rem;
}

.section-intro {
  flex: 1 1 16rem;
  min-width: 0;
}

.panel-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  white-space: nowrap;
  min-width: 13rem;
  justify-self: end;
  justify-content: flex-end;
  text-align: right;
}

.meta-icon {
  width: 1rem;
  height: 1rem;
}

.advanced-grid {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-height: 0;
}

.editor-card,
.list-card {
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  background: var(--panel-card);
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  min-height: 0;
}

.editor-shell {
  min-height: 13rem;
  height: clamp(13rem, 28vh, 18rem);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  overflow: hidden;
  background: #0b111b;
}

.name-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.name-input {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--panel-border);
  background: var(--panel-input);
  color: var(--text-primary);
  padding: 0.55rem 0.7rem;
}

.list-card {
  min-width: 0;
}

.filter-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  overflow: auto;
  min-height: 13rem;
  padding-right: 0.1rem;
}

.filter-item {
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.65rem;
  text-align: left;
}

.filter-state,
.filter-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.filter-state {
  width: 1.7rem;
  height: 1.7rem;
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  flex: 0 0 auto;
  cursor: pointer;
  padding: 0;
}

.filter-state.active {
  background: rgba(103, 223, 141, 0.18);
  color: #b8ffd0;
  border-color: rgba(103, 223, 141, 0.3);
}

.filter-state:hover,
.filter-state:focus-visible {
  background: rgba(126, 202, 255, 0.1);
  border-color: rgba(126, 202, 255, 0.24);
  outline: none;
}

.filter-preview {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
  font-size: 0.92rem;
}

.filter-preview-btn {
  min-width: 0;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.filter-preview-btn:hover,
.filter-preview-btn:focus-visible {
  color: #eef8ff;
  outline: none;
}

.empty-copy {
  border: 1px dashed var(--panel-border);
  border-radius: 12px;
  padding: 0.9rem;
}

.mini-btn {
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  border-radius: 9px;
  cursor: pointer;
}

.mini-btn:hover:not(:disabled),
.mini-btn:focus-visible:not(:disabled) {
  background: rgba(126, 202, 255, 0.1);
  border-color: rgba(126, 202, 255, 0.24);
  outline: none;
}

.mini-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.mini-btn.emphasis {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: #081018;
  border-color: transparent;
}

.mini-btn.emphasis:hover:not(:disabled),
.mini-btn.emphasis:focus-visible:not(:disabled) {
  background: linear-gradient(135deg, #ffc778 0%, #ff9c60 100%);
  border-color: transparent;
}

.editor-shell :deep(.code-editor) {
  height: 100%;
}

.filter-list {
  min-height: 9rem;
}

@media (max-width: 900px) {
  .section-header {
    display: flex;
    justify-content: flex-start;
  }

  .panel-meta {
    min-width: 0;
    justify-self: auto;
    text-align: left;
  }

  .card-header {
    align-items: flex-start;
  }
}
</style>
