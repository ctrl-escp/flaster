<script setup>
import {computed, ref} from 'vue';
import store from '../store';
import {apiDetectorRegistry} from '../domain/apiInteractions/index.js';
import {buildApiDetectorCodeExample} from '../domain/apiInteractions/codeExampleBuilder.js';

const status = computed(() => store.apiInteractionsStatus);
const inferences = computed(() => store.apiInferences);
const hits = computed(() => store.apiDetectorHits);

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

function allExtractions(matches) {
  const byRole = {};
  for (let i = 0; i < matches.length; i++) {
    const extractions = matches[i].extractions;
    const roles = Object.keys(extractions);
    for (let j = 0; j < roles.length; j++) {
      const role = roles[j];
      const slot = extractions[role];
      if (!byRole[role]) byRole[role] = new Set();
      for (let p = 0; p < slot.values.length; p++) byRole[role].add(slot.values[p]);
    }
  }
  return Object.entries(byRole).map(([role, vals]) => ({role, values: [...vals]}));
}

const isEmpty = computed(() =>
  status.value === 'done' && inferences.value.length === 0 && firedDetectors.value.length === 0,
);

function openDetectorInExplorer(detectorId) {
  store.setSelectedKnownStructureIds([
    ...new Set([...store.selectedKnownStructureIds, detectorId]),
  ]);
  store.setActiveKnownStructure(detectorId);
  store.setActiveWorkspaceTab('explorer');
}
</script>

<template>
  <section class="workspace-panel api-panel">
    <div class="panel-header">
      <h2>API Interactions</h2>
      <div class="panel-meta">
        <span v-if="status === 'done'">
          {{ inferences.length }} inference{{ inferences.length === 1 ? '' : 's' }},
          {{ firedDetectors.length }} detector{{ firedDetectors.length === 1 ? '' : 's' }}
        </span>
        <span v-else-if="status === 'running'">Analysing…</span>
        <span v-else>Load a script to begin</span>
      </div>
    </div>

    <p class="helper-copy">
      Behavioral inferences and browser API usage detected in the loaded script.
    </p>

    <div v-if="status === 'idle'" class="empty-state">
      Load a script to see its API interactions.
    </div>

    <div v-else-if="status === 'running'" class="empty-state">
      Analysing…
    </div>

    <div v-else-if="isEmpty" class="empty-state">
      No notable API interactions detected.
    </div>

    <template v-else>
      <!-- ── Inferences ──────────────────────────────────── -->
      <div v-if="inferences.length" class="section">
        <h3 class="section-title">Behavioral Inferences</h3>
        <ul class="inference-list">
          <li v-for="inf in inferences" :key="inf.id" class="inference-row">
            <div class="inference-head">
              <span class="risk-badge" :class="inf.risk">{{ inf.risk }}</span>
              <span class="inference-title">{{ inf.title }}</span>
            </div>
            <p class="inference-desc">{{ inf.description }}</p>
            <p class="risk-reason">{{ inf.riskReason }}</p>
            <div class="contributing-detectors">
              <span
                v-for="id in inf.firedDetectorIds"
                :key="id"
                class="detector-chip"
              >{{ detectorById[id]?.title ?? id }}</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- ── Detectors ──────────────────────────────────── -->
      <div v-if="firedDetectors.length" class="section">
        <h3 class="section-title">Detected API Calls</h3>
        <ul class="detector-list">
          <li v-for="{row, matches} in firedDetectors" :key="row.id" class="detector-row">
            <button
              class="detector-head detector-head-btn"
              type="button"
              :title="`Show ${row.title} in Code Structures`"
              @click="openDetectorInExplorer(row.id)"
            >
              <span class="detector-title">{{ row.title }}</span>
              <span class="match-count">{{ matches.length }}×</span>
            </button>
            <template v-for="{ role, values } in allExtractions(matches)" :key="role">
              <div v-if="values.length" class="extraction-row">
                <span class="extraction-role">{{ role }}</span>
                <span v-for="v in values" :key="v" class="extraction-value">{{ v }}</span>
              </div>
            </template>
            <div class="example-actions">
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
            <pre v-if="expandedExampleId === row.id" class="detector-example"><code>{{ codeExampleFor(row) }}</code></pre>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.api-panel {
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

/* ── Inferences ──────────────────────────────────── */

.inference-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.inference-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.02);
}

.inference-head {
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

.inference-title {
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.3;
}

.inference-desc {
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

/* ── Detectors ──────────────────────────────────── */

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

.detector-head-btn {
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  padding: 0;
  cursor: pointer;
  text-align: left;
}

.detector-head-btn:hover,
.detector-head-btn:focus-visible {
  outline: none;
}

.detector-head-btn:hover .detector-title,
.detector-head-btn:focus-visible .detector-title {
  color: #d7f0ff;
}

.detector-title {
  font-size: 0.78rem;
  font-weight: 500;
  font-family: var(--font-mono, monospace);
}

.match-count {
  font-size: 0.68rem;
  color: var(--text-muted);
  flex-shrink: 0;
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
  gap: 0.35rem;
  margin-top: 0.15rem;
}

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

.example-toggle:hover,
.example-copy:hover,
.example-toggle:focus-visible,
.example-copy:focus-visible {
  color: #d7f0ff;
  border-color: rgba(126, 202, 255, 0.28);
  outline: none;
}

.detector-example {
  margin: 0.25rem 0 0;
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
