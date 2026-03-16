<script setup>
import {computed, reactive} from 'vue';
import store from './store';

const filters = reactive({
  search: '',
  category: '',
  transformAvailability: 'all',
});

const categoryOptions = computed(() => [...new Set(
  store.availableKnownStructures.map((structure) => structure.category),
)].sort());

const filteredStructures = computed(() => {
  const search = filters.search.trim().toLowerCase();

  return store.availableKnownStructures.filter((structure) => {
    if (filters.category && structure.category !== filters.category) {
      return false;
    }

    if (filters.transformAvailability === 'available' && !structure.transformAvailable) {
      return false;
    }

    if (filters.transformAvailability === 'unavailable' && structure.transformAvailable) {
      return false;
    }

    if (!search) {
      return true;
    }

    return structure.searchText.includes(search);
  });
});

const selectedStructureCount = computed(() => store.selectedKnownStructureIds.length);
const activeStructure = computed(() => store.getKnownStructureById(store.activeKnownStructureId));
const activeMatches = computed(() => store.getKnownStructureMatches());
const selectedMatch = computed(() => store.getSelectedKnownStructureMatch());
const inspectedStructure = computed(() => store.getKnownStructureById(store.inspectedKnownStructureId));

/**
 * Toggles whether a structure is part of the current "run selected" set.
 *
 * @param {string} structureId
 * @returns {void}
 */
function toggleStructureSelection(structureId) {
  const nextIds = store.selectedKnownStructureIds.includes(structureId)
    ? store.selectedKnownStructureIds.filter((id) => id !== structureId)
    : [...store.selectedKnownStructureIds, structureId];

  store.setSelectedKnownStructureIds(nextIds);
}

/**
 * Runs the active visible structures against the current Arborist instance.
 *
 * @param {string[] | undefined} structureIds
 * @returns {void}
 */
function runStructures(structureIds) {
  const idsToRun = Array.isArray(structureIds) && structureIds.length
    ? structureIds
    : store.selectedKnownStructureIds;

  store.runKnownStructureMatching(idsToRun);
}

/**
 * Copies a starter filter snippet seeded from the chosen known structure.
 *
 * @param {string} structureId
 * @returns {Promise<void>}
 */
async function copyRuleSeed(structureId) {
  const seed = store.copyKnownStructureRuleSeed(structureId);

  if (!seed) {
    return;
  }

  try {
    await navigator.clipboard.writeText(seed);
    store.logMessage('Copied known structure seed', 'success');
  } catch (error) {
    store.logMessage(`Unable to copy seed: ${error.message}`, 'error');
  }
}

function showStructure(structureId) {
  store.setActiveKnownStructure(structureId);
  store.changeViewTo('structures');
}

function selectMatch(match) {
  store.setSelectedKnownStructureMatch(match.structureId, match.index);
}

function formatLocation(match) {
  const startLine = match.loc?.start?.line ?? '?';
  const startColumn = match.loc?.start?.column ?? '?';
  const endLine = match.loc?.end?.line ?? '?';
  const endColumn = match.loc?.end?.column ?? '?';

  return `L${startLine}:${startColumn} - L${endLine}:${endColumn}`;
}
</script>

