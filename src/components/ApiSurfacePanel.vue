<script setup>
import {computed, ref} from 'vue';
import store from '../store';
import {apiDetectorRegistry} from '../domain/apiSurface/index.js';
import {buildApiDetectorCodeExample} from '../domain/apiSurface/codeExampleBuilder.js';
import {mergeDetectorExtractions} from '../domain/report/index.js';
import {useFindingMatchNav} from '../ui/composables/useFindingMatchNav.js';
import FindingMatchNav from './FindingMatchNav.vue';

const status = computed(() => store.apiSurfaceStatus);
const capabilities = computed(() => store.capabilities);
const hits = computed(() => store.apiDetectorHits);
const matchNav = useFindingMatchNav();

const detectorById = Object.fromEntries(apiDetectorRegistry.map(r => [r.id, r]));
const expandedExampleId = ref('');

function codeExampleFor(row) {
  return store.getKnownStructureById(row.id)?.codeExample || buildApiDetectorCodeExample(row);
}

function toggleExample(detectorId) {
  expandedExampleId.value = expandedExampleId.value === detectorId ? '' : detectorId;
}

async function copyDetectorExample(row) {
  const text = codeExampleFor(row);
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    store.logMessage(`Copied example for ${row.title}`, 'success');
  } catch (error) {
    store.logMessage(`Unable to copy example: ${error.message}`, 'error');
  }
}

const firedDetectors = computed(() => {
  const h = hits.value;
  const result = [];
  for (const row of apiDetectorRegistry) {
    const matches = h[row.id];
    if (matches?.length) result.push({row, matches});
  }
  return result;
});

const isEmpty = computed(() =>
  status.value === 'done' && capabilities.value.length === 0 && firedDetectors.value.length === 0,
);
</script>

<template>
  <section class="workspace-panel api-surface-panel">
    <div class="panel-header">
      <h2>API Surface</h2>
      <div class="panel-meta">
        <span v-if="status === 'done'">
          {{ capabilities.length }} capabilit{{ capabilities.length === 1 ? 'y' : 'ies' }},
          {{ firedDetectors.length }} detector{{ firedDetectors.length === 1 ? '' : 's' }}
        </span>
        <span v-else-if="status === 'running'">Analysing…</span>
        <span v-else>Load a script to begin</span>
      </div>
    </div>

    <p class="helper-copy">
      Capabilities and browser API usage detected in the loaded script.
    </p>

    <div v-if="status === 'idle'" class="empty-state">
      Load a script to see its API surface.
    </div>

    <div v-else-if="status === 'running'" class="empty-state">
      Analysing…
    </div>

    <div v-else-if="isEmpty" class="empty-state">
      No notable API surface usage detected.
    </div>

    <template v-else>
      <div v-if="capabilities.length" class="section">
        <h3 class="section-title">Capabilities</h3>
        <ul class="capability-list">
          <li v-for="cap in capabilities" :key="cap.id" class="capability-row">
            <div class="capability-head">
              <span class="risk-badge" :class="cap.risk">{{ cap.risk }}</span>
              <span class="capability-title">{{ cap.title }}</span>
            </div>
            <p class="capability-desc">{{ cap.description }}</p>
            <p class="risk-reason">{{ cap.riskReason }}</p>
            <div class="contributing-detectors">
              <span
                v-for="id in cap.firedDetectorIds"
                :key="id"
                class="detector-chip"
              >{{ detectorById[id]?.title ?? id }}</span>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="firedDetectors.length" class="section">
        <h3 class="section-title">API Surface</h3>
        <ul class="detector-list">
          <li v-for="{row, matches} in firedDetectors" :key="row.id" class="detector-row">
            <div class="detector-head">
              <span class="detector-title">{{ row.title }}</span>
            </div>
            <template v-for="{ role, values } in mergeDetectorExtractions(matches)" :key="role">
              <div v-if="values.length" class="extraction-row">
                <span class="extraction-role">{{ role }}</span>
                <span v-for="v in values" :key="v" class="extraction-value">{{ v }}</span>
              </div>
            </template>
            <div class="detector-footer">
              <div class="example-actions">
              <button
                class="example-structure"
                type="button"
                :title="`Show ${row.title} in Code Structures`"
                @click="matchNav.openInExplorer(row.id)"
              >
                Code structure
              </button>
              <button
                class="example-toggle"
                type="button"
                :aria-expanded="expandedExampleId === row.id"
                @click="toggleExample(row.id)"
              >
                {{ expandedExampleId === row.id ? 'Hide example' : 'Show example' }}
              </button>
              <button
                class="example-copy"
                type="button"
                title="Copy example code"
                aria-label="Copy example code"
                @click="copyDetectorExample(row)"
              >
                Copy
              </button>
              </div>
              <finding-match-nav
                :active="matchNav.isMatchActive(row.id)"
                :position="matchNav.matchPosition(row.id)"
                :total="matchNav.matchCount(row.id)"
                @prev="matchNav.stepMatch(row.id, -1)"
                @next="matchNav.stepMatch(row.id, 1)"
              />
            </div>
            <pre v-if="expandedExampleId === row.id" class="detector-example"><code>{{ codeExampleFor(row) }}</code></pre>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.api-surface-panel {
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

.helper-copy {
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
  gap: 0.5rem;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.capability-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.capability-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.02);
}

.capability-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

.capability-title {
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.3;
}

.capability-desc {
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

.contributing-detectors {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.1rem;
}

.detector-chip {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 5px;
  background: rgba(126, 202, 255, 0.1);
  border: 1px solid rgba(126, 202, 255, 0.2);
  color: rgba(126, 202, 255, 0.85);
}

.detector-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.detector-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.45rem 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.02);
}

.detector-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.detector-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  margin-top: 0.15rem;
}

.detector-title {
  font-size: 0.78rem;
  font-weight: 500;
  font-family: var(--font-mono, monospace);
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

.example-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-width: 0;
}

.example-structure,
.example-toggle,
.example-copy {
  font-size: 0.65rem;
  padding: 0.12rem 0.45rem;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-muted);
  cursor: pointer;
}

.example-structure:hover,
.example-toggle:hover,
.example-copy:hover,
.example-structure:focus-visible,
.example-toggle:focus-visible,
.example-copy:focus-visible {
  color: #d7f0ff;
  border-color: rgba(126, 202, 255, 0.28);
  outline: none;
}

.detector-example {
  margin: 0.25rem 0 0;
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
