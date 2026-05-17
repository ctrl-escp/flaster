<script setup>
import {computed, onMounted, ref, watch} from 'vue';
import store from '../store';
import {buildApiDetectorCodeExample} from '../domain/apiSurface/codeExampleBuilder.js';
import {apiDetectorRegistry} from '../domain/apiSurface/index.js';
import {
  REPORT_FILTER_OPTIONS,
  buildReportModel,
  countFindingsForFilter,
  filterReportSections,
} from '../domain/report/index.js';
import {formatCategoryLabel} from '../ui/composables/structureExplorerModel.js';
import {useFindingMatchNav} from '../ui/composables/useFindingMatchNav.js';
import FindingMatchNav from './FindingMatchNav.vue';

const detectorById = Object.fromEntries(apiDetectorRegistry.map((row) => [row.id, row]));
const matchNav = useFindingMatchNav();
const expandedExampleId = ref('');
const enabledFilters = ref(new Set(REPORT_FILTER_OPTIONS.map((filter) => filter.id)));

const report = computed(() => buildReportModel(store));
const status = computed(() => report.value.status);

const visibleSections = computed(() =>
  filterReportSections(report.value.sections, enabledFilters.value),
);

const visibleFindingCount = computed(() =>
  visibleSections.value.reduce((sum, section) => sum + section.findings.length, 0),
);

const isEmpty = computed(() =>
  status.value === 'done' && report.value.totalFindings === 0,
);

const filtersSuppressed = computed(() =>
  status.value === 'done' &&
  report.value.totalFindings > 0 &&
  visibleFindingCount.value === 0,
);

function syncEnabledFiltersToFindings() {
  const sections = report.value.sections;
  const next = new Set();

  for (let i = 0; i < REPORT_FILTER_OPTIONS.length; i++) {
    const filter = REPORT_FILTER_OPTIONS[i];
    if (countFindingsForFilter(sections, filter.id) > 0) {
      next.add(filter.id);
    }
  }

  enabledFilters.value = next.size
    ? next
    : new Set(REPORT_FILTER_OPTIONS.map((filter) => filter.id));
}

onMounted(syncEnabledFiltersToFindings);

watch(
  () => store.parseRunSequence,
  () => {
    expandedExampleId.value = '';
    syncEnabledFiltersToFindings();
  },
);

function filterCount(filterId) {
  return countFindingsForFilter(report.value.sections, filterId);
}

function isFilterEnabled(filterId) {
  return enabledFilters.value.has(filterId);
}

function toggleFilter(filterId) {
  const next = new Set(enabledFilters.value);
  if (next.has(filterId)) {
    next.delete(filterId);
  } else {
    next.add(filterId);
  }
  enabledFilters.value = next;
}

function isApiSurfaceDetector(finding, sectionId) {
  return sectionId === 'api-surface' && finding.kind === 'structure';
}

function detectorRowForFinding(finding) {
  return detectorById[finding.structureId] ?? null;
}

function codeExampleForFinding(finding) {
  const row = detectorRowForFinding(finding);
  if (!row) {
    return '';
  }
  return store.getKnownStructureById(row.id)?.codeExample || buildApiDetectorCodeExample(row);
}

function toggleExample(findingId) {
  expandedExampleId.value = expandedExampleId.value === findingId ? '' : findingId;
}

async function copyDetectorExample(finding) {
  const text = codeExampleForFinding(finding);
  if (!text) {
    return;
  }

  const title = finding.title;
  try {
    await navigator.clipboard.writeText(text);
    store.logMessage(`Copied example for ${title}`, 'success');
  } catch (error) {
    store.logMessage(`Unable to copy example: ${error.message}`, 'error');
  }
}

function browseFinding(finding) {
  if (finding.kind !== 'structure') {
    return;
  }
  matchNav.focusDetector(finding.structureId);
}

function browseCapability(finding) {
  if (finding.kind !== 'capability') {
    return;
  }
  matchNav.focusCapability(finding.firedDetectorIds);
}
</script>

