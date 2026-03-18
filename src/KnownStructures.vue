<script setup>
import {computed, reactive} from 'vue';
import store from './store';

/**
 * @typedef {ReturnType<typeof store.getKnownStructureMatches>[number]} KnownStructureMatch
 */

const filters = reactive({
  search: '',
  category: '',
  availability: 'all',
  transformAvailability: 'all',
});

const exploration = reactive({
  resultScope: 'selected',
  structureFilter: '',
  groupBy: 'flat',
  samplingMode: 'full',
  sampleSize: 12,
  randomSeed: 0,
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

    if (filters.availability !== 'all' && structure.availabilityStatus !== filters.availability) {
      return false;
    }

    if (!search) {
      return true;
    }

    return structure.searchText.includes(search);
  });
});

const visibleStructureIdsForScan = computed(() => filteredStructures.value.map((structure) => structure.id));
const canScanSelected = computed(() => store.hasPendingKnownStructureScan());
const canScanVisible = computed(() => store.canRunKnownStructureMatching(visibleStructureIdsForScan.value));
const scanSelectedTitle = computed(() => {
  if (!store.arb?.ast?.length) {
    return 'Parse a script before scanning structures';
  }

  if (!store.canRunKnownStructureMatching()) {
    return 'Select at least one runnable structure to scan';
  }

  if (canScanSelected.value) {
    return 'Scan the selected structures against the current parsed script';
  }

  return 'Selected structure matches are already up to date';
});

const selectedStructureCount = computed(() => store.selectedKnownStructureIds.length);
const activeStructure = computed(() => store.getKnownStructureById(store.activeKnownStructureId));
const activeMatches = computed(() => store.getKnownStructureMatches());
const selectedMatch = computed(() => store.getSelectedKnownStructureMatch());
const inspectedStructure = computed(() => store.getKnownStructureById(store.inspectedKnownStructureId));
const availableStructureFilterOptions = computed(() => store.getNavigableKnownStructureIds()
  .map((structureId) => store.getKnownStructureById(structureId))
  .filter(Boolean));

const visibleStructureIds = computed(() => {
  const structureFilter = exploration.structureFilter;

  if (structureFilter) {
    return store.getKnownStructureById(structureFilter) ? [structureFilter] : [];
  }

  if (exploration.resultScope === 'active') {
    return store.activeKnownStructureId ? [store.activeKnownStructureId] : [];
  }

  if (exploration.resultScope === 'last-run') {
    return store.lastKnownStructureRunIds;
  }

  return store.selectedKnownStructureIds;
});

const visibleResults = computed(() => store.latestKnownStructureMatches
  .filter((match) => visibleStructureIds.value.includes(match.structureId)));

const structureLegend = computed(() => visibleStructureIds.value
  .map((structureId) => {
    const structure = store.getKnownStructureById(structureId);

    if (!structure) {
      return null;
    }

    return {
      id: structure.id,
      title: structure.title,
      count: store.knownStructureMatchCounts[structure.id] ?? 0,
      hasError: !!store.knownStructureExecutionErrors[structure.id],
      isActive: store.activeKnownStructureId === structure.id,
    };
  })
  .filter(Boolean));

const sampledResults = computed(() => applySampling(
  visibleResults.value,
  exploration.samplingMode,
  exploration.sampleSize,
  exploration.randomSeed,
));

const groupedResults = computed(() => groupMatches(sampledResults.value, exploration.groupBy));
const activeMatchPosition = computed(() => {
  if (!selectedMatch.value) {
    return {current: 0, total: activeMatches.value.length};
  }

  const matchIndex = activeMatches.value.findIndex((match) =>
    match.structureId === selectedMatch.value.structureId &&
    match.index === selectedMatch.value.index,
  );

  return {
    current: matchIndex === -1 ? 0 : matchIndex + 1,
    total: activeMatches.value.length,
  };
});

