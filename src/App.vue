<script setup>
import {computed, onBeforeUnmount, ref} from 'vue';
import store from './store';
import InputCodeEditor from './components/InputCodeEditor.vue';
import ToasterView from './components/ToasterView.vue';
import WorkspaceHeader from './components/WorkspaceHeader.vue';
import ExportPanel from './components/ExportPanel.vue';
import WorkflowPanel from './components/WorkflowPanel.vue';

const workspaceGrid = ref(null);
const leftWidth = ref(0);

const MIN_LEFT_WIDTH = 288;
const MIN_RIGHT_WIDTH = 288;
const HANDLE_WIDTH = 10;
const MIN_PANEL_RATIO = 1 / 3;
const MAX_PANEL_RATIO = 2 / 3;
const MOBILE_BREAKPOINT = 900;

let activeResize = null;
const mobileActivePane = ref('left');

const workspaceGridStyle = computed(() => ({
  '--left-column-width': leftWidth.value > 0 ? `${leftWidth.value}px` : '1fr',
  '--right-column-width': leftWidth.value > 0 ? 'minmax(18rem, 1fr)' : '1fr',
  '--mobile-left-row': mobileActivePane.value === 'left' ? 'minmax(5.5rem, 9fr)' : 'minmax(5.5rem, 1fr)',
  '--mobile-right-row': mobileActivePane.value === 'right' ? 'minmax(5.5rem, 9fr)' : 'minmax(5.5rem, 1fr)',
}));

function getAvailableContentWidth() {
  const containerWidth = workspaceGrid.value?.clientWidth ?? 0;
  return containerWidth - HANDLE_WIDTH - 8;
}

function clampLeftWidth(width) {
  const availableWidth = getAvailableContentWidth();
  const minWidth = Math.max(MIN_LEFT_WIDTH, availableWidth * MIN_PANEL_RATIO);
  const maxWidth = Math.min(availableWidth - MIN_RIGHT_WIDTH, availableWidth * MAX_PANEL_RATIO);

  return Math.min(Math.max(width, minWidth), Math.max(minWidth, maxWidth));
}

function updateResize(event) {
  if (!activeResize) {
    return;
  }

  const delta = event.clientX - activeResize.startX;
  leftWidth.value = clampLeftWidth(activeResize.startWidth + delta);
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
    startWidth: leftWidth.value,
  };

  window.addEventListener('pointermove', updateResize);
  window.addEventListener('pointerup', stopResize);
}

function setMobileActivePane(pane) {
  if (window.innerWidth > MOBILE_BREAKPOINT) {
    return;
  }

  mobileActivePane.value = pane;
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

      <aside
        class="workspace-column left-column"
        :class="{
          'is-mobile-active': mobileActivePane === 'left',
          'is-mobile-inactive': mobileActivePane !== 'left',
        }"
        @click="setMobileActivePane('left')"
      >
        <div class="mobile-pane-hint" aria-hidden="true">Tap to expand workflow</div>
        <workflow-panel />
      </aside>

      <div
        class="resize-handle resize-left"
        title="Drag to resize the workflow and code panels"
        @pointerdown.prevent="startResize('left', $event)"
      ></div>

      <section
        class="workspace-column right-column"
        :class="{
          'is-mobile-active': mobileActivePane === 'right',
          'is-mobile-inactive': mobileActivePane !== 'right',
        }"
        @click="setMobileActivePane('right')"
      >
        <div class="mobile-pane-hint" aria-hidden="true">Tap to expand code editor</div>
        <section class="workspace-panel code-panel">
          <input-code-editor />
        </section>
      </section>
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
    var(--right-column-width);
  grid-template-rows: auto minmax(0, 1fr);
  grid-template-areas:
    'header header header'
    'left left-handle right';
  gap: .5rem;
  align-items: stretch;
  flex: 1;
  min-height: 0;
}

.header-strip {
  grid-area: header;
  min-width: 0;
  display: flex;
  align-items: center;
  padding-top: 0.35rem;
}

.left-column {
  grid-area: left;
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
  position: relative;
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

.workspace-panel {
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  background: var(--panel-surface);
  padding: 0.9rem;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.14);
}

.right-column {
  min-width: 0;
  overflow: auto;
  padding-right: 0.1rem;
}

.code-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
}

@media (max-width: 1280px) {
  .workspace-grid {
    grid-template-columns: minmax(18rem, 1fr) minmax(18rem, 1fr);
    grid-template-areas:
      'header header'
      'left right';
  }

  .resize-handle {
    display: none;
  }
}

@media (max-width: 900px) {
  .app-shell {
    height: calc(100dvh - 1.8rem);
    min-height: calc(100dvh - 1.8rem);
    overflow: hidden;
  }

  .workspace-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto var(--mobile-left-row) var(--mobile-right-row);
    grid-template-areas:
      'header'
      'left'
      'right';
    min-height: 0;
  }

  .workspace-column,
  .right-column {
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    transition: flex-basis 180ms ease, min-height 180ms ease, opacity 180ms ease;
  }

  .workspace-column.is-mobile-active {
    opacity: 1;
  }

  .workspace-column.is-mobile-inactive {
    opacity: 0.92;
  }

  .mobile-pane-hint {
    position: sticky;
    top: 0.35rem;
    align-self: flex-end;
    z-index: 2;
    margin: 0.35rem 0.35rem -0.2rem;
    padding: 0.22rem 0.5rem;
    border-radius: 999px;
    border: 1px solid rgba(126, 202, 255, 0.16);
    background: rgba(7, 17, 29, 0.78);
    color: rgba(233, 240, 248, 0.72);
    font-size: 0.72rem;
    letter-spacing: 0.02em;
    pointer-events: none;
    opacity: 0;
    transform: translateY(-4px);
    transition: opacity 180ms ease, transform 180ms ease;
    backdrop-filter: blur(8px);
  }

  .workspace-column.is-mobile-inactive .mobile-pane-hint {
    opacity: 1;
    transform: translateY(0);
  }

  .workspace-column.is-mobile-inactive :deep(.flow-step-copy small),
  .workspace-column.is-mobile-inactive :deep(.helper-copy),
  .workspace-column.is-mobile-inactive :deep(.panel-meta) {
    opacity: 0;
  }

  .code-panel {
    min-height: 0;
  }
}
</style>
