<script setup>
import {computed, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue';
import store from '../store';
import IconSearch from './icons/IconSearch.vue';
import IconTrash from './icons/IconTrash.vue';
import IconListChecks from './icons/IconListChecks.vue';
import IconPreview from './icons/IconPreview.vue';
import IconArrowLeft from './icons/IconArrowLeft.vue';
import IconArrowRight from './icons/IconArrowRight.vue';
import IconCopy from './icons/IconCopy.vue';
import IconClose from './icons/IconClose.vue';

const PAGE_SIZE = 100;

const filters = reactive({
  search: '',
  category: '',
});

const expandedStructureId = ref(null);
const currentPage = ref(0);
const exampleStructureId = ref('');

const categories = computed(() => [...new Set(
  store.availableKnownStructures.map((structure) => structure.category),
)].sort());

const visibleStructures = computed(() => {
  const search = filters.search.trim().toLowerCase();

  return store.availableKnownStructures
    .filter((structure) => {
      if (filters.category && structure.category !== filters.category) {
        return false;
      }

      if (!search) {
        return true;
      }

      return structure.searchText.includes(search);
    })
    .sort((left, right) => left.title.localeCompare(right.title));
});

const totalStructures = computed(() => visibleStructures.value.length);
const totalPages = computed(() => Math.max(1, Math.ceil(totalStructures.value / PAGE_SIZE)));
const isPaged = computed(() => totalStructures.value > PAGE_SIZE);
const pagedStructures = computed(() => {
  const start = currentPage.value * PAGE_SIZE;
  return visibleStructures.value.slice(start, start + PAGE_SIZE);
});
const pageRange = computed(() => {
  if (!totalStructures.value) {
    return '0 - 0';
  }

  const start = currentPage.value * PAGE_SIZE + 1;
  const end = Math.min(totalStructures.value, start + PAGE_SIZE - 1);
  return `${start} - ${end}`;
});

const selectedCount = computed(() => store.selectedKnownStructureIds.length);
const activeStructure = computed(() => store.getKnownStructureById(store.activeKnownStructureId));
const activePreview = computed(() => store.getKnownStructureTransformPreview(activeStructure.value?.id));
const exampleStructure = computed(() => store.getKnownStructureById(exampleStructureId.value));
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

function findStructure(structureId) {
  activateStructure(structureId);
  store.runActiveKnownStructureMatching();
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

function getStructureMatchCount(structure) {
  return store.knownStructureMatchCounts[structure?.id] ?? 0;
}

function hasStructureMatches(structure) {
  return getStructureMatchCount(structure) > 0;
}

function stepStructureMatch(structureId, direction = 1) {
  const matches = store.getKnownStructureMatches(structureId);

  if (!matches.length) {
    return;
  }

  store.setActiveKnownStructure(structureId);

  const currentSelection = store.selectedKnownStructureMatch?.structureId === structureId
    ? store.selectedKnownStructureMatch
    : null;
  const rememberedIndex = store.knownStructureSelectionById[structureId];
  const currentIndex = currentSelection
    ? matches.findIndex((match) => match.index === currentSelection.index)
    : matches.findIndex((match) => match.index === rememberedIndex);
  const nextIndex = currentIndex === -1
    ? direction > 0 ? 0 : matches.length - 1
    : (currentIndex + direction + matches.length) % matches.length;

  store.setSelectedKnownStructureMatch(structureId, matches[nextIndex].index);
}

function canTransformStructure(structure) {
  return hasStructureMatches(structure) && store.canPreviewKnownStructureTransform(structure.id);
}

function openStructureTransform(structureId) {
  store.previewKnownStructureTransform(structureId);
  store.setActiveTemplate('apply-known-transform');
  store.setInspectedKnownStructure(structureId);
  activateStructure(structureId);
  store.setActiveWorkspaceTab('inspector');
}

function toggleExpandedStructure(structureId) {
  expandedStructureId.value = expandedStructureId.value === structureId ? null : structureId;
}

function openExample(structureId) {
  exampleStructureId.value = structureId;
}

function closeExample() {
  exampleStructureId.value = '';
}

async function copyExample() {
  if (!exampleStructure.value?.codeExample) {
    return;
  }

  try {
    await navigator.clipboard.writeText(exampleStructure.value.codeExample);
    store.logMessage(`Copied example for ${exampleStructure.value.title}`, 'success');
  } catch (error) {
    store.logMessage(`Unable to copy example: ${error.message}`, 'error');
  }
}

function nextPage() {
  currentPage.value = currentPage.value >= totalPages.value - 1 ? 0 : currentPage.value + 1;
}

function prevPage() {
  currentPage.value = currentPage.value <= 0 ? totalPages.value - 1 : currentPage.value - 1;
}

watch(
  [
    () => filters.search,
    () => filters.category,
    () => store.availableKnownStructures.length,
  ],
  () => {
    currentPage.value = 0;
    if (expandedStructureId.value && !pagedStructures.value.some((structure) => structure.id === expandedStructureId.value)) {
      expandedStructureId.value = null;
    }
  },
);

watch(totalPages, (nextTotalPages) => {
  if (currentPage.value > nextTotalPages - 1) {
    currentPage.value = Math.max(0, nextTotalPages - 1);
  }
});

function handleWindowKeydown(event) {
  if (event.key === 'Escape' && exampleStructure.value) {
    closeExample();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeydown);
});
</script>

<template>
  <section class="workspace-panel">
    <div class="panel-header">
      <h2>Known structures</h2>
      <div class="panel-meta">
        <span>{{ selectedCount }} selected</span>
        <span>{{ store.knownStructureExecutionStatus.totalMatches }} matches</span>
        <span v-if="isPaged">{{ pageRange }} / {{ totalStructures }}</span>
      </div>
    </div>

    <p class="helper-copy">Look for known structures in the code</p>

    <div class="filter-grid">
      <label class="search-field search-filter" title="Search structures by name, category, or tag">
        <icon-search class="search-icon" />
        <input
          v-model="filters.search"
          type="search"
          class="panel-input search-input"
          placeholder="Search structures"
          title="Search structures by name, tag, or category"
        >
      </label>
      <label class="filter-field filter-field-inline">
        <span class="filter-label">Category</span>
        <select v-model="filters.category" class="panel-select" title="Filter structures by category">
          <option value="">All</option>
          <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
        </select>
      </label>
    </div>

    <div class="explorer-actions">
      <button
        v-if="isPaged"
        class="secondary-btn icon-btn"
        type="button"
        title="Previous page"
        aria-label="Previous page"
        @click="prevPage"
      >
        <icon-arrow-left />
      </button>
      <button
        v-if="isPaged"
        class="secondary-btn icon-btn"
        type="button"
        title="Next page"
        aria-label="Next page"
        @click="nextPage"
      >
        <icon-arrow-right />
      </button>
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
        v-for="structure in pagedStructures"
        :key="structure.id"
        class="structure-card"
        :class="{
          active: structure.id === store.activeKnownStructureId,
          expanded: expandedStructureId === structure.id,
          'has-matches': hasStructureMatches(structure),
        }"
      >
        <button
          class="structure-summary"
          type="button"
          :aria-expanded="expandedStructureId === structure.id"
          @click="toggleExpandedStructure(structure.id)"
        >
          <span class="structure-summary-main">
            <label
              class="structure-summary-checkbox"
              @click.stop
            >
              <input
                :checked="store.selectedKnownStructureIds.includes(structure.id)"
                :disabled="!structure.browserRunnable"
                type="checkbox"
                :title="structure.browserRunnable ? 'Include this structure when searching the selected set' : 'This structure cannot run in the browser yet'"
                @change="toggleSelection(structure.id)"
              >
            </label>
            <strong>{{ structure.title }}</strong>
          </span>
          <span class="structure-summary-side">
            <span class="structure-summary-count" :class="{highlighted: hasStructureMatches(structure)}">
              {{ getStructureMatchCount(structure) }} matches
            </span>
            <span class="structure-summary-indicator" aria-hidden="true"></span>
          </span>
        </button>

        <div v-if="expandedStructureId === structure.id" class="structure-details">
          <div class="structure-card-top">
            <span class="structure-category">{{ structure.category }}</span>
            <span class="status-pill" :class="structure.browserRunnable ? 'good' : 'muted'">
              {{ structure.transformEnabled ? 'transform-ready' : structure.browserRunnable ? 'matcher-only' : 'blocked' }}
            </span>
          </div>

          <p class="structure-description">{{ structure.description }}</p>
          <p class="structure-note">{{ structure.support.note }}</p>

          <div class="card-stats">
            <span :class="{highlighted: hasStructureMatches(structure)}">{{ getStructureMatchCount(structure) }} matches</span>
            <span>{{ structure.executionMode }}</span>
          </div>

          <div v-if="hasStructureMatches(structure)" class="card-match-nav">
            <button
              class="structure-action structure-action-compact"
              type="button"
              title="Jump to the previous match for this structure"
              aria-label="Previous structure match"
              @click="stepStructureMatch(structure.id, -1)"
            >
              <icon-arrow-left />
              <span>Prev</span>
            </button>
            <button
              class="structure-action structure-action-compact"
              type="button"
              title="Jump to the next match for this structure"
              aria-label="Next structure match"
              @click="stepStructureMatch(structure.id, 1)"
            >
              <span>Next</span>
              <icon-arrow-right />
            </button>
          </div>

          <div class="card-actions">
            <button
              class="structure-action"
              type="button"
              :disabled="!canFindStructure(structure)"
              title="Run matching for just this structure"
              aria-label="Match this structure"
              @click="findStructure(structure.id)"
            >
              <icon-search />
              <span>Match</span>
            </button>
            <button
              class="structure-action"
              type="button"
              :disabled="!canInspectStructure(structure)"
              title="Show matches for this structure in the result browser and inspector"
              aria-label="Show structure matches"
              @click="store.setInspectedKnownStructure(structure.id); activateStructure(structure.id); store.setActiveWorkspaceTab('results'); store.setActiveInspectorPanel('inspector')"
            >
              <icon-list-checks />
              <span>Inspect</span>
            </button>
            <button
              class="structure-action"
              type="button"
              title="Open a code example for this structure"
              aria-label="Open structure example"
              @click="openExample(structure.id)"
            >
              <icon-copy />
              <span>Example</span>
            </button>
            <button
              class="structure-action"
              type="button"
              :disabled="!canTransformStructure(structure)"
              title="Preview this built-in transform and open it in the template panel"
              aria-label="Open structure transform"
              @click="openStructureTransform(structure.id)"
            >
              <icon-preview />
              <span>Transform</span>
            </button>
          </div>
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
    <div
      v-if="exampleStructure"
      class="example-modal-backdrop"
      @click.self="closeExample()"
    >
      <section
        class="example-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="`${exampleStructure.title} example code`"
      >
        <div class="example-modal-header">
          <div class="example-modal-copy">
            <h3>{{ exampleStructure.title }} Example</h3>
          </div>
          <div class="example-modal-actions">
            <button
              class="secondary-btn icon-btn"
              type="button"
              title="Copy the full example"
              aria-label="Copy full example"
              @click="copyExample()"
            >
              <icon-copy />
            </button>
            <button
              class="secondary-btn icon-btn"
              type="button"
              title="Close example"
              aria-label="Close example"
              @click="closeExample()"
            >
              <icon-close />
            </button>
          </div>
        </div>
        <p class="example-modal-description">{{ exampleStructure.description }}</p>
        <pre class="example-modal-code"><code>{{ exampleStructure.codeExample }}</code></pre>
      </section>
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
.card-match-nav,
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

