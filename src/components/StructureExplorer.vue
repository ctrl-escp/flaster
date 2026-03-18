<script setup>
import {computed, reactive} from 'vue';
import store from '../store';
import IconSearch from './icons/IconSearch.vue';
import IconTrash from './icons/IconTrash.vue';
import IconListChecks from './icons/IconListChecks.vue';
import IconPreview from './icons/IconPreview.vue';
import IconPlus from './icons/IconPlus.vue';

const filters = reactive({
  search: '',
  readiness: 'all',
  category: '',
  resultScope: 'selected',
});

const categories = computed(() => [...new Set(
  store.availableKnownStructures.map((structure) => structure.category),
)].sort());

const visibleStructures = computed(() => {
  const search = filters.search.trim().toLowerCase();

  return store.availableKnownStructures.filter((structure) => {
    if (filters.category && structure.category !== filters.category) {
      return false;
    }

    if (filters.readiness === 'transform-ready' && !structure.transformEnabled) {
      return false;
    }

    if (filters.readiness === 'matcher-only' && structure.transformEnabled) {
      return false;
    }

    if (filters.readiness === 'blocked' && structure.browserRunnable) {
      return false;
    }

    if (!search) {
      return true;
    }

    return structure.searchText.includes(search);
  });
});

const selectedCount = computed(() => store.selectedKnownStructureIds.length);
const activeStructure = computed(() => store.getKnownStructureById(store.activeKnownStructureId));
const activePreview = computed(() => store.getKnownStructureTransformPreview(activeStructure.value?.id));
const canFindMatches = computed(() => store.hasPendingKnownStructureScan());
const canClearResults = computed(() => store.hasKnownStructureResultsToClear());

function toggleSelection(structureId) {
  const nextIds = store.selectedKnownStructureIds.includes(structureId)
    ? store.selectedKnownStructureIds.filter((id) => id !== structureId)
    : [...store.selectedKnownStructureIds, structureId];

  store.setSelectedKnownStructureIds(nextIds);
}

function activateStructure(structureId) {
  store.setActiveKnownStructure(structureId);
  store.setActiveWorkspaceTab('explorer');
}

function useSavedView(view) {
  filters.resultScope = view;

  if (view === 'active' && store.activeKnownStructureId) {
    store.runKnownStructureMatching([store.activeKnownStructureId]);
    return;
  }

  if (view === 'last-run') {
    store.rerunKnownStructureMatching();
    return;
  }

  if (view === 'transformed') {
    const transformedStructureIds = store.steps
      .filter((step) => step.kind === 'known-structure-transform')
      .map((step) => step.structureId);
    store.runKnownStructureMatching(transformedStructureIds);
    return;
  }

  store.runKnownStructureMatching(store.selectedKnownStructureIds);
}

function canFindStructure(structure) {
  if (!structure?.browserRunnable || !store.isCurrentInputParsed()) {
    return false;
  }

  return store.activeKnownStructureId !== structure.id ||
    store.activeWorkspaceTab !== 'explorer' ||
    store.hasPendingKnownStructureScan([structure.id]);
}

function canInspectStructure(structure) {
  return !!(
    structure?.browserRunnable &&
    store.isCurrentInputParsed() &&
    store.getKnownStructureMatches(structure.id).length > 0
  );
}

function hasStructureMatches(structure) {
  return store.getKnownStructureMatches(structure?.id).length > 0;
}

function canPreviewStructure(structure) {
  return hasStructureMatches(structure) && store.canPreviewKnownStructureTransform(structure.id);
}

function canAddStructureToPipeline(structure) {
  return hasStructureMatches(structure) && store.canPreviewKnownStructureTransform(structure.id);
}
</script>

