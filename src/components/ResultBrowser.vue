<script setup>
import {useResultBrowser} from '../ui/composables/useResultBrowser.js';
import NodeInspectorContent from './NodeInspectorContent.vue';
import IconArrowLeft from './icons/IconArrowLeft.vue';
import IconArrowRight from './icons/IconArrowRight.vue';
import IconArrowUp from './icons/IconArrowUp.vue';
import IconArrowDown from './icons/IconArrowDown.vue';

const {
  store,
  modes,
  totalItems,
  isPaged,
  pagedItems,
  pageRange,
  canOpenMode,
  isRelatedMode,
  canRestoreRelatedFocusBack,
  relatedFocusBackLabel,
  selectItem,
  focusRelatedItem,
  restoreRelatedFocusBack,
  toggleResultItemExpand,
  isResultItemExpanded,
  itemNodeSourceLabel,
  isActive,
  isRelatedFocusAnchor,
  nextPage,
  prevPage,
} = useResultBrowser();
</script>

<template>
  <section class="workspace-panel">
    <div class="panel-header">
      <h2>Explore Nodes</h2>
      <div class="panel-meta">
        <button
          v-if="isPaged"
          class="mini-btn icon-btn"
          type="button"
          title="Previous page"
          aria-label="Previous page"
          @click="prevPage"
        >
          <icon-arrow-left />
        </button>
        <button
          v-if="isPaged"
          class="mini-btn icon-btn"
          type="button"
          title="Next page"
          aria-label="Next page"
          @click="nextPage"
        >
          <icon-arrow-right />
        </button>
        <span v-if="isPaged">{{ pageRange }} / </span>{{ totalItems }} visible
      </div>
    </div>

    <div class="mode-switches">
      <button
        v-for="mode in modes"
        :key="mode.id"
        class="mode-btn"
        :class="{active: store.activeResultMode === mode.id}"
        type="button"
        :disabled="!canOpenMode(mode.id)"
        :title="`Show ${mode.label.toLowerCase()} in the result list`"
        @click="store.setActiveResultMode(mode.id)"
      >
        {{ mode.label }}
      </button>
    </div>

    <div class="browser-actions">
      <button
        class="mini-btn icon-btn"
        type="button"
        title="Jump to the previous item"
        aria-label="Previous item"
        :disabled="!store.getKnownStructureMatches().length"
        @click="store.selectKnownStructureMatchStep(-1)"
      >
        <icon-arrow-up />
      </button>
      <button
        class="mini-btn icon-btn"
        type="button"
        title="Jump to the next item"
        aria-label="Next item"
        :disabled="!store.getKnownStructureMatches().length"
        @click="store.selectKnownStructureMatchStep(1)"
      >
        <icon-arrow-down />
      </button>
      <button class="mini-btn" type="button" :disabled="!canOpenMode('ast')" title="Show raw AST nodes in the result list" @click="store.setActiveResultMode('ast')">All</button>
      <button class="mini-btn" type="button" :disabled="!canOpenMode('related')" title="Show nodes related to the current selection" @click="store.setActiveResultMode('related')">Related</button>
      <button
        v-if="isRelatedMode && canRestoreRelatedFocusBack"
        class="mini-btn related-back-btn"
        type="button"
        :title="`Return focus to ${relatedFocusBackLabel}`"
        aria-label="Return to previous related focus"
        @click="restoreRelatedFocusBack"
      >
        <icon-arrow-left />
        <span>Back</span>
      </button>
    </div>

    <div class="result-list">
      <article
        v-for="item in pagedItems"
        :key="item.key"
        class="result-item"
        :class="{
          active: isActive(item),
          expanded: isResultItemExpanded(item),
          'focus-anchor': isRelatedFocusAnchor(item),
        }"
      >
        <div class="result-item-top">
          <button
            class="result-item-main"
            type="button"
            :title="isRelatedMode ? 'Show this node in the editor' : item.summary"
            @click="selectItem(item)"
          >
            <strong>{{ item.label }}</strong>
            <small v-if="item.relationLabel" class="relation-tag">{{ item.relationLabel }}</small>
            <span v-if="isRelatedFocusAnchor(item)" class="focus-anchor-tag">Focus</span>
            <span>{{ item.summary }}</span>
            <small>{{ item.meta }}</small>
          </button>
          <button
            v-if="isRelatedMode && item.node"
            class="mini-btn related-focus-btn"
            type="button"
            title="Use this node as the related-list anchor"
            aria-label="Set related focus to this node"
            @click.stop="focusRelatedItem(item)"
          >
            Focus
          </button>
          <button
            class="result-item-caret mini-btn icon-btn"
            type="button"
            :title="isResultItemExpanded(item) ? 'Hide node details' : 'Show node details'"
            :aria-expanded="isResultItemExpanded(item)"
            aria-label="Toggle node details"
            @click.stop="toggleResultItemExpand(item)"
          >
            <span class="caret-icon" :class="{open: isResultItemExpanded(item)}" aria-hidden="true">^</span>
          </button>
        </div>
        <div v-if="isResultItemExpanded(item) && item.node" class="result-item-body">
          <NodeInspectorContent
            :node="item.node"
            :source-label="itemNodeSourceLabel(item)"
            :structure-match="item.kind === 'match' ? item.match : null"
            embed
          />
        </div>
        <div v-else-if="isResultItemExpanded(item) && !item.node" class="result-item-body result-item-body-empty">
          No node is available for this row.
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.workspace-panel {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-height: 0;
  min-width: 0;
  height: 100%;
}

