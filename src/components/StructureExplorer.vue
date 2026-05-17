<script setup>
import {useStructureExplorer} from '../ui/composables/useStructureExplorer.js';
import IconSearch from './icons/IconSearch.vue';
import IconTrash from './icons/IconTrash.vue';
import IconListChecks from './icons/IconListChecks.vue';
import IconPreview from './icons/IconPreview.vue';
import IconArrowLeft from './icons/IconArrowLeft.vue';
import IconArrowRight from './icons/IconArrowRight.vue';
import IconCopy from './icons/IconCopy.vue';
import IconClose from './icons/IconClose.vue';
import IconPlus from './icons/IconPlus.vue';
import FilterEditor from './FilterEditor.vue';

const {
  store,
  filters,
  expandedStructureId,
  structureNextNavHintId,
  exampleStructureId,
  showMatchesOnly,
  showDefineStructure,
  structureEditorSession,
  structureList,
  formatCategoryLabel,
  categoryGroupOptions,
  categoryOptions,
  visibleStructures,
  totalStructures,
  isPaged,
  pagedStructures,
  pageRange,
  selectedCount,
  activeStructure,
  activePreview,
  exampleStructure,
  canFindMatches,
  canClearResults,
  toggleSelection,
  activateStructure,
  findStructure,
  canFindStructure,
  canInspectStructure,
  getStructureMatchCount,
  hasStructureMatches,
  stepStructureMatch,
  getCurrentStructureMatchPosition,
  canTransformStructure,
  openStructureExploreNodes,
  openStructureTransform,
  toggleExpandedStructure,
  openExample,
  closeExample,
  handleStructureCreated,
  cancelStructureEditor,
  toggleDefineStructurePanel,
  openStructureEditorForEdit,
  openStructureEditorForFork,
  isUserDefinedStructure,
  copyExample,
  nextPage,
  prevPage,
} = useStructureExplorer();
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
        <select v-model="filters.categoryGroup" class="panel-select" title="Filter structures by category group">
          <option value="">All</option>
          <option v-for="categoryGroup in categoryGroupOptions" :key="categoryGroup.value" :value="categoryGroup.value">
            {{ categoryGroup.label }}
          </option>
        </select>
      </label>
      <label class="filter-field filter-field-inline">
        <span class="filter-label">Subcategory</span>
        <select v-model="filters.category" class="panel-select" title="Filter structures by category">
          <option value="">All</option>
          <option v-for="category in categoryOptions" :key="category.value" :value="category.value">
            {{ category.label }}
          </option>
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
        @click="void store.runKnownStructureMatching()"
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
      <button
        class="mini-btn structure-define-btn"
        type="button"
        :title="showDefineStructure ? 'Hide the new structure editor' : 'Define a new structure rule'"
        :aria-label="showDefineStructure ? 'Hide define new structure editor' : 'Show define new structure editor'"
        @click="toggleDefineStructurePanel"
      >
        <icon-close v-if="showDefineStructure" />
        <icon-plus v-else />
        <span>{{ showDefineStructure ? 'Hide New Structure' : 'Define New Structure' }}</span>
      </button>
      <label class="matches-toggle" title="Only show structures with one or more matches">
        <input v-model="showMatchesOnly" type="checkbox">
        <span>Matches only</span>
      </label>
    </div>

    <filter-editor
      v-if="showDefineStructure"
      create-structure
      :editor-session="structureEditorSession"
      @complete="handleStructureCreated"
      @cancel="cancelStructureEditor"
    />

    <div v-else ref="structureList" class="structure-list">
      <article
        v-for="structure in pagedStructures"
        :key="structure.id"
        :data-structure-id="structure.id"
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
                :disabled="structure.executionMode !== 'no-eval'"
                type="checkbox"
                :title="structure.executionMode === 'no-eval' ? 'Include this structure when searching the selected set' : 'This structure cannot run in the current environment yet'"
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

        <div
          v-if="expandedStructureId === structure.id && hasStructureMatches(structure)"
          class="card-match-nav card-match-nav-inline"
        >
          <button
            class="structure-nav-btn"
            type="button"
            title="Jump to the previous match for this structure"
            aria-label="Previous structure match"
            @click="stepStructureMatch(structure.id, -1)"
          >
            <icon-arrow-left />
            <span>Prev</span>
          </button>
          <div class="card-match-status" aria-live="polite">
            <strong>{{ getCurrentStructureMatchPosition(structure.id) }}</strong>
            <span>/</span>
            <span>{{ getStructureMatchCount(structure) }}</span>
            <span>matches</span>
          </div>
          <button
            class="structure-nav-btn"
            :class="{'structure-nav-btn-next-hint': structure.id === structureNextNavHintId}"
            type="button"
            title="Jump to the next match for this structure"
            aria-label="Next structure match"
            @click="stepStructureMatch(structure.id, 1)"
          >
            <span>Next</span>
            <icon-arrow-right />
          </button>
        </div>

        <div v-if="expandedStructureId === structure.id" class="structure-details">
          <div class="structure-card-top">
            <span class="structure-category">{{ formatCategoryLabel(structure.categoryGroup ?? 'obfuscation') }}</span>
            <span class="structure-category">{{ formatCategoryLabel(structure.category) }}</span>
            <span class="status-pill" :class="structure.executionMode === 'no-eval' ? 'good' : 'muted'">
              {{ structure.transformEnabled ? 'transform-ready' : structure.executionMode === 'no-eval' ? 'matcher-only' : 'blocked' }}
            </span>
          </div>

          <p class="structure-description">{{ structure.description }}</p>
          <p class="structure-note">{{ structure.support.note }}</p>

          <div class="card-stats">
            <span :class="{highlighted: hasStructureMatches(structure)}">{{ getStructureMatchCount(structure) }} matches</span>
            <span>{{ structure.executionMode }}</span>
          </div>

          <div class="card-actions">
            <div class="card-actions-main">
              <button
                class="structure-action"
                type="button"
                :disabled="!canInspectStructure(structure)"
                title="Open Explore Nodes for this structure"
                aria-label="Show structure matches"
                @click="openStructureExploreNodes(structure.id)"
              >
                <icon-list-checks />
                <span>Explore nodes</span>
              </button>
              <button
                class="structure-action structure-action-emphasis"
                type="button"
                :disabled="!canTransformStructure(structure)"
                title="Open the transformation options for this structure"
                aria-label="Open structure transform"
                @click="openStructureTransform(structure.id)"
              >
                <icon-preview />
                <span>Transform</span>
              </button>
            </div>
            <div class="card-actions-secondary">
              <button
                class="structure-action structure-action-subtle"
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
                class="structure-action structure-action-subtle"
                type="button"
                title="Open a code example for this structure"
                aria-label="Open structure example"
                @click="openExample(structure.id)"
              >
                <icon-copy />
                <span>Example</span>
              </button>
              <button
                v-if="isUserDefinedStructure(structure)"
                class="structure-action structure-action-subtle"
                type="button"
                title="Edit this user-defined structure rule"
                aria-label="Edit user-defined structure"
                @click="openStructureEditorForEdit(structure.id)"
              >
                <span>Edit</span>
              </button>
              <button
                v-else
                class="structure-action structure-action-subtle"
                type="button"
                title="Save a new user-defined structure starting from this rule"
                aria-label="Modify structure as new custom rule"
                @click="openStructureEditorForFork(structure.id)"
              >
                <span>Modify</span>
              </button>
            </div>
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

