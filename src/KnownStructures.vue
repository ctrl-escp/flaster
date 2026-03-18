<script setup>
import {computed, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue';
import store from './store';
import IconSearch from './components/icons/IconSearch.vue';
import IconTrash from './components/icons/IconTrash.vue';
import IconEye from './components/icons/IconEye.vue';
import IconCopy from './components/icons/IconCopy.vue';
import IconPreview from './components/icons/IconPreview.vue';
import IconCheck from './components/icons/IconCheck.vue';
import IconReset from './components/icons/IconReset.vue';
import IconArrowLeft from './components/icons/IconArrowLeft.vue';
import IconArrowRight from './components/icons/IconArrowRight.vue';
import IconRefresh from './components/icons/IconRefresh.vue';
import IconListChecks from './components/icons/IconListChecks.vue';
import IconClose from './components/icons/IconClose.vue';

const PAGE_SIZE = 100;

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

const structurePage = ref(0);
const resultPage = ref(0);
const exampleModalStructureId = ref('');

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

const pagedStructures = computed(() => {
  const start = structurePage.value * PAGE_SIZE;
  return filteredStructures.value.slice(start, start + PAGE_SIZE);
});
const structureTotalPages = computed(() => Math.max(1, Math.ceil(filteredStructures.value.length / PAGE_SIZE)));
const structurePageRange = computed(() => {
  if (!filteredStructures.value.length) {
    return '0 - 0';
  }

  const start = structurePage.value * PAGE_SIZE + 1;
  const end = Math.min(filteredStructures.value.length, start + PAGE_SIZE - 1);
  return `${start} - ${end}`;
});

const visibleStructureIdsForScan = computed(() => filteredStructures.value.map((structure) => structure.id));
const canScanSelected = computed(() => store.hasPendingKnownStructureScan());
const canScanVisible = computed(() => store.canRunKnownStructureMatching(visibleStructureIdsForScan.value));
const scanSelectedTitle = 'Scan the selected structures against the current parsed script';

const selectedStructureCount = computed(() => store.selectedKnownStructureIds.length);
const activeStructure = computed(() => store.getKnownStructureById(store.activeKnownStructureId));
const activeMatches = computed(() => store.getKnownStructureMatches());
const selectedMatch = computed(() => store.getSelectedKnownStructureMatch());
const inspectedStructure = computed(() => store.getKnownStructureById(store.inspectedKnownStructureId));
const exampleModalStructure = computed(() => store.getKnownStructureById(exampleModalStructureId.value));
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
const pagedResults = computed(() => {
  const start = resultPage.value * PAGE_SIZE;
  return sampledResults.value.slice(start, start + PAGE_SIZE);
});
const pagedGroupedResults = computed(() => groupMatches(pagedResults.value, exploration.groupBy));
const resultTotalPages = computed(() => Math.max(1, Math.ceil(sampledResults.value.length / PAGE_SIZE)));
const resultPageRange = computed(() => {
  if (!sampledResults.value.length) {
    return '0 - 0';
  }

  const start = resultPage.value * PAGE_SIZE + 1;
  const end = Math.min(sampledResults.value.length, start + PAGE_SIZE - 1);
  return `${start} - ${end}`;
});
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

function hasStructureMatches(structureId) {
  return store.getKnownStructureMatches(structureId).length > 0;
}

function openStructureExample(structureId) {
  exampleModalStructureId.value = structureId;
}

function closeStructureExample() {
  exampleModalStructureId.value = '';
}

async function copyStructureExample() {
  if (!exampleModalStructure.value?.codeExample) {
    return;
  }

  try {
    await navigator.clipboard.writeText(exampleModalStructure.value.codeExample);
    store.logMessage(`Copied example for ${exampleModalStructure.value.title}`, 'success');
  } catch (error) {
    store.logMessage(`Unable to copy example: ${error.message}`, 'error');
  }
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

function nextStructurePage() {
  structurePage.value = structurePage.value >= structureTotalPages.value - 1 ? 0 : structurePage.value + 1;
}

function prevStructurePage() {
  structurePage.value = structurePage.value <= 0 ? structureTotalPages.value - 1 : structurePage.value - 1;
}

function nextResultPage() {
  resultPage.value = resultPage.value >= resultTotalPages.value - 1 ? 0 : resultPage.value + 1;
}

function prevResultPage() {
  resultPage.value = resultPage.value <= 0 ? resultTotalPages.value - 1 : resultPage.value - 1;
}

function handleWindowKeydown(event) {
  if (event.key === 'Escape' && exampleModalStructure.value) {
    closeStructureExample();
  }
}

watch(
  [
    () => filters.search,
    () => filters.category,
    () => filters.availability,
    () => filters.transformAvailability,
    () => store.availableKnownStructures.length,
  ],
  () => {
    structurePage.value = 0;
  },
);

watch(
  [
    () => exploration.resultScope,
    () => exploration.structureFilter,
    () => exploration.groupBy,
    () => exploration.samplingMode,
    () => exploration.sampleSize,
    () => exploration.randomSeed,
    () => store.latestKnownStructureMatches.length,
  ],
  () => {
    resultPage.value = 0;
  },
);

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeydown);
});
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
          class="btn btn-run icon-btn"
          :disabled="!canScanSelected"
          :title="scanSelectedTitle"
          aria-label="Scan selected structures"
          @click="runStructures()"
        >
          <icon-search />
        </button>
        <button
          class="btn icon-btn"
          :disabled="!canScanVisible"
          title="Scan the currently visible structures against the current parsed script"
          aria-label="Scan visible structures"
          @click="runStructures(visibleStructureIdsForScan)"
        >
          <icon-eye />
        </button>
        <button class="btn icon-btn" title="Clear all known structure results" aria-label="Clear all structure results" @click="store.clearKnownStructureResults()">
          <icon-trash />
        </button>
        <span class="toolbar-meta">{{ selectedStructureCount }} selected</span>
        <span class="toolbar-meta" v-if="store.knownStructureExecutionStatus.blockedStructures">
          {{ store.knownStructureExecutionStatus.blockedStructures }} blocked
        </span>
      </div>
    </div>
    <div class="known-structures-layout">
      <fieldset class="structures-list-panel">
        <legend>
          {{ filteredStructures.length }} Built-in Structures
          <span v-if="filteredStructures.length > PAGE_SIZE"> ({{ structurePageRange }})</span>
        </legend>
        <div class="results-toolbar">
          <button v-if="filteredStructures.length > PAGE_SIZE" class="btn btn-inline icon-btn icon-btn-sm" title="Previous structures page" aria-label="Previous structures page" @click="prevStructurePage"><icon-arrow-left /></button>
          <button v-if="filteredStructures.length > PAGE_SIZE" class="btn btn-inline icon-btn icon-btn-sm" title="Next structures page" aria-label="Next structures page" @click="nextStructurePage"><icon-arrow-right /></button>
        </div>
        <div class="structures-list">
          <article
            v-for="structure of pagedStructures"
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
              <button class="btn btn-inline btn-run icon-btn icon-btn-sm" :disabled="!structure.browserRunnable" title="Scan this structure" aria-label="Scan structure" @click="runStructures([structure.id])"><icon-search /></button>
              <button class="btn btn-inline icon-btn icon-btn-sm" :disabled="!hasStructureMatches(structure.id)" title="Show matches for this structure" aria-label="Show structure matches" @click="showStructure(structure.id)"><icon-list-checks /></button>
              <button class="btn btn-inline icon-btn icon-btn-sm" title="Clear this structure's matches" aria-label="Clear structure matches" @click="store.clearKnownStructureMatches(structure.id)"><icon-trash /></button>
              <button class="btn btn-inline structure-example-btn" title="Open example code for this structure" aria-label="Open example code" @click="openStructureExample(structure.id)">Example</button>
              <button class="btn btn-inline icon-btn icon-btn-sm" title="Copy this structure's rule seed" aria-label="Copy rule seed" @click="copyRuleSeed(structure.id)"><icon-copy /></button>
              <button
                v-if="structure.transformEnabled"
                class="btn btn-inline icon-btn icon-btn-sm preview-icon-btn"
                :disabled="!hasStructureMatches(structure.id)"
                title="Preview this structure's transform"
                aria-label="Preview transform"
                @click="previewTransform(structure.id)"
              >
                <icon-preview />
              </button>
              <button class="btn btn-inline icon-btn icon-btn-sm" title="Inspect this structure" aria-label="Inspect structure" @click="store.setInspectedKnownStructure(structure.id)"><icon-eye /></button>
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
            <button class="btn btn-inline icon-btn icon-btn-sm" title="Previous match" aria-label="Previous match" @click="store.selectKnownStructureMatchStep(-1)" :disabled="!activeMatches.length"><icon-arrow-left /></button>
            <button class="btn btn-inline icon-btn icon-btn-sm" title="Next match" aria-label="Next match" @click="store.selectKnownStructureMatchStep(1)" :disabled="!activeMatches.length"><icon-arrow-right /></button>
            <button class="btn btn-inline icon-btn icon-btn-sm" title="Previous structure" aria-label="Previous structure" @click="store.selectKnownStructureStep(-1)" :disabled="!availableStructureFilterOptions.length"><icon-arrow-left /></button>
            <button class="btn btn-inline icon-btn icon-btn-sm" title="Next structure" aria-label="Next structure" @click="store.selectKnownStructureStep(1)" :disabled="!availableStructureFilterOptions.length"><icon-arrow-right /></button>
            <button class="btn btn-inline icon-btn icon-btn-sm" title="Scan the last run set again" aria-label="Scan last run again" @click="store.rerunKnownStructureMatching()" :disabled="!store.lastKnownStructureRunIds.length"><icon-refresh /></button>
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
              class="btn btn-inline icon-btn icon-btn-sm"
              title="Reroll the random sample"
              aria-label="Reroll sample"
              @click="rerollSample()"
            >
              <icon-refresh />
            </button>
            <span class="toolbar-meta">{{ sampledResults.length }} visible matches</span>
            <span v-if="sampledResults.length > PAGE_SIZE" class="toolbar-meta">{{ resultPageRange }}</span>
            <button v-if="sampledResults.length > PAGE_SIZE" class="btn btn-inline icon-btn icon-btn-sm" title="Previous results page" aria-label="Previous results page" @click="prevResultPage"><icon-arrow-left /></button>
            <button v-if="sampledResults.length > PAGE_SIZE" class="btn btn-inline icon-btn icon-btn-sm" title="Next results page" aria-label="Next results page" @click="nextResultPage"><icon-arrow-right /></button>
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
          <div v-if="pagedGroupedResults.some((group) => group.matches.length)" class="results-list grouped-results-list">
            <section v-for="group of pagedGroupedResults" :key="group.key" class="result-group">
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
                <button class="btn btn-inline icon-btn icon-btn-sm" title="Copy this structure's rule seed" aria-label="Copy rule seed" @click="copyRuleSeed(inspectedStructure.id)"><icon-copy /></button>
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
                    class="btn btn-inline icon-btn icon-btn-sm preview-icon-btn"
                    :disabled="!inspectedStructure.transformEnabled || !hasStructureMatches(inspectedStructure.id)"
                    title="Preview this structure's transform"
                    aria-label="Preview transform"
                    @click="previewTransform(inspectedStructure.id)"
                  >
                    <icon-preview />
                  </button>
                  <button
                    class="btn btn-inline btn-run icon-btn icon-btn-sm"
                    :disabled="!inspectedStructure.transformEnabled || !activeTransformPreview || !!activeTransformPreview.error || !activeTransformPreview.hasChanges"
                    title="Apply the previewed transform"
                    aria-label="Apply transform"
                    @click="applyTransform(inspectedStructure.id)"
                  >
                    <icon-check />
                  </button>
                  <button
                    class="btn btn-inline icon-btn icon-btn-sm"
                    :disabled="!activeTransformPreview"
                    title="Clear the current transform preview"
                    aria-label="Clear preview"
                    @click="store.clearKnownStructureTransformPreview(inspectedStructure.id)"
                  >
                    <icon-reset />
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
  <div
    v-if="exampleModalStructure"
    class="structure-example-backdrop"
    @click.self="closeStructureExample()"
  >
    <section
      class="structure-example-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="`${exampleModalStructure.title} example code`"
    >
      <div class="structure-example-header">
        <div class="structure-example-copy-intro">
          <h2>{{ exampleModalStructure.title }} Example</h2>
          <p class="structure-example-note">
            Select any part of the snippet to copy just that text, or use the copy button for the full example.
          </p>
        </div>
        <div class="structure-example-header-actions">
          <button
            class="btn btn-inline icon-btn"
            type="button"
            title="Copy the full example"
            aria-label="Copy full example"
            @click="copyStructureExample()"
          >
            <icon-copy />
          </button>
          <button
            class="btn btn-inline icon-btn"
            type="button"
            title="Close example"
            aria-label="Close example"
            @click="closeStructureExample()"
          >
            <icon-close />
          </button>
        </div>
      </div>
      <p class="structure-example-description">{{ exampleModalStructure.description }}</p>
      <pre class="structure-example-code"><code>{{ exampleModalStructure.codeExample }}</code></pre>
    </section>
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

.structure-example-btn {
  background-color: rgba(100, 181, 246, 0.12);
  color: #c7e1ff;
  padding-inline: 0.65rem;
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

.structure-example-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(4, 9, 16, 0.72);
}

.structure-example-code {
  margin: 0;
  min-height: 0;
  overflow: auto;
  padding: 1rem;
  white-space: pre-wrap;
  user-select: text;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', monospace;
}

.structure-example-copy-intro {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.structure-example-description,
.structure-example-note {
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
}

.structure-example-description {
  font-size: 0.95rem;
}

.structure-example-header,
.structure-example-header-actions {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.structure-example-header {
  align-items: flex-start;
}

.structure-example-header-actions {
  align-items: center;
  flex-shrink: 0;
}

.structure-example-modal {
  width: min(760px, 100%);
  max-height: min(80vh, 900px);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: #0b111b;
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
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