.panel-header,
.mode-switches,
.browser-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
}

.panel-header {
  justify-content: space-between;
  min-height: 1.5rem;
  min-width: 0;
}

.panel-header h2 {
  min-width: 0;
}

.panel-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  min-height: 1.25rem;
  white-space: nowrap;
}

.mode-btn,
.mini-btn,
.result-item,
.result-item-main {
  border: 1px solid var(--panel-border);
  color: var(--text-primary);
}

.mode-btn,
.mini-btn {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 9px;
  cursor: pointer;
}

.mode-btn:not(.icon-btn),
.mini-btn:not(.icon-btn) {
  padding: 0.42rem 0.65rem;
}

.mode-btn.active {
  background: rgba(126, 202, 255, 0.2);
  border-color: rgba(126, 202, 255, 0.42);
  color: #eef8ff;
  box-shadow: inset 0 0 0 1px rgba(126, 202, 255, 0.12);
}

.mode-btn:hover:not(:disabled):not(.active),
.mode-btn:focus-visible:not(:disabled):not(.active),
.mini-btn:hover:not(:disabled),
.mini-btn:focus-visible:not(:disabled) {
  background: rgba(126, 202, 255, 0.1);
  border-color: rgba(126, 202, 255, 0.24);
  outline: none;
}

.mode-btn:disabled,
.mini-btn:disabled,
.result-item-main:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.mode-btn.active:disabled,
.result-item-main.active:disabled {
  opacity: 1;
  cursor: default;
}

.mode-switches,
.browser-actions {
  flex: 0 0 auto;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
}

.result-item {
  background: var(--panel-card);
  border-radius: 12px;
  padding: 0.7rem 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.55rem;
  width: 100%;
  box-sizing: border-box;
  flex: 0 0 auto;
  min-width: 0;
  max-width: 100%;
}

.result-item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem;
  min-width: 0;
}

.result-item-main {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.18rem;
  text-align: left;
  cursor: pointer;
}

.result-item-main strong,
.result-item-main span,
.result-item-main small {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.result-item-main span,
.result-item-main small {
  color: var(--text-muted);
}

.relation-tag,
.focus-anchor-tag {
  align-self: flex-start;
  border-radius: 999px;
  padding: 0.12rem 0.5rem;
}

.relation-tag {
  color: #eef8ff;
  background: rgba(126, 202, 255, 0.18);
  border: 1px solid rgba(126, 202, 255, 0.3);
}

.focus-anchor-tag {
  color: #ffe9b8;
  background: rgba(255, 191, 102, 0.16);
  border: 1px solid rgba(255, 191, 102, 0.34);
}

.related-back-btn,
.related-focus-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  flex: 0 0 auto;
}

.related-focus-btn {
  align-self: center;
  font-size: 0.72rem;
  padding: 0.3rem 0.5rem;
}

.result-item.focus-anchor:not(.active) {
  border-color: rgba(255, 191, 102, 0.28);
}

.result-item.active {
  border-color: rgba(126, 202, 255, 0.5);
  box-shadow: 0 0 0 1px rgba(126, 202, 255, 0.16);
  background: rgba(126, 202, 255, 0.08);
}

.result-item-main:hover,
.result-item-main:focus-visible {
  outline: none;
}

.result-item-caret {
  flex: 0 0 auto;
  align-self: center;
}

.caret-icon {
  display: inline-block;
  font-size: 1rem;
  line-height: 1;
  font-weight: 700;
  transform: rotate(0deg);
  transition: transform 0.2s ease;
}

.caret-icon.open {
  transform: rotate(180deg);
}

.result-item-body {
  border-top: 1px solid var(--panel-border);
  padding-top: 0.55rem;
  margin-top: 0.1rem;
  min-width: 0;
}

.result-item-body-empty {
  color: var(--text-muted);
  font-size: 0.88rem;
}

.icon-btn {
  min-width: 2.25rem;
  padding-inline: 0.55rem;
  font-size: 1.15rem;
  line-height: 1;
}

@media (max-width: 900px) {
  .workspace-panel {
    height: auto;
  }

  .result-list {
    flex: 0 0 auto;
    overflow: visible;
  }
}

</style>