.card-match-nav {
  justify-content: flex-end;
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
  width: 0.95rem;
  height: 0.95rem;
  flex: 0 0 auto;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.filter-field-inline {
  grid-column: 1 / -1;
  flex-direction: row;
  align-items: center;
  gap: 0.55rem;
}

.filter-field-inline .filter-label {
  flex: 0 0 auto;
  margin: 0;
}

.filter-field-inline .panel-select {
  flex: 1 1 auto;
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
.explorer-actions {
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

.example-modal,
.example-modal-copy {
  display: flex;
  flex-direction: column;
}

.example-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(4, 9, 16, 0.72);
}

.example-modal {
  width: min(720px, 100%);
  max-height: min(80vh, 900px);
  gap: 0.8rem;
  padding: 1rem;
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: #0b111b;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.example-modal-actions,
.example-modal-header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.example-modal-actions {
  flex-shrink: 0;
}

.example-modal-code {
  margin: 0;
  overflow: auto;
  padding: 1rem;
  white-space: pre-wrap;
  user-select: text;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
}

.example-modal-description,
.example-modal-note {
  margin: 0;
  color: var(--text-muted);
}

.structure-card {
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  background: var(--panel-card);
  display: flex;
  flex-direction: column;
  transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
}

.structure-card.has-matches {
  border-color: rgba(126, 202, 255, 0.42);
  background:
    linear-gradient(180deg, rgba(126, 202, 255, 0.08), rgba(126, 202, 255, 0.02)),
    var(--panel-card);
  box-shadow: 0 0 0 1px rgba(126, 202, 255, 0.1);
}

.structure-card.active {
  border-color: rgba(255, 191, 102, 0.55);
  box-shadow: 0 0 0 1px rgba(255, 191, 102, 0.18);
}

.structure-summary {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 0.9rem;
  cursor: pointer;
  text-align: left;
}

.structure-summary-main,
.structure-summary-side {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.structure-summary-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.structure-summary-side {
  flex-shrink: 0;
}

.structure-summary:hover,
.structure-summary:focus-visible {
  background: rgba(255, 255, 255, 0.03);
  outline: none;
}

.structure-summary-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.structure-summary-count {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.structure-summary-count.highlighted,
.card-stats .highlighted {
  color: #d7f0ff;
  font-weight: 700;
}

.structure-summary-count.highlighted {
  border: 1px solid rgba(126, 202, 255, 0.28);
  background: rgba(126, 202, 255, 0.14);
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  box-shadow: 0 0 18px rgba(126, 202, 255, 0.12);
}

.structure-summary-indicator {
  width: 0.55rem;
  height: 0.55rem;
  border-right: 2px solid var(--text-muted);
  border-bottom: 2px solid var(--text-muted);
  transform: rotate(45deg);
  transition: transform 0.18s ease;
  flex-shrink: 0;
  margin-right: 0.15rem;
}

.structure-card.expanded .structure-summary-indicator {
  transform: rotate(225deg);
}

.structure-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 0.9rem 0.85rem;
}

.card-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.15rem;
}

.structure-action {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.07);
  color: var(--text-primary);
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.5rem 0.7rem;
  min-height: 2.2rem;
  cursor: pointer;
}

.structure-action span {
  display: inline;
  line-height: 1;
}

.structure-action svg {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
}

.structure-action:hover:not(:disabled),
.structure-action:focus-visible:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.24);
  outline: none;
}

.structure-action-emphasis {
  background: rgba(255, 191, 102, 0.14);
  border-color: rgba(255, 191, 102, 0.34);
}

.structure-action-emphasis:hover:not(:disabled),
.structure-action-emphasis:focus-visible:not(:disabled) {
  background: rgba(255, 191, 102, 0.24);
  border-color: rgba(255, 191, 102, 0.48);
}

.structure-action:disabled {
  opacity: 1;
  cursor: not-allowed;
  color: rgba(233, 240, 248, 0.62);
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

@media (max-width: 520px) {
  .card-actions {
    grid-template-columns: 1fr;
  }
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
