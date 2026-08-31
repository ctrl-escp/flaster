<script setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import flastPackage from 'flast/package.json' with {type: 'json'};
import restringerPackage from 'restringer/package.json' with {type: 'json'};
import store from '../store';
import FileLoader from './FileLoader.vue';
import ParseButton from './ParseButton.vue';
import IconBandaid from './icons/IconBandaid.vue';
import IconBeautify from './icons/IconBeautify.vue';
import IconGithub from './icons/IconGithub.vue';
import IconReset from './icons/IconReset.vue';
import IconTrash from './icons/IconTrash.vue';

const emit = defineEmits(['open-help']);

const BANDAID_ROTATIONS = [90, 180, 270];
const BANDAID_ANIMATION_MS = 30000;

const dependencyVersions = computed(() => ([
  {
    label: 'flAST',
    version: flastPackage.version,
    href: 'https://github.com/ctrl-escp/flast',
  },
  {
    label: 'REstringer',
    version: restringerPackage.version,
    href: 'https://github.com/ctrl-escp/restringer',
  },
]));
const canUndo = computed(() => store.states.length > 0);
const canBeautify = computed(() => {
  void store.inputContentVersion;
  return store.canBeautifyInput();
});
const beautifyTitle = computed(() => {
  void store.inputContentVersion;
  if (!store.hasParsableInput()) {
    return 'Add or load a script before beautifying';
  }

  if (!store.canBeautifyInput()) {
    return 'Script matches the last beautified output; edit the code to enable beautify again';
  }

  return 'Reformat the script using flAST parse and generate (once)';
});
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
      <h1>flASTer</h1>
    </div>
    <div class="header-actions">
      <div class="header-actions-leading">
        <file-loader />
        <parse-button />
        <button
          class="header-btn header-btn-secondary header-btn-text"
          type="button"
          :disabled="!canBeautify"
          :title="beautifyTitle"
          aria-label="Beautify script"
          @click="void store.beautifyInputScript()"
        >
          <icon-beautify class="header-icon" />
          <span>Beautify</span>
        </button>
        <button
          class="header-btn header-btn-secondary header-btn-text"
          type="button"
          :disabled="!canUndo"
          :title="canUndo ? 'Undo the last applied transformation. Click again to keep rolling back changes.' : 'There are no applied changes to undo'"
          aria-label="Undo last transformation"
          @click="void store.revertState()"
        >
          <icon-reset class="header-icon" />
          <span>Undo</span>
        </button>
      </div>
      <div class="header-script-name" :title="store.currentScriptLabel">
        {{ store.getCurrentScriptDisplayName() }}
      </div>
      <div class="header-actions-trailing">
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
        <button
          class="header-btn header-btn-secondary header-btn-text header-btn-danger"
          type="button"
          title="Delete all saved workspace data from this browser"
          aria-label="Clear saved workspace data"
          @click="void store.clearAllStorage()"
        >
          <icon-trash class="header-icon" />
          <span>Clear saved data</span>
        </button>
        <button
          class="header-btn icon-btn"
          type="button"
          title="Open help (F1)"
          aria-label="Open help"
          @click="emit('open-help')"
        >
          <span class="header-help-mark" aria-hidden="true">?</span>
        </button>
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

.header-actions-leading,
.header-actions-trailing {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 0.6rem;
}

.header-actions-trailing {
  gap: 0.5rem;
}

.header-script-name {
  flex: 1 1 0;
  min-width: 0;
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
  justify-content: flex-end;
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
}

.version-chip {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 10rem;
  padding: 0.5rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  font-size: 0.82rem;
  letter-spacing: 0.01em;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  position: relative;
  z-index: 1;
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

/* Help control: typographic ? in a fixed-size .icon-btn box — center on both axes */
.header-btn.icon-btn {
  justify-content: center;
}

.header-btn-secondary {
  background: rgba(255, 255, 255, 0.04);
}

.header-btn-text {
  gap: 0.45rem;
  padding: 0.5rem 0.8rem;
}

.header-btn-danger:hover:not(:disabled),
.header-btn-danger:focus-visible:not(:disabled) {
  border-color: #f87171;
  color: #f87171;
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

.header-help-mark {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
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

@media (max-width: 1100px) {
  .header-btn-text span {
    display: none;
  }

  .header-btn-text {
    padding: 0.5rem;
  }
}

@media (max-width: 980px) {
  .workspace-header {
    gap: 0.55rem;
  }

  .header-brand {
    gap: 0.35rem;
  }

  h1 {
    font-size: 1.05rem;
  }

  .header-script-name {
    font-size: 0.92rem;
  }

  .header-actions {
    gap: 0.4rem;
  }

  .header-actions-leading,
  .header-actions-trailing {
    gap: 0.4rem;
  }

  .header-actions-trailing {
    gap: 0.35rem;
  }

  .version-chips {
    gap: 0.35rem;
  }

  .version-chip {
    max-width: 8rem;
    padding: 0.5rem 0.5rem;
    font-size: 0.75rem;
  }

  .github-icon {
    width: 2.1rem;
    height: 2.1rem;
  }
}

@media (max-width: 700px) {
  .version-chips {
    display: none;
  }
}
</style>