<template>
  <section class="workspace-panel">
    <div class="panel-header">
      <h2>Known structures</h2>
      <div class="panel-meta">
        <span>{{ selectedCount }} selected</span>
        <span>{{ store.knownStructureExecutionStatus.totalMatches }} matches</span>
      </div>
    </div>

    <p class="helper-copy">Choose the structures you care about, then find matches in the current script.</p>

    <div class="filter-grid">
      <label class="search-field search-filter" title="Search structures by name, category, or tag">
        <span class="search-icon">/</span>
        <input
          v-model="filters.search"
          type="search"
          class="panel-input search-input"
          placeholder="Search structures"
          title="Search structures by name, tag, or category"
        >
      </label>
      <label class="filter-field">
        <span class="filter-label">Show</span>
        <select
          v-model="filters.resultScope"
          class="panel-select"
          title="Choose which structure set to run when you search for matches"
          @change="useSavedView(filters.resultScope)"
        >
          <option value="selected">Selected structures</option>
          <option value="last-run">Last run</option>
          <option value="active">Active structure</option>
          <option value="transformed">Transformed structures</option>
        </select>
      </label>
      <label class="filter-field">
        <span class="filter-label">Readiness</span>
        <select v-model="filters.readiness" class="panel-select" title="Filter structures by transform support and browser availability">
          <option value="all">All</option>
          <option value="transform-ready">Transform-ready</option>
          <option value="matcher-only">Matcher only</option>
          <option value="blocked">Blocked</option>
        </select>
      </label>
      <label class="filter-field filter-field-wide">
        <span class="filter-label">Category</span>
        <select v-model="filters.category" class="panel-select" title="Filter structures by category">
          <option value="">All categories</option>
          <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
        </select>
      </label>
    </div>

    <div class="explorer-actions">
      <button
        class="secondary-btn primary-action icon-btn"
        type="button"
        :disabled="!canFindMatches"
        title="Run matching for the currently selected structures"
        aria-label="Find structure matches"
        @click="store.runKnownStructureMatching()"
      >
        <icon-search />
      </button>
      <button
        class="secondary-btn icon-btn"
        type="button"
        :disabled="!canClearResults"
        :title="canClearResults ? 'Clear the currently shown structure-match results' : 'There are no structure results to clear'"
        aria-label="Clear structure results"
        @click="store.clearKnownStructureResults()"
      >
        <icon-trash />
      </button>
    </div>

    <div class="structure-list">
      <article
        v-for="structure in visibleStructures"
        :key="structure.id"
        class="structure-card"
        :class="{active: structure.id === store.activeKnownStructureId}"
      >
        <div class="structure-card-top">
          <label class="structure-toggle">
            <input
              :checked="store.selectedKnownStructureIds.includes(structure.id)"
              :disabled="!structure.browserRunnable"
              type="checkbox"
              :title="structure.browserRunnable ? 'Include this structure when searching the selected set' : 'This structure cannot run in the browser yet'"
              @change="toggleSelection(structure.id)"
            >
            <span>Select</span>
          </label>
          <span class="structure-category">{{ structure.category }}</span>
        </div>

        <div class="title-row">
          <strong>{{ structure.title }}</strong>
          <span class="status-pill" :class="structure.browserRunnable ? 'good' : 'muted'">
            {{ structure.transformEnabled ? 'transform-ready' : structure.browserRunnable ? 'matcher-only' : 'blocked' }}
          </span>
        </div>

        <p class="structure-description">{{ structure.description }}</p>
        <p class="structure-note">{{ structure.support.note }}</p>

        <div class="tag-row">
          <span v-for="tag in structure.tags" :key="tag" class="tag">#{{ tag }}</span>
        </div>

        <div class="card-stats">
          <span>{{ store.knownStructureMatchCounts[structure.id] ?? 0 }} matches</span>
          <span>{{ structure.executionMode }}</span>
        </div>

        <div class="card-actions">
          <button
            class="mini-btn icon-btn icon-btn-sm"
            type="button"
            :disabled="!canFindStructure(structure)"
            title="Run matching for this structure and focus it in the workspace"
            aria-label="Find matches for this structure"
            @click="activateStructure(structure.id)"
          >
            <icon-search />
          </button>
          <button
            class="mini-btn icon-btn icon-btn-sm"
            type="button"
            :disabled="!canInspectStructure(structure)"
            title="Show matches for this structure in the result browser and inspector"
            aria-label="Show structure matches"
            @click="store.setInspectedKnownStructure(structure.id); activateStructure(structure.id); store.setActiveWorkspaceTab('results'); store.setActiveInspectorPanel('inspector')"
          >
            <icon-list-checks />
          </button>
          <button
            class="mini-btn icon-btn icon-btn-sm preview-icon-btn"
            type="button"
            :disabled="!canPreviewStructure(structure)"
            title="Preview the built-in transform for this structure without adding it to the pipeline"
            aria-label="Preview structure transform"
            @click="store.previewKnownStructureTransform(structure.id)"
          >
            <icon-preview />
          </button>
          <button class="mini-btn emphasis icon-btn icon-btn-sm" type="button" :disabled="!canAddStructureToPipeline(structure)" title="Seed the template panel with this structure so you can add its transform to the pipeline" aria-label="Add transform to pipeline" @click="store.setActiveTemplate('apply-known-transform'); store.setInspectedKnownStructure(structure.id); activateStructure(structure.id); store.setActiveWorkspaceTab('inspector')">
            <icon-plus />
          </button>
        </div>
      </article>
    </div>

    <div v-if="activePreview" class="preview-summary">
      <strong>Preview:</strong>
      <span>
        {{ activePreview.structureTitle }} targets {{ activePreview.targetedMatchCount }} matches and
        would apply {{ activePreview.pendingChanges }} changes.
      </span>
    </div>
  </section>