<template>
  <section class="workspace-panel report-panel">
    <div class="panel-header">
      <h2>Report</h2>
      <div class="panel-meta">
        <span v-if="status === 'done'">
          {{ visibleFindingCount }} of {{ report.totalFindings }} finding{{ report.totalFindings === 1 ? '' : 's' }}
        </span>
        <span v-else-if="status === 'running'">Analysing…</span>
        <span v-else>Load a script to begin</span>
      </div>
    </div>

    <p class="helper-copy">
      Combined findings from obfuscation matching and API surface analysis. Use filters to focus the report.
    </p>

    <div
      v-if="status === 'done' && report.totalFindings > 0"
      class="filter-row"
      role="group"
      aria-label="Report filters"
    >
      <button
        v-for="filter in REPORT_FILTER_OPTIONS"
        :key="filter.id"
        class="filter-chip"
        type="button"
        :class="{active: isFilterEnabled(filter.id), disabled: filterCount(filter.id) === 0}"
        :disabled="filterCount(filter.id) === 0"
        :aria-pressed="isFilterEnabled(filter.id)"
        @click="toggleFilter(filter.id)"
      >
        {{ filter.label }}
        <span class="filter-count">{{ filterCount(filter.id) }}</span>
      </button>
    </div>

    <div v-if="status === 'idle'" class="empty-state">
      Load and parse a script to generate a report.
    </div>

    <div v-else-if="status === 'running'" class="empty-state">
      Analysing…
    </div>

    <div v-else-if="isEmpty" class="empty-state">
      No findings to report for this script.
    </div>

    <div v-else-if="filtersSuppressed" class="empty-state">
      Enable Obfuscation or API Surface to view findings.
    </div>

    <template v-else>
      <div
        v-for="section in visibleSections"
        :key="section.id"
        class="section"
      >
        <h3 class="section-title">{{ section.title }}</h3>
        <p class="section-copy">{{ section.helperCopy }}</p>

        <ul class="finding-list">
          <li
            v-for="finding in section.findings"
            :key="finding.id"
            class="finding-row"
            :class="finding.kind"
          >
            <template v-if="finding.kind === 'capability'">
              <div class="finding-head">
                <span
                  v-if="finding.risk !== 'informational'"
                  class="risk-badge"
                  :class="finding.risk"
                >{{ finding.risk }}</span>
                <span class="finding-title">{{ finding.title }}</span>
              </div>
              <p class="finding-desc">{{ finding.description }}</p>
              <p v-if="finding.riskReason" class="risk-reason">{{ finding.riskReason }}</p>
              <div class="contributing-detectors">
                <button
                  v-for="detectorId in finding.firedDetectorIds"
                  :key="detectorId"
                  class="detector-chip"
                  type="button"
                  :title="`Browse ${detectorById[detectorId]?.title ?? detectorId} in the editor`"
                  @click="matchNav.focusDetector(detectorId)"
                >
                  {{ detectorById[detectorId]?.title ?? detectorId }}
                </button>
              </div>
              <div v-if="finding.matchCount > 0" class="finding-footer">
                <finding-match-nav
                  :active="matchNav.isCapabilityMatchActive(finding.firedDetectorIds)"
                  :position="matchNav.capabilityMatchPosition(finding.firedDetectorIds)"
                  :total="finding.matchCount"
                  @prev="matchNav.stepCapabilityMatch(finding.firedDetectorIds, -1)"
                  @next="browseCapability(finding)"
                />
              </div>
            </template>

            <template v-else>
              <div class="finding-head">
                <span class="finding-title">{{ finding.title }}</span>
                <span class="category-pill">{{ formatCategoryLabel(finding.category) }}</span>
              </div>
              <p v-if="finding.description" class="finding-desc">{{ finding.description }}</p>
              <template
                v-for="group in finding.extractions ?? []"
                :key="group.role"
              >
                <div v-if="group.values.length" class="extraction-row">
                  <span class="extraction-role">{{ group.role }}</span>
                  <span
                    v-for="value in group.values"
                    :key="value"
                    class="extraction-value"
                  >{{ value }}</span>
                </div>
              </template>
              <div class="finding-footer">
                <div class="footer-actions">
                  <button
                    class="structure-link"
                    type="button"
                    :title="`Show ${finding.title} in Code Structures`"
                    @click="matchNav.openInExplorer(finding.structureId)"
                  >
                    Code structure
                  </button>
                  <template v-if="isApiSurfaceDetector(finding, section.id)">
                    <button
                      class="structure-link"
                      type="button"
                      :aria-expanded="expandedExampleId === finding.id"
                      @click="toggleExample(finding.id)"
                    >
                      {{ expandedExampleId === finding.id ? 'Hide example' : 'Show example' }}
                    </button>
                    <button
                      class="structure-link"
                      type="button"
                      title="Copy example code"
                      aria-label="Copy example code"
                      @click="copyDetectorExample(finding)"
                    >
                      Copy
                    </button>
                  </template>
                </div>
                <finding-match-nav
                  :active="matchNav.isMatchActive(finding.structureId)"
                  :position="matchNav.matchPosition(finding.structureId)"
                  :total="matchNav.matchCount(finding.structureId)"
                  @prev="matchNav.stepMatch(finding.structureId, -1)"
                  @next="browseFinding(finding)"
                />
              </div>
              <pre
                v-if="isApiSurfaceDetector(finding, section.id) && expandedExampleId === finding.id"
                class="detector-example"
              ><code>{{ codeExampleForFinding(finding) }}</code></pre>
            </template>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.report-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem 0.75rem 1rem;
}

.panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.panel-header h2 {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
}

.panel-meta {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.helper-copy,
.section-copy {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-muted);
  cursor: pointer;
}

.filter-chip.active {
  color: #eef8ff;
  border-color: rgba(126, 202, 255, 0.42);
  background: rgba(126, 202, 255, 0.16);
}

.filter-chip.disabled,
.filter-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.filter-chip:not(:disabled):hover,
.filter-chip:not(:disabled):focus-visible {
  border-color: rgba(126, 202, 255, 0.28);
  outline: none;
}

.filter-count {
  font-size: 0.65rem;
  padding: 0.02rem 0.35rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.22);
}

.filter-chip.active .filter-count {
  background: rgba(0, 0, 0, 0.28);
  color: #d7f0ff;
}

.empty-state {
  font-size: 0.8rem;
  color: var(--text-muted);
  padding: 1.25rem 0;
  text-align: center;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.finding-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.finding-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  background: rgba(255, 255, 255, 0.02);
}

.finding-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.finding-title {
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.3;
}

.finding-row.structure .finding-title {
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 500;
}

.category-pill {
  font-size: 0.62rem;
  padding: 0.08rem 0.4rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
}

.finding-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.45;
  margin: 0;
}

.risk-reason {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
  opacity: 0.8;
}

.risk-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  flex-shrink: 0;
}

.risk-badge.risky {
  background: rgba(255, 100, 80, 0.18);
  color: #ff8070;
  border: 1px solid rgba(255, 100, 80, 0.3);
}

.risk-badge.benign {
  background: rgba(80, 200, 120, 0.15);
  color: #70d090;
  border: 1px solid rgba(80, 200, 120, 0.28);
}

.contributing-detectors {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.detector-chip {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 5px;
  background: rgba(126, 202, 255, 0.1);
  border: 1px solid rgba(126, 202, 255, 0.2);
  color: rgba(126, 202, 255, 0.85);
  cursor: pointer;
}

.detector-chip:hover,
.detector-chip:focus-visible {
  background: rgba(126, 202, 255, 0.18);
  outline: none;
}

.extraction-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.extraction-role {
  font-size: 0.65rem;
  color: var(--text-muted);
  min-width: 4rem;
}

.extraction-value {
  font-size: 0.68rem;
  font-family: var(--font-mono, monospace);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 0.05rem 0.35rem;
  color: #c8e6c9;
}

.finding-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  margin-top: 0.1rem;
}

.footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-width: 0;
}

.structure-link {
  font-size: 0.65rem;
  padding: 0.12rem 0.45rem;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-muted);
  cursor: pointer;
}

.structure-link:hover,
.structure-link:focus-visible {
  color: #d7f0ff;
  border-color: rgba(126, 202, 255, 0.28);
  outline: none;
}

.detector-example {
  margin: 0.15rem 0 0;
  width: 100%;
  box-sizing: border-box;
  padding: 0.45rem 0.55rem;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.68rem;
  line-height: 1.45;
  overflow-x: auto;
  white-space: pre;
  font-family: var(--font-mono, monospace);
  color: #d7f0ff;
}
</style>
