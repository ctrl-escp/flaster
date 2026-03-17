<script setup>
import {computed} from 'vue';
import store from '../store';
import FileLoader from './FileLoader.vue';
import ParseButton from './ParseButton.vue';
import IconRefresh from './icons/IconRefresh.vue';
import IconReset from './icons/IconReset.vue';
import IconExport from './icons/IconExport.vue';

const dependencyVersions = computed(() => ([
  {
    label: 'flAST',
    version: window.flast?.version ?? 'unknown',
    href: 'https://github.com/ctrl-escp/flast',
  },
  {
    label: 'REstringer',
    version: window.restringer?.version ?? 'unknown',
    href: 'https://github.com/ctrl-escp/restringer',
  },
]));
</script>

<template>
  <section class="workspace-header">
    <h1>flASTer Workspace</h1>
    <div class="header-actions">
      <file-loader />
      <parse-button />
      <button class="header-btn" type="button" title="Clear parsed state and structure matches for the current script" @click="store.resetParsedState()">
        <icon-reset class="header-icon" />
        <span>Reset</span>
      </button>
      <button class="header-btn" type="button" title="Run known-structure matching again on the current script" @click="store.runKnownStructureMatching()">
        <icon-refresh class="header-icon" />
        <span>Refresh</span>
      </button>
      <button class="header-btn primary" type="button" title="Open the generated Node.js export in a modal" @click="store.exportPanelOpen = true">
        <icon-export class="header-icon" />
        Export
      </button>
      <div class="version-chips" aria-label="Tool dependency versions">
        <a
          v-for="dependency in dependencyVersions"
          :key="dependency.label"
          class="version-chip"
          :href="dependency.href"
          target="_blank"
          rel="noreferrer"
          :title="`Open ${dependency.label} repository`"
        >
          {{ dependency.label }} v{{ dependency.version }}
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
  width: 100%;
  flex: 1;
}

h1 {
  font-size: 1.2rem;
  line-height: 1.1;
  white-space: nowrap;
}

.version-chips {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5rem;
  margin-left: auto;
  justify-content: flex-end;
  flex-shrink: 0;
}

.version-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  font-size: 0.82rem;
  letter-spacing: 0.01em;
  text-decoration: none;
  transition: border-color 140ms ease, color 140ms ease, background 140ms ease;
}

.version-chip:hover,
.version-chip:focus-visible {
  border-color: var(--accent);
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
  outline: none;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
  flex-wrap: nowrap;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
}

.header-btn {
  min-height: 2.5rem;
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  padding: 0.55rem 0.8rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.header-btn.primary {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: #081018;
  border-color: transparent;
  font-weight: 700;
}

.header-icon {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 980px) {
  .header-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
    overflow-x: visible;
  }

  .workspace-header {
    flex-direction: column;
    align-items: stretch;
  }

  h1 {
    white-space: normal;
  }

  .version-chips {
    margin-left: 0;
    flex-wrap: wrap;
  }
}
</style>
