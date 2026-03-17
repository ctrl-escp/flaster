<script setup>
import {computed, onBeforeUnmount, ref} from 'vue';
import store from './store';
import InputCodeEditor from './components/InputCodeEditor.vue';
import ToasterView from './components/ToasterView.vue';
import WorkspaceHeader from './components/WorkspaceHeader.vue';
import ExportPanel from './components/ExportPanel.vue';
import InvestigationPane from './components/InvestigationPane.vue';
import ContextPanel from './components/ContextPanel.vue';

const workspaceGrid = ref(null);
const leftWidth = ref(352);
const rightWidth = ref(384);

const MIN_LEFT_WIDTH = 288;
const MIN_CENTER_WIDTH = 544;
const MIN_RIGHT_WIDTH = 320;
const HANDLE_WIDTH = 10;
const GRID_GAP = 16;

let activeResize = null;

const workspaceGridStyle = computed(() => ({
  '--left-column-width': `${leftWidth.value}px`,
  '--right-column-width': `${rightWidth.value}px`,
}));

function getAvailableContentWidth() {
  const containerWidth = workspaceGrid.value?.clientWidth ?? 0;
  return containerWidth - (HANDLE_WIDTH * 2) - (GRID_GAP * 4);
}

function clampLeftWidth(width) {
  const maxWidth = getAvailableContentWidth() - MIN_CENTER_WIDTH - rightWidth.value;
  return Math.min(Math.max(width, MIN_LEFT_WIDTH), Math.max(MIN_LEFT_WIDTH, maxWidth));
}

function clampRightWidth(width) {
  const maxWidth = getAvailableContentWidth() - MIN_CENTER_WIDTH - leftWidth.value;
  return Math.min(Math.max(width, MIN_RIGHT_WIDTH), Math.max(MIN_RIGHT_WIDTH, maxWidth));
}

function updateResize(event) {
  if (!activeResize) {
    return;
  }

  const delta = event.clientX - activeResize.startX;

  if (activeResize.side === 'left') {
    leftWidth.value = clampLeftWidth(activeResize.startWidth + delta);
    return;
  }

  rightWidth.value = clampRightWidth(activeResize.startWidth - delta);
}

function stopResize() {
  activeResize = null;
  window.removeEventListener('pointermove', updateResize);
  window.removeEventListener('pointerup', stopResize);
}

function startResize(side, event) {
  if (window.innerWidth <= 1280) {
    return;
  }

  activeResize = {
    side,
    startX: event.clientX,
    startWidth: side === 'left' ? leftWidth.value : rightWidth.value,
  };

  window.addEventListener('pointermove', updateResize);
  window.addEventListener('pointerup', stopResize);
}

onBeforeUnmount(() => {
  stopResize();
});
</script>

<template>
  <main class="app-shell">
    <div ref="workspaceGrid" class="workspace-grid" :style="workspaceGridStyle">
      <section class="header-strip">
        <workspace-header />
      </section>

      <aside class="workspace-column left-column">
        <investigation-pane />
      </aside>

      <div
        class="resize-handle resize-left"
        title="Drag to make the code editor narrower or wider"
        @pointerdown.prevent="startResize('left', $event)"
      ></div>

      <section class="workspace-column center-column">
        <section class="workspace-panel code-panel">
          <div class="panel-header">
            <h2>Current working script</h2>
            <div class="panel-meta">
              <span>{{ store.selectedNodeSource || 'No selection' }}</span>
              <span v-if="store.getSelectedNode()">Node {{ store.getSelectedNode()?.nodeId }}</span>
            </div>
          </div>
          <input-code-editor />
        </section>
      </section>

      <div
        class="resize-handle resize-right"
        title="Drag to make the code editor narrower or wider"
        @pointerdown.prevent="startResize('right', $event)"
      ></div>

      <aside class="workspace-column right-column">
        <context-panel />
      </aside>
    </div>
  </main>
  <export-panel v-if="store.exportPanelOpen" />
  <toaster-view />
</template>

<style scoped>
.app-shell {
  height: calc(100vh - 1.8rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace-grid {
  display: grid;
  grid-template-columns:
    minmax(18rem, var(--left-column-width))
    10px
    minmax(34rem, 1fr)
    10px
    minmax(20rem, var(--right-column-width));
  grid-template-rows: auto minmax(0, 1fr);
  grid-template-areas:
    'header header header header right'
    'left left-handle center right-handle right';
  gap: 1rem;
  align-items: stretch;
  flex: 1;
  min-height: 0;
}

.header-strip {
  grid-area: header;
  min-width: 0;
  display: flex;
  align-items: center;
}

.left-column {
  grid-area: left;
}

.center-column {
  grid-area: center;
}

.right-column {
  grid-area: right;
}

.workspace-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.resize-handle {
  align-self: stretch;
  min-height: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: col-resize;
  position: relative;
}

.resize-handle::after {
  content: '';
  position: absolute;
  inset: 20% 3px;
  border-radius: 999px;
  background: rgba(126, 202, 255, 0.18);
}

.resize-left {
  grid-area: left-handle;
}

.resize-right {
  grid-area: right-handle;
}

.workspace-panel {
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  background: var(--panel-surface);
  padding: 0.9rem;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.14);
}

.center-column {
  min-width: 0;
  overflow: auto;
  padding-right: 0.1rem;
}

.code-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  flex: 1;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

h2 {
  font-size: 1.05rem;
  line-height: 1.2;
}

.panel-meta {
  color: var(--text-muted);
}

.panel-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.7rem;
}

@media (max-width: 1280px) {
  .workspace-grid {
    grid-template-columns: minmax(18rem, 22rem) minmax(0, 1fr);
    grid-template-areas:
      'header header'
      'left center'
      'right right';
  }

  .resize-handle {
    display: none;
  }
}

@media (max-width: 900px) {
  .app-shell {
    height: auto;
    overflow: visible;
  }

  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .workspace-column,
  .center-column {
    overflow: visible;
  }
}
</style>