<template>
  <div class="known-structures-controller" v-if="store.arb?.ast?.length">
    <div class="toolbar">
      <div class="toolbar-group">
        <input
          v-model="filters.search"
          class="toolbar-input"
          type="search"
          placeholder="Search structures"
        >
        <select v-model="filters.category" class="toolbar-select">
          <option value="">All categories</option>
          <option v-for="category of categoryOptions" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
        <select v-model="filters.transformAvailability" class="toolbar-select">
          <option value="all">All transforms</option>
          <option value="available">Transform available</option>
          <option value="unavailable">Matcher only</option>
        </select>
      </div>
      <div class="toolbar-group">
        <button class="btn btn-run" @click="runStructures()">Run selected</button>
        <button class="btn" @click="runStructures(filteredStructures.map((structure) => structure.id))">
          Run visible
        </button>
        <button class="btn" @click="store.clearKnownStructureResults()">
          Clear all
        </button>
        <span class="toolbar-meta">{{ selectedStructureCount }} selected</span>
      </div>
    </div>
    <div class="known-structures-layout">
      <fieldset class="structures-list-panel">
        <legend>{{ filteredStructures.length }} Built-in Structures</legend>
        <div class="structures-list">
          <article
            v-for="structure of filteredStructures"
            :key="structure.id"
            class="structure-card"
            :class="{active: structure.id === store.activeKnownStructureId}"
            @click="showStructure(structure.id)"
          >
            <div class="structure-card-header">
              <label class="structure-toggle" @click.stop>
                <input
                  :checked="store.selectedKnownStructureIds.includes(structure.id)"
                  type="checkbox"
                  @change="toggleStructureSelection(structure.id)"
                >
                <span>Select</span>
              </label>
              <span class="structure-category">{{ structure.category }}</span>
            </div>
            <div class="structure-title-row">
              <strong>{{ structure.title }}</strong>
              <span class="structure-badge safe">Safe</span>
              <span v-if="structure.transformAvailable" class="structure-badge transform">Transform</span>
            </div>
            <p class="structure-description">{{ structure.description }}</p>
            <div class="structure-tags">
              <span v-for="tag of structure.tags" :key="tag" class="tag">#{{ tag }}</span>
            </div>
            <div class="structure-stats">
              <span>{{ store.knownStructureMatchCounts[structure.id] ?? 0 }} matches</span>
              <span v-if="store.knownStructureExecutionErrors[structure.id]" class="structure-error">
                error
              </span>
            </div>
            <div class="structure-actions" @click.stop>
              <button class="btn btn-inline btn-run" @click="runStructures([structure.id])">Run</button>
              <button class="btn btn-inline" @click="showStructure(structure.id)">Show</button>
              <button class="btn btn-inline" @click="store.clearKnownStructureMatches(structure.id)">Clear</button>
              <button class="btn btn-inline" @click="copyRuleSeed(structure.id)">Copy seed</button>
              <button class="btn btn-inline" @click="store.setInspectedKnownStructure(structure.id)">Inspect</button>
            </div>
          </article>
        </div>
      </fieldset>
      <div class="results-column">
        <fieldset class="results-panel">
          <legend>
            <span>{{ activeStructure?.title || 'Results' }}</span>
            <span v-if="activeMatches.length"> {{ activeMatches.length }} matches</span>
          </legend>
          <div class="results-toolbar">
            <button class="btn btn-inline" @click="store.selectKnownStructureMatchStep(-1)" :disabled="!activeMatches.length">
              Prev
            </button>
            <button class="btn btn-inline" @click="store.selectKnownStructureMatchStep(1)" :disabled="!activeMatches.length">
              Next
            </button>
            <button class="btn btn-inline" @click="store.rerunKnownStructureMatching()" :disabled="!store.lastKnownStructureRunIds.length">
              Re-run last
            </button>
          </div>
          <div v-if="activeMatches.length" class="results-list">
            <article
              v-for="match of activeMatches"
              :key="`${match.structureId}:${match.index}`"
              class="result-card"
              :class="{active: selectedMatch?.structureId === match.structureId && selectedMatch?.index === match.index}"
              @click="selectMatch(match)"
            >
              <div class="result-title-row">
                <strong>{{ match.summary }}</strong>
                <span>{{ formatLocation(match) }}</span>
              </div>
              <div class="result-meta">
                <span>{{ match.type || 'Unknown' }}</span>
                <span>{{ match.parentType || 'Unknown parent' }}</span>
                <span v-if="match.range">[{{ match.range[0] }}, {{ match.range[1] }}]</span>
              </div>
              <pre class="result-snippet">{{ match.srcSnippet || 'No source snippet available' }}</pre>
            </article>
          </div>
          <div v-else class="results-empty">
            Run a structure to inspect matched nodes here.
          </div>
        </fieldset>
        <fieldset class="inspector-panel">
          <legend>{{ inspectedStructure?.title || 'Implementation metadata' }}</legend>
          <div v-if="inspectedStructure" class="inspector-content">
            <div class="inspector-line"><strong>ID</strong> {{ inspectedStructure.id }}</div>
            <div class="inspector-line"><strong>Category</strong> {{ inspectedStructure.category }}</div>
            <div class="inspector-line"><strong>Description</strong> {{ inspectedStructure.description }}</div>
            <div class="inspector-line"><strong>Matcher</strong> {{ inspectedStructure.implementation.matcherName }}</div>
            <div class="inspector-line"><strong>Transform</strong> {{ inspectedStructure.implementation.transformName }}</div>
            <div class="inspector-line"><strong>Module</strong> {{ inspectedStructure.implementation.moduleName }}</div>
            <div class="inspector-line"><strong>Default</strong> {{ inspectedStructure.enabledByDefault ? 'yes' : 'no' }}</div>
            <div class="inspector-line"><strong>Experimental</strong> {{ inspectedStructure.experimental ? 'yes' : 'no' }}</div>
          </div>
          <div v-else class="results-empty">
            Pick a structure card to inspect its built-in metadata.
          </div>
        </fieldset>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-inline {
  font-size: 0.95rem;
  padding: 0.15rem 0.45rem;
}

