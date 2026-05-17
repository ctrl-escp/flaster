<script setup>
import {computed} from 'vue';
import store from '../store';
import {buildReportModel} from '../domain/report/index.js';
import {apiDetectorRegistry} from '../domain/apiSurface/index.js';
import {formatCategoryLabel} from '../ui/composables/structureExplorerModel.js';
import {useFindingMatchNav} from '../ui/composables/useFindingMatchNav.js';
import FindingMatchNav from './FindingMatchNav.vue';

const detectorById = Object.fromEntries(apiDetectorRegistry.map((row) => [row.id, row]));
const matchNav = useFindingMatchNav();

const report = computed(() => buildReportModel(store));

const status = computed(() => report.value.status);
const isEmpty = computed(() =>
  status.value === 'done' && report.value.totalFindings === 0,
);

function structureIdForFinding(finding) {
  return finding.kind === 'structure' ? finding.structureId : null;
}

function browseFinding(finding) {
  const structureId = structureIdForFinding(finding);
  if (!structureId) {
    return;
  }
  matchNav.focusDetector(structureId);
}
</script>

<template>
  <section class="workspace-panel report-panel">
    <div class="panel-header">
      <h2>Report</h2>
      <div class="panel-meta">
        <span v-if="status === 'done'">
          {{ report.totalFindings }} finding{{ report.totalFindings === 1 ? '' : 's' }}
          across {{ report.sections.length }} section{{ report.sections.length === 1 ? '' : 's' }}
        </span>
        <span v-else-if="status === 'running'">Analysing…</span>
        <span v-else>Load a script to begin</span>
      </div>
    </div>

    <p class="helper-copy">
      Combined findings from obfuscation matching, API surface detection, and inferred capabilities.
    </p>

    <div v-if="status === 'idle'" class="empty-state">
      Load and parse a script to generate a report.
    </div>

    <div v-else-if="status === 'running'" class="empty-state">
      Analysing…
    </div>

    <div v-else-if="isEmpty" class="empty-state">
      No findings to report for this script.
    </div>

    <template v-else>
      <div
        v-for="section in report.sections"
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
                <span class="risk-badge" :class="finding.risk">{{ finding.risk }}</span>
                <span class="finding-title">{{ finding.title }}</span>
              </div>
              <p class="finding-desc">{{ finding.description }}</p>
              <p class="risk-reason">{{ finding.riskReason }}</p>
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
                <button
                  class="structure-link"
                  type="button"
                  :title="`Show ${finding.title} in Code Structures`"
                  @click="matchNav.openInExplorer(finding.structureId)"
                >
                  Code structure
                </button>
                <finding-match-nav
                  :active="matchNav.isMatchActive(finding.structureId)"
                  :position="matchNav.matchPosition(finding.structureId)"
                  :total="matchNav.matchCount(finding.structureId)"
                  @prev="matchNav.stepMatch(finding.structureId, -1)"
                  @next="browseFinding(finding)"
                />
              </div>
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
</style>