const overlapSummary = computed(() => {
  const overlaps = store.getKnownStructureOverlaps(selectedMatch.value);
  const grouped = {};

  for (const match of overlaps) {
    grouped[match.structureId] ??= {
      structureId: match.structureId,
      title: match.structureTitle,
      count: 0,
    };
    grouped[match.structureId].count += 1;
  }

  return Object.values(grouped).sort((left, right) => right.count - left.count);
});

const activeRuleSeed = computed(() => store.copyKnownStructureRuleSeed(inspectedStructure.value?.id));
const activeTransformPreview = computed(() =>
  store.getKnownStructureTransformPreview(inspectedStructure.value?.id));

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
 * Runs the chosen structure set against the current Arborist instance.
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

/**
 * Activates a structure in the list and results area.
 *
 * @param {string} structureId
 * @returns {void}
 */
function showStructure(structureId) {
  store.setActiveKnownStructure(structureId);
  store.changeViewTo('structures');
}

/**
 * Builds a preview for a structure's browser-safe transform.
 *
 * @param {string} structureId
 * @returns {void}
 */
function previewTransform(structureId) {
  store.previewKnownStructureTransform(structureId);
}

/**
 * Applies a structure's browser-safe transform after preview.
 *
 * @param {string} structureId
 * @returns {void}
 */
function applyTransform(structureId) {
  store.applyKnownStructureTransform(structureId);
}

/**
 * Selects a normalized structure match in the store.
 *
 * @param {KnownStructureMatch} match
 * @returns {void}
 */
function selectMatch(match) {
  store.setSelectedKnownStructureMatch(match.structureId, match.index);
}

/**
 * Advances the random sampler seed so a new representative slice is shown.
 *
 * @returns {void}
 */
function rerollSample() {
  exploration.randomSeed += 1;
}

/**
 * Formats the available location data for compact display.
 *
 * @param {KnownStructureMatch} match
 * @returns {string}
 */
function formatLocation(match) {
  const startLine = match.loc?.start?.line ?? '?';
  const startColumn = match.loc?.start?.column ?? '?';
  const endLine = match.loc?.end?.line ?? '?';
  const endColumn = match.loc?.end?.column ?? '?';

  return `L${startLine}:${startColumn} - L${endLine}:${endColumn}`;
}

/**
 * Builds grouped result sections for flat or categorized result views.
 *
 * @param {readonly KnownStructureMatch[]} matches
 * @param {'flat' | 'structure' | 'type' | 'parentType'} mode
 * @returns {Array<{key: string, title: string, matches: KnownStructureMatch[]}>}
 */
function groupMatches(matches, mode) {
  if (mode === 'flat') {
    return [{key: 'flat', title: `All Results (${matches.length})`, matches: [...matches]}];
  }

  const grouped = {};

  for (const match of matches) {
    const key = mode === 'structure'
      ? match.structureId
      : mode === 'type'
        ? (match.type ?? 'Unknown')
        : (match.parentType ?? 'Unknown');

    grouped[key] ??= [];
    grouped[key].push(match);
  }

  return Object.entries(grouped)
    .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))
    .map(([key, groupMatches]) => ({
      key,
      title: createGroupTitle(mode, key, groupMatches.length),
      matches: groupMatches,
    }));
}

/**
 * Creates a readable label for a grouped result section.
 *
 * @param {'structure' | 'type' | 'parentType'} mode
 * @param {string} key
 * @param {number} count
 * @returns {string}
 */
function createGroupTitle(mode, key, count) {
  if (mode === 'structure') {
    const structure = store.getKnownStructureById(key);
    return `${structure?.title ?? key} (${count})`;
  }

  if (mode === 'type') {
    return `${key} nodes (${count})`;
  }

  return `${key} parents (${count})`;
}

/**
 * Applies the chosen sampling mode to a visible result set.
 *
 * @param {readonly KnownStructureMatch[]} matches
 * @param {'full' | 'first' | 'random'} mode
 * @param {number} sampleSize
 * @param {number} randomSeed
 * @returns {KnownStructureMatch[]}
 */