.btn-run {
  background-color: greenyellow;
}

.inspector-content,
.results-list,
.structures-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.inspector-line {
  display: flex;
  gap: 0.45rem;
  align-items: baseline;
}

.known-structures-controller {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 5px;
  width: 100%;
}

.known-structures-layout {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 0;
}

.results-column {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
  min-width: min(42rem, 100%);
}

.results-empty {
  color: rgba(255, 255, 255, 0.75);
  font-style: italic;
}

.results-panel,
.inspector-panel,
.structures-list-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 0.4rem;
}

.results-panel {
  min-height: 16rem;
}

.results-toolbar,
.structure-actions,
.structure-card-header,
.structure-stats,
.toolbar,
.toolbar-group {
  display: flex;
  gap: 0.4rem;
}

.results-toolbar,
.structure-actions,
.structure-stats,
.toolbar {
  flex-wrap: wrap;
}

.result-card,
.structure-card {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  cursor: pointer;
  padding: 0.6rem;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.result-card.active,
.structure-card.active {
  background-color: rgba(65, 232, 4, 0.1);
  border-color: rgba(173, 255, 47, 0.8);
}

.result-meta,
.result-title-row,
.structure-title-row,
.toolbar {
  align-items: center;
  justify-content: space-between;
}

.result-meta,
.structure-stats,
.toolbar-meta {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.9rem;
}

.result-snippet {
  margin-top: 0.35rem;
  overflow: auto;
  white-space: pre-wrap;
}

.results-list,
.structures-list {
  overflow: auto;
}

.safe {
  color: #9bf76b;
}

.structure-badge {
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 0.78rem;
  padding: 0.05rem 0.45rem;
}

.structure-category {
  color: #64b5f6;
  text-transform: capitalize;
}

.structure-description {
  margin: 0.35rem 0 0.45rem;
}

.structure-error {
  color: #ff8a80;
}

.structure-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.structure-toggle {
  align-items: center;
  cursor: pointer;
  display: flex;
  gap: 0.25rem;
}

.tag,
.transform {
  color: #ffd54f;
}

.toolbar {
  justify-content: space-between;
}

.toolbar-group {
  align-items: center;
}

.toolbar-input,
.toolbar-select {
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  color: inherit;
  min-height: 2rem;
  padding: 0.3rem 0.5rem;
}

@media (max-width: 900px) {
  .results-column,
  .structures-list-panel {
    min-width: 100%;
  }
}
</style>