.explorer-actions {
  align-items: center;
}

.matches-toggle {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  white-space: nowrap;
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

.structure-define-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  white-space: nowrap;
  flex: 0 0 auto;
}

.structure-define-btn svg {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
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
  min-width: 24px;
  min-height: 24px;
}

.structure-summary-checkbox input {
  min-width: 24px;
  min-height: 24px;
  cursor: pointer;
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
  gap: 0.65rem;
  padding: 0 0.9rem 0.85rem;
}

.card-match-nav-inline {
  justify-content: flex-end;
  padding: 0 0.9rem 0.15rem;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  margin-top: 0.1rem;
}

.card-actions-main,
.card-actions-secondary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.card-actions-main {
  flex: 1 1 auto;
}

.card-actions-secondary {
  flex: 0 0 auto;
}

.card-actions-main .structure-action {
  flex: 1 1 0;
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
  width: auto;
  padding: 0.46rem 0.7rem;
  min-height: 2rem;
  cursor: pointer;
  white-space: nowrap;
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

.structure-action-subtle {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
}

.structure-action-subtle:hover:not(:disabled),
.structure-action-subtle:focus-visible:not(:disabled) {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.18);
}

.structure-action:disabled {
  opacity: 1;
  cursor: not-allowed;
  color: rgba(233, 240, 248, 0.62);
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.structure-nav-btn {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.28rem 0.58rem;
  min-height: 1.8rem;
  cursor: pointer;
  white-space: nowrap;
}

.structure-nav-btn:hover:not(:disabled),
.structure-nav-btn:focus-visible:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  outline: none;
}

@keyframes structure-nav-next-glow {
  0%,
  100% {
    border-color: rgba(126, 202, 255, 0.38);
    box-shadow: 0 0 0 0 rgba(126, 202, 255, 0.18);
  }

  50% {
    border-color: rgba(126, 202, 255, 0.62);
    box-shadow: 0 0 14px 3px rgba(126, 202, 255, 0.28);
  }
}

.structure-nav-btn.structure-nav-btn-next-hint {
  animation: structure-nav-next-glow 2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .structure-nav-btn.structure-nav-btn-next-hint {
    animation: none;
    border-color: rgba(126, 202, 255, 0.48);
    box-shadow: 0 0 10px rgba(126, 202, 255, 0.22);
  }
}

.card-match-status {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.28rem;
  min-width: 0;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.card-match-status strong {
  color: var(--text-primary);
  font-size: 0.92rem;
}

@media (max-width: 640px) {
  .card-match-nav,
  .card-actions,
  .card-actions-main,
  .card-actions-secondary {
    flex-wrap: wrap;
  }

  .card-actions {
    gap: 0.55rem;
  }

  .card-actions-main,
  .card-actions-secondary {
    width: 100%;
  }

  .card-actions-secondary {
    justify-content: flex-start;
  }
}

@media (max-width: 520px) {
  .card-actions-main {
    flex-direction: column;
  }

  .card-actions-main .structure-action {
    width: 100%;
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
  .workspace-panel {
    height: auto;
  }

  .structure-list {
    flex: 0 0 auto;
    overflow: visible;
    padding-right: 0;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .search-filter,
  .filter-field-wide {
    grid-column: auto;
  }
}
</style>
