<script setup>
import {computed} from 'vue';
import store from '../store';
import FileLoader from './FileLoader.vue';
import ParseButton from './ParseButton.vue';
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
    <div class="header-brand">
      <h1>flASTer Workspace</h1>
    </div>
    <div class="header-script-name" :title="store.currentScriptLabel">
      {{ store.getCurrentScriptDisplayName() }}
    </div>
    <div class="header-actions">
      <file-loader />
      <parse-button />
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
  min-width: 0;
  width: 100%;
  flex: 1;
}

.header-brand {
  flex: 0 0 auto;
  min-width: 0;
}

h1 {
  font-size: 1.2rem;
  line-height: 1.1;
  white-space: nowrap;
}

.header-script-name {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  max-width: min(28rem, calc(100% - 34rem));
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.6rem;
  flex-wrap: nowrap;
  min-width: 0;
  overflow: visible;
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
  }

  .workspace-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-script-name {
    position: static;
    left: auto;
    transform: none;
    max-width: none;
    text-align: left;
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
