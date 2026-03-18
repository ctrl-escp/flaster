<script setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import store from '../store';
import FileLoader from './FileLoader.vue';
import ParseButton from './ParseButton.vue';
import IconBandaid from './icons/IconBandaid.vue';
import IconExport from './icons/IconExport.vue';
import IconGithub from './icons/IconGithub.vue';

const BANDAID_ROTATIONS = [90, 180, 270];
const BANDAID_ANIMATION_MS = 30000;

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
const canExport = computed(() => store.steps.length > 0);
const bandaidAnimationStyle = ref(createBandaidAnimationStyle());

let bandaidAnimationTimer = null;

function createBandaidAnimationStyle() {
  const targetRotation = BANDAID_ROTATIONS[Math.floor(Math.random() * BANDAID_ROTATIONS.length)];

  return {
    '--bandaid-target-rotation': `${targetRotation}deg`,
    '--bandaid-bounce-1': `${targetRotation * -0.1555556}deg`,
    '--bandaid-bounce-2': `${targetRotation * 0.0888889}deg`,
    '--bandaid-bounce-3': `${targetRotation * -0.0444444}deg`,
    '--bandaid-bounce-4': `${targetRotation * 0.0222222}deg`,
  };
}

function refreshBandaidAnimation() {
  bandaidAnimationStyle.value = createBandaidAnimationStyle();
}

onMounted(() => {
  bandaidAnimationTimer = window.setInterval(refreshBandaidAnimation, BANDAID_ANIMATION_MS);
});

onBeforeUnmount(() => {
  if (bandaidAnimationTimer) {
    window.clearInterval(bandaidAnimationTimer);
  }
});
</script>

<template>
  <section class="workspace-header">
    <div class="header-brand">
      <icon-bandaid class="brand-icon" :style="bandaidAnimationStyle" />
      <h1>flASTer Workspace</h1>
    </div>
    <div class="header-script-name" :title="store.currentScriptLabel">
      {{ store.getCurrentScriptDisplayName() }}
    </div>
    <div class="header-actions">
      <file-loader />
      <parse-button />
      <button
        class="header-btn primary icon-btn"
        type="button"
        :disabled="!canExport"
        :title="canExport ? 'Open the generated Node.js export in a modal' : 'Add at least one pipeline step before exporting'"
        aria-label="Open export panel"
        @click="store.exportPanelOpen = true"
      >
        <icon-export class="header-icon" />
      </button>
      <div class="version-chips" aria-label="Tool dependency versions">
        <a
          v-for="dependency in dependencyVersions"
          :key="dependency.label"
          class="version-chip"
          :href="dependency.href"
          target="_blank"
          :title="`Open ${dependency.label} repository`"
        >
          {{ dependency.label }} v{{ dependency.version }}
        </a>
      </div>
      <div class="github-link-wrap" title="View project on GitHub">
        <a
          class="github-link"
          href="https://github.com/ctrl-escp/flaster"
          title="flASTer on GitHub"
          target="_blank"
          aria-label="View project on GitHub"
        >
          <icon-github class="header-icon github-icon" />
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
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.brand-icon {
  width: 2.2rem;
  height: 2.2rem;
  flex: 0 0 auto;
  transform-origin: 50% 50%;
  animation: bandaid-wave 30s infinite;
}

@keyframes bandaid-wave {
  0%,
  6.6667% {
    transform: rotate(0deg);
  }

  13.3333% {
    transform: rotate(var(--bandaid-target-rotation));
  }

  16.6667% {
    transform: rotate(var(--bandaid-target-rotation));
  }

  20% {
    transform: rotate(var(--bandaid-bounce-1));
  }

  23.3333% {
    transform: rotate(var(--bandaid-bounce-2));
  }

  26.6667% {
    transform: rotate(var(--bandaid-bounce-3));
  }

  30% {
    transform: rotate(var(--bandaid-bounce-4));
  }

  33.3333%,
  100% {
    transform: rotate(0deg);
  }
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
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.header-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.github-link-wrap {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}

.github-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 140ms ease, transform 140ms ease;
}

.github-link:hover,
.github-link:focus-visible {
  color: var(--text-primary);
  outline: none;
}

.github-icon {
  width: 2.5rem;
  height: 2.5rem;
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