function applySampling(matches, mode, sampleSize, randomSeed) {
  if (mode === 'full') {
    return [...matches];
  }

  const normalizedSampleSize = Math.max(1, Number(sampleSize) || 1);

  if (mode === 'first') {
    return matches.slice(0, normalizedSampleSize);
  }

  return [...matches]
    .sort((left, right) =>
      createDeterministicRandom(left, randomSeed) - createDeterministicRandom(right, randomSeed),
    )
    .slice(0, normalizedSampleSize);
}

/**
 * Produces a stable sortable pseudo-random value per match and seed.
 *
 * @param {KnownStructureMatch} match
 * @param {number} seed
 * @returns {number}
 */
function createDeterministicRandom(match, seed) {
  const source = `${match.structureId}:${match.index}:${match.range?.join(':') ?? 'none'}:${seed}`;
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
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
        <select v-model="filters.availability" class="toolbar-select">
          <option value="all">All availability</option>
          <option value="available">Runnable now</option>
          <option value="unavailable-in-browser">Browser unavailable</option>
          <option value="planned">Planned</option>
          <option value="disabled">Disabled</option>
        </select>
        <select v-model="filters.transformAvailability" class="toolbar-select">
          <option value="all">All transforms</option>
          <option value="available">Transform available</option>
          <option value="unavailable">Matcher only</option>
        </select>
      </div>
      <div class="toolbar-group">
        <button
          class="btn btn-run"
          :disabled="!canScanSelected"
          :title="scanSelectedTitle"
          @click="runStructures()"
        >
          Scan selected
        </button>
        <button
          class="btn"
          :disabled="!canScanVisible"
          title="Scan the currently visible structures against the current parsed script"
          @click="runStructures(visibleStructureIdsForScan)"
        >
          Scan visible
        </button>
        <button class="btn" @click="store.clearKnownStructureResults()">
          Clear all
        </button>
        <span class="toolbar-meta">{{ selectedStructureCount }} selected</span>
        <span class="toolbar-meta" v-if="store.knownStructureExecutionStatus.blockedStructures">
          {{ store.knownStructureExecutionStatus.blockedStructures }} blocked
        </span>
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
                  :disabled="!structure.browserRunnable"
                  type="checkbox"
                  @change="toggleStructureSelection(structure.id)"
                >
                <span>Select</span>
              </label>
              <span class="structure-category">{{ structure.category }}</span>
            </div>
            <div class="structure-title-row">
              <strong>{{ structure.title }}</strong>
              <span class="structure-badge" :class="structure.availabilityStatus">
                {{ structure.availabilityStatus }}
              </span>
              <span class="structure-badge safe">{{ structure.executionMode }}</span>
              <span v-if="structure.transformAvailable" class="structure-badge transform">Transform</span>
            </div>
            <p class="structure-description">{{ structure.description }}</p>
            <p class="structure-support-note">{{ structure.support.note }}</p>
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
              <button class="btn btn-inline btn-run" :disabled="!structure.browserRunnable" @click="runStructures([structure.id])">Scan</button>
              <button class="btn btn-inline" @click="showStructure(structure.id)">Show</button>
              <button class="btn btn-inline" @click="store.clearKnownStructureMatches(structure.id)">Clear</button>
              <button class="btn btn-inline" @click="copyRuleSeed(structure.id)">Copy seed</button>
              <button
                v-if="structure.transformEnabled"
                class="btn btn-inline"
                @click="previewTransform(structure.id)"
              >
                Preview
              </button>
              <button class="btn btn-inline" @click="store.setInspectedKnownStructure(structure.id)">Inspect</button>
            </div>
          </article>
        </div>
      </fieldset>
      <div class="results-column">
        <fieldset class="results-panel">
          <legend>
            <span>{{ activeStructure?.title || 'Results' }}</span>
            <span v-if="activeMatches.length"> {{ activeMatchPosition.current }} / {{ activeMatchPosition.total }}</span>
          </legend>
          <div class="results-toolbar">
            <button class="btn btn-inline" @click="store.selectKnownStructureMatchStep(-1)" :disabled="!activeMatches.length">
              Prev match
            </button>
            <button class="btn btn-inline" @click="store.selectKnownStructureMatchStep(1)" :disabled="!activeMatches.length">
              Next match
            </button>
            <button class="btn btn-inline" @click="store.selectKnownStructureStep(-1)" :disabled="!availableStructureFilterOptions.length">
              Prev structure
            </button>
            <button class="btn btn-inline" @click="store.selectKnownStructureStep(1)" :disabled="!availableStructureFilterOptions.length">
              Next structure
            </button>
            <button class="btn btn-inline" @click="store.rerunKnownStructureMatching()" :disabled="!store.lastKnownStructureRunIds.length">
              Scan last run
            </button>
            <label class="toggle-inline">
              <input
                :checked="store.scrollKnownStructureSelectionIntoView"
                type="checkbox"
                @change="store.setKnownStructureAutoScroll($event.target.checked)"
              >
              <span>Scroll to current</span>
            </label>
          </div>
          <div class="results-filters">
            <select v-model="exploration.resultScope" class="toolbar-select">
              <option value="selected">Selected structures</option>
              <option value="last-run">Last run set</option>
              <option value="active">Active structure only</option>
            </select>
            <select v-model="exploration.structureFilter" class="toolbar-select">
              <option value="">All visible structures</option>
              <option
                v-for="structure of availableStructureFilterOptions"
                :key="structure.id"
                :value="structure.id"
              >
                {{ structure.title }}
              </option>
            </select>
            <select v-model="exploration.groupBy" class="toolbar-select">
              <option value="flat">Flat list</option>
              <option value="structure">Group by structure</option>
              <option value="type">Group by node type</option>
              <option value="parentType">Group by parent type</option>
            </select>
            <select v-model="exploration.samplingMode" class="toolbar-select">
              <option value="full">Full list</option>
              <option value="first">First N</option>
              <option value="random">Random N</option>
            </select>
            <input
              v-if="exploration.samplingMode !== 'full'"
              v-model.number="exploration.sampleSize"
              class="toolbar-input toolbar-number"
              min="1"
              type="number"
            >
            <button
              v-if="exploration.samplingMode === 'random'"
              class="btn btn-inline"
              @click="rerollSample()"
            >
              Reroll sample
            </button>
            <span class="toolbar-meta">{{ sampledResults.length }} visible matches</span>
          </div>
          <div v-if="structureLegend.length" class="results-legend">
            <button
              v-for="entry of structureLegend"
              :key="entry.id"
              class="legend-pill"
              :class="{active: entry.isActive, error: entry.hasError}"
              @click="showStructure(entry.id)"
            >
              <span>{{ entry.title }}</span>
              <span>{{ entry.count }}</span>
            </button>
          </div>
          <div v-if="groupedResults.some((group) => group.matches.length)" class="results-list grouped-results-list">
            <section v-for="group of groupedResults" :key="group.key" class="result-group">
              <div class="result-group-header">
                <strong>{{ group.title }}</strong>
              </div>
              <article
                v-for="match of group.matches"
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
                  <span>{{ match.structureTitle }}</span>
                  <span>{{ match.type || 'Unknown' }}</span>
                  <span>{{ match.parentType || 'Unknown parent' }}</span>
                  <span v-if="match.range">[{{ match.range[0] }}, {{ match.range[1] }}]</span>
                </div>
                <pre class="result-snippet">{{ match.srcSnippet || 'No source snippet available' }}</pre>
              </article>
            </section>
          </div>
          <div v-else class="results-empty">
            Run one or more structures to inspect matched nodes here.
          </div>
        </fieldset>
        <fieldset class="inspector-panel">
          <legend>{{ inspectedStructure?.title || 'Structure details' }}</legend>
          <div v-if="inspectedStructure" class="inspector-content">
            <div class="details-grid">
              <div class="detail-card">
                <div class="detail-heading">Structure</div>
                <div class="inspector-line"><strong>ID</strong> {{ inspectedStructure.id }}</div>
                <div class="inspector-line"><strong>Category</strong> {{ inspectedStructure.category }}</div>
                <div class="inspector-line"><strong>Description</strong> {{ inspectedStructure.description }}</div>
                <div class="inspector-line"><strong>Tags</strong> {{ inspectedStructure.tags.join(', ') }}</div>
                <div class="inspector-line">
                  <strong>Matches</strong> {{ store.knownStructureMatchCounts[inspectedStructure.id] ?? 0 }}
                </div>
                <div class="inspector-line">
                  <strong>Transform</strong> {{ inspectedStructure.transformAvailable ? 'available' : 'matcher only' }}
                </div>
                <div class="inspector-line">
                  <strong>Execution</strong> {{ inspectedStructure.executionMode }}
                </div>
                <div class="inspector-line">
                  <strong>Availability</strong> {{ inspectedStructure.availabilityStatus }}
                </div>
                <div class="inspector-line">
                  <strong>Support</strong> {{ inspectedStructure.support.note }}
                </div>
              </div>
              <div class="detail-card" v-if="selectedMatch">
                <div class="detail-heading">Active result</div>
                <div class="inspector-line"><strong>Summary</strong> {{ selectedMatch.summary }}</div>
                <div class="inspector-line"><strong>Node</strong> {{ selectedMatch.type || 'Unknown' }}</div>
                <div class="inspector-line"><strong>Parent</strong> {{ selectedMatch.parentType || 'Unknown' }}</div>
                <div class="inspector-line"><strong>Location</strong> {{ formatLocation(selectedMatch) }}</div>
                <div class="inspector-line" v-if="selectedMatch.range">
                  <strong>Range</strong> [{{ selectedMatch.range[0] }}, {{ selectedMatch.range[1] }}]
                </div>
                <pre class="result-snippet detail-snippet">{{ selectedMatch.srcSnippet || 'No source snippet available' }}</pre>
              </div>
            </div>
            <div class="details-grid secondary-details">
              <div class="detail-card">
                <div class="detail-heading">Comparison</div>
                <div v-if="overlapSummary.length" class="detail-list">
                  <div v-for="entry of overlapSummary" :key="entry.structureId" class="inspector-line">
                    <strong>{{ entry.title }}</strong> overlaps {{ entry.count }} times
                  </div>
                </div>
                <div v-else class="results-empty">
                  The current hit does not overlap another visible structure result.
                </div>
              </div>
              <div class="detail-card">
                <div class="detail-heading">Rule seed</div>
                <div class="inspector-line">
                  <strong>Intent</strong> {{ inspectedStructure.description }}
                </div>
                <pre class="rule-seed">{{ activeRuleSeed }}</pre>
                <button class="btn btn-inline" @click="copyRuleSeed(inspectedStructure.id)">Copy seed</button>
              </div>
              <div class="detail-card">
                <div class="detail-heading">Safe transform</div>
                <div class="inspector-line">
                  <strong>Status</strong>
                  {{ inspectedStructure.transformEnabled ? 'browser-runnable' : inspectedStructure.availabilityStatus }}
                </div>
                <div class="inspector-line">
                  <strong>Current matches</strong> {{ store.knownStructureMatchCounts[inspectedStructure.id] ?? 0 }}
                </div>
                <template v-if="activeTransformPreview">
                  <div class="inspector-line">
                    <strong>Preview matches</strong> {{ activeTransformPreview.targetedMatchCount }}
                  </div>
                  <div class="inspector-line">
                    <strong>Pending changes</strong> {{ activeTransformPreview.pendingChanges }}
                  </div>
                  <div class="inspector-line">
                    <strong>Execution mode</strong> {{ activeTransformPreview.executionMode }}
                  </div>
                  <div class="inspector-line">
                    <strong>Previewed at</strong> {{ activeTransformPreview.previewedAt }}
                  </div>
                  <div v-if="activeTransformPreview.error" class="inspector-line structure-error">
                    <strong>Error</strong> {{ activeTransformPreview.error.message }}
                  </div>
                </template>
                <div v-else class="results-empty">
                  Preview this structure's safe transform before applying it.
                </div>
                <div class="structure-actions">
                  <button
                    class="btn btn-inline"
                    :disabled="!inspectedStructure.transformEnabled"
                    @click="previewTransform(inspectedStructure.id)"
                  >
                    Preview transform
                  </button>
                  <button
                    class="btn btn-inline btn-run"
                    :disabled="!inspectedStructure.transformEnabled || !activeTransformPreview || !!activeTransformPreview.error || !activeTransformPreview.hasChanges"
                    @click="applyTransform(inspectedStructure.id)"
                  >
                    Apply transform
                  </button>
                  <button
                    class="btn btn-inline"
                    :disabled="!activeTransformPreview"
                    @click="store.clearKnownStructureTransformPreview(inspectedStructure.id)"
                  >
                    Clear preview
                  </button>
                </div>
              </div>
              <div class="detail-card">
                <div class="detail-heading">Implementation</div>
                <div class="inspector-line"><strong>Matcher</strong> {{ inspectedStructure.implementation.matcherName }}</div>
                <div class="inspector-line"><strong>Transform</strong> {{ inspectedStructure.implementation.transformName }}</div>
                <div class="inspector-line"><strong>Module</strong> {{ inspectedStructure.implementation.moduleName }}</div>
                <div class="inspector-line"><strong>Default</strong> {{ inspectedStructure.enabledByDefault ? 'yes' : 'no' }}</div>
                <div class="inspector-line"><strong>Experimental</strong> {{ inspectedStructure.experimental ? 'yes' : 'no' }}</div>
              </div>
            </div>
          </div>
          <div v-else class="results-empty">
            Pick a structure card to inspect its structural context and implementation details.
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

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.detail-card,
.inspector-content,
.result-group,
.results-list,
.structures-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.detail-card {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  min-width: 0;
  padding: 0.65rem;
}

.detail-heading,
.result-group-header {
  color: #9bf76b;
}

.available {
  color: #9bf76b;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.details-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

.grouped-results-list {
  gap: 0.75rem;
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

.legend-pill {
  align-items: center;
  background-color: rgba(100, 181, 246, 0.1);
  border: 1px solid rgba(100, 181, 246, 0.25);
  border-radius: 999px;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  gap: 0.45rem;
  padding: 0.2rem 0.55rem;
}

.legend-pill.active {
  background-color: rgba(173, 255, 47, 0.16);
  border-color: rgba(173, 255, 47, 0.55);
}

.legend-pill.error {
  border-color: rgba(255, 138, 128, 0.6);
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

.results-filters,
.results-legend,
.results-toolbar,
.structure-actions,
.structure-card-header,
.structure-stats,
.toolbar,
.toolbar-group,
.toggle-inline {
  display: flex;
  gap: 0.4rem;
}

.results-filters,
.results-legend,
.results-toolbar,
.structure-actions,
.structure-stats,
.toolbar {
  flex-wrap: wrap;
}

.results-legend {
  margin-top: 0.4rem;
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
  min-height: 18rem;
}

.inspector-panel {
  min-height: 18rem;
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

.detail-snippet,
.result-snippet,
.rule-seed {
  margin-top: 0.35rem;
  overflow: auto;
  white-space: pre-wrap;
}

.results-list,
.structures-list {
  overflow: auto;
}

.rule-seed {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 0.5rem;
}

.safe {
  color: #9bf76b;
}

.secondary-details {
  margin-top: 0.5rem;
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

.structure-support-note {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin: 0 0 0.45rem;
}

.structure-error {
  color: #ff8a80;
}

.structure-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.structure-toggle,
.toggle-inline {
  align-items: center;
  cursor: pointer;
}

.toolbar {
  justify-content: space-between;
}

.toolbar-group,
.toggle-inline {
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

.toolbar-number {
  max-width: 5rem;
}

.tag,
.transform {
  color: #ffd54f;
}

.disabled,
.unavailable-in-browser {
  color: #ff8a80;
}

.planned {
  color: #64b5f6;
}

@media (max-width: 900px) {
  .results-column,
  .structures-list-panel {
    min-width: 100%;
  }
}
</style>