</template>

<style scoped>
.workspace-panel {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  min-height: 0;
  height: 100%;
}

.panel-header,
.panel-meta,
.structure-card-top,
.title-row,
.card-stats,
.card-actions,
.explorer-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.panel-header,
.card-stats {
  justify-content: space-between;
}

h2 {
  font-size: 0.96rem;
}

.helper-copy {
  color: var(--text-muted);
  font-size: 0.93rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border-radius: 10px;
  border: 1px solid rgba(126, 202, 255, 0.24);
  background: rgba(126, 202, 255, 0.08);
  padding: 0 0.7rem;
}

.search-filter,
.filter-field-wide {
  grid-column: 1 / -1;
}

.search-icon {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.panel-input,
.panel-select {
  width: 100%;
  border-radius: 14px;
  border: 1px solid var(--panel-border);
  background: var(--panel-input);
  color: var(--text-primary);
  padding: 0.6rem 0.75rem;
  min-width: 0;
}

.search-input {
  border: none;
  background: transparent;
  padding-left: 0;
}

.search-input:focus {
  outline: none;
}

.saved-views,
.explorer-actions,
.card-actions {
  flex-wrap: wrap;
}

.filter-label {
  color: var(--text-muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.secondary-btn,
.mini-btn {
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  border-radius: 9px;
  cursor: pointer;
}

.secondary-btn:not(.icon-btn),
.mini-btn:not(.icon-btn) {
  padding: 0.42rem 0.65rem;
}

.secondary-btn:disabled,
.mini-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.primary-action {
  background: rgba(255, 191, 102, 0.14);
  border-color: rgba(255, 191, 102, 0.34);
}

.primary-action:hover:not(:disabled),
.primary-action:focus-visible:not(:disabled) {
  background: rgba(255, 191, 102, 0.22);
  border-color: rgba(255, 191, 102, 0.5);
  box-shadow: 0 0 0 1px rgba(255, 191, 102, 0.12);
}

.mini-btn.emphasis {
  background: rgba(255, 191, 102, 0.14);
  border-color: rgba(255, 191, 102, 0.38);
}

.mini-btn.emphasis:hover:not(:disabled),
.mini-btn.emphasis:focus-visible:not(:disabled) {
  background: rgba(255, 191, 102, 0.24);
  border-color: rgba(255, 191, 102, 0.55);
  box-shadow: 0 0 0 1px rgba(255, 191, 102, 0.12);
}

.structure-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 0.2rem;
}

.structure-card {
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  background: var(--panel-card);
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.structure-card.active {
  border-color: rgba(255, 191, 102, 0.55);
  box-shadow: 0 0 0 1px rgba(255, 191, 102, 0.18);
}

.structure-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.structure-category,
.tag,
.structure-note,
.panel-meta,
.card-stats,
.preview-summary {
  color: var(--text-muted);
}

.status-pill {
  border-radius: 999px;
  padding: 0.16rem 0.45rem;
  font-size: 0.7rem;
}

.status-pill.good {
  background: rgba(96, 210, 142, 0.16);
  color: #8df0b6;
}

.status-pill.muted {
  background: rgba(255, 255, 255, 0.08);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

@media (max-width: 720px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .search-filter,
  .filter-field-wide {
    grid-column: auto;
  }
}
</style>
