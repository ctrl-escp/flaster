<!--
  Help reference overlay (F1 / header). v1 moves initial focus to the close button only;
  a full focus trap and inert background are deferred.
-->
<script setup>
import {nextTick, onMounted, ref} from 'vue';
import IconClose from './icons/IconClose.vue';

const emit = defineEmits(['close']);
const closeBtn = ref(null);

const HELP_TABS = [
  {id: 'overview', label: 'What flASTer does'},
  {id: 'workflow', label: 'Workflow'},
  {id: 'shortcuts', label: 'Keyboard shortcuts'},
];

const activeTabIndex = ref(0);

function selectHelpTab(index) {
  activeTabIndex.value = index;
}

function onTablistKeydown(event) {
  const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
  if (!keys.includes(event.key)) {
    return;
  }
  const list = event.currentTarget;
  const tabButtons = [...list.querySelectorAll('[role="tab"]')];
  const fromIndex = tabButtons.indexOf(document.activeElement);
  if (fromIndex < 0) {
    return;
  }
  event.preventDefault();
  const n = tabButtons.length;
  let next = fromIndex;
  if (event.key === 'ArrowRight') {
    next = (fromIndex + 1) % n;
  } else if (event.key === 'ArrowLeft') {
    next = (fromIndex - 1 + n) % n;
  } else if (event.key === 'Home') {
    next = 0;
  } else if (event.key === 'End') {
    next = n - 1;
  }
  activeTabIndex.value = next;
  void nextTick(() => {
    tabButtons[next]?.focus();
  });
}

onMounted(() => {
  void nextTick(() => closeBtn.value?.focus());
});
</script>

<template>
  <div
    class="help-backdrop"
    @click.self="emit('close')"
    @keydown.escape.window="emit('close')"
  >
    <section
      class="help-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <div class="help-header">
        <h2 id="help-title">flASTer — How it works</h2>
        <button
          ref="closeBtn"
          class="close-btn icon-btn"
          type="button"
          aria-label="Close help"
          @click="emit('close')"
        >
          <icon-close />
        </button>
      </div>
      <div class="help-tab-shell">
        <div
          class="help-tablist"
          role="tablist"
          aria-label="Help sections"
          @keydown="onTablistKeydown"
        >
          <button
            v-for="(tab, index) in HELP_TABS"
            :id="`help-tab-${tab.id}`"
            :key="tab.id"
            type="button"
            class="help-tab"
            role="tab"
            :aria-selected="activeTabIndex === index"
            :aria-controls="`help-panel-${tab.id}`"
            :tabindex="activeTabIndex === index ? 0 : -1"
            @click="selectHelpTab(index)"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="help-body">
          <section
            v-show="activeTabIndex === 0"
            :id="`help-panel-${HELP_TABS[0].id}`"
            class="help-panel"
            role="tabpanel"
            :aria-labelledby="`help-tab-${HELP_TABS[0].id}`"
          >
            <dl class="mode-list">
              <div class="mode-row">
                <dt>Code Exploration</dt>
                <dd>
                  Parse any JS file and navigate its AST interactively. The Result Browser lists every node;
                  the Node Inspector shows type, range, and raw properties. The Structure Explorer lets you
                  query patterns across the tree.
                </dd>
              </div>
              <div class="mode-row">
                <dt>Deobfuscation</dt>
                <dd>
                  Write custom structure matches to find obfuscation patterns unique to your target (proxy
                  arrays, string encoders, IIFE wrappers, or anything else), then attach custom transformations
                  that simplify them. Stack matches and transforms into a pipeline, then export it as a Node.js
                  script that runs offline on any file.
                </dd>
              </div>
              <div class="mode-row">
                <dt>
                  Obfuscation
                  <span class="coming-soon">coming soon</span>
                </dt>
                <dd>
                  Apply obfuscating transformers to a clean script for testing or research. The same
                  pipeline/export workflow applies in reverse.
                </dd>
              </div>
              <div class="mode-row">
                <dt>
                  Feature Detection
                  <span class="coming-soon">coming soon</span>
                </dt>
                <dd>
                  Identify behavioral signals — network calls, <code>eval</code> usage, DOM manipulation,
                  anti-debugging guards — directly from the AST without executing the code. Detections will
                  appear as read-only structure matches that can be used to annotate or filter a script.
                </dd>
              </div>
            </dl>
          </section>

          <section
            v-show="activeTabIndex === 1"
            :id="`help-panel-${HELP_TABS[1].id}`"
            class="help-panel"
            role="tabpanel"
            :aria-labelledby="`help-tab-${HELP_TABS[1].id}`"
          >
            <pre class="workflow-line" aria-hidden="true">Load &amp; Parse → Match Structures → Attach Transforms → Iterate → Export</pre>
            <ol class="workflow-steps">
              <li>
                <strong>Load &amp; Parse</strong>
                — Paste code into the editor or use the file loader. Press <strong>Parse</strong> (or
                <code>Ctrl+Enter</code>) to build the AST. The right-hand editor becomes the live code view;
                changes there require a re-parse.
              </li>
              <li>
                <strong>Match Structures</strong>
                — Open the <strong>Structure Explorer</strong> and write a match query. Each saved match gets a
                name (e.g. <code>ProxyVariables</code>) and becomes a reusable handle for the pipeline.
              </li>
              <li>
                <strong>Transform</strong>
                — Attach a transformer to a matched structure in the <strong>Template Workbench</strong> or
                <strong>Transform Editor</strong>. Choose <em>once</em> or <em>loop until exhausted</em>. Run it
                — the code updates in place; the old version is pushed onto the undo stack.
              </li>
              <li>
                <strong>Iterate</strong>
                — Add more matches and transforms for the next obfuscation layer. Use <strong>Undo</strong> to
                roll back any step without losing the others.
              </li>
              <li>
                <strong>Build the Pipeline</strong>
                — Every match + transform pair is a pipeline step visible in the <strong>Pipeline Builder</strong>.
                Reorder, enable, or disable steps without re-running them.
              </li>
              <li>
                <strong>Export</strong>
                — Click <strong>Export</strong> (or open the export panel) to generate a standalone Node.js script.
                The script embeds all structure definitions and transformers — run it locally on any file with
                <code>node script.js target.js</code> without needing the browser.
              </li>
            </ol>
          </section>

          <section
            v-show="activeTabIndex === 2"
            :id="`help-panel-${HELP_TABS[2].id}`"
            class="help-panel"
            role="tabpanel"
            :aria-labelledby="`help-tab-${HELP_TABS[2].id}`"
          >
            <div class="shortcuts-table-wrap">
              <table class="shortcuts-table">
                <thead>
                  <tr>
                    <th scope="col">Key</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row"><kbd>F1</kbd></th>
                    <td>Open / close this help screen</td>
                  </tr>
                  <tr>
                    <th scope="row"><kbd>Ctrl</kbd> + <kbd>Enter</kbd></th>
                    <td>Parse the current input</td>
                  </tr>
                  <tr>
                    <th scope="row"><kbd>Escape</kbd></th>
                    <td>
                      Close this help screen
                      <span class="shortcut-note">(global Escape across overlays is a separate follow-up)</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.help-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(4, 9, 16, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 25;
}

.help-modal {
  width: min(760px, 100%);
  /* Fixed frame so switching tabs does not resize the dialog */
  height: min(680px, 85vh);
  max-height: min(85vh, 800px);
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: var(--panel-surface);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  padding: 1rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  box-sizing: border-box;
}

.help-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0 1rem;
}

.help-header h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  border-radius: 10px;
  border: 1px solid var(--panel-border);
  cursor: pointer;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}

.help-tab-shell {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  border-top: 1px solid var(--panel-border);
}

.help-tablist {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0;
  padding: 0 1rem;
  flex-shrink: 0;
  border-bottom: 1px solid var(--panel-border);
}

.help-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 0.15rem -1px 0;
  padding: 0.7rem 0.85rem 0.65rem;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.84rem;
  font-weight: 500;
  line-height: 1.25;
  cursor: pointer;
  text-align: center;
  box-shadow: none;
  transition:
    color 0.12s ease,
    border-color 0.12s ease;
}

.help-tab::after {
  content: '';
  position: absolute;
  left: 0.35rem;
  right: 0.35rem;
  bottom: 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: transparent;
  transition: background 0.12s ease;
}

.help-tab:hover {
  color: var(--text-primary);
}

.help-tab:hover::after {
  background: rgba(126, 202, 255, 0.28);
}

.help-tab:focus {
  outline: none;
}

.help-tab:focus-visible {
  color: var(--text-primary);
  border-radius: 6px;
  box-shadow: 0 0 0 2px rgba(126, 202, 255, 0.45);
}

.help-tab[aria-selected='true'] {
  color: #eef8ff;
  font-weight: 600;
}

.help-tab[aria-selected='true']::after {
  background: rgba(126, 202, 255, 0.95);
}

.help-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.35rem 1rem 1rem;
  color: var(--text-primary);
  font-size: 0.92rem;
  line-height: 1.55;
}

.help-panel {
  padding-top: 0.15rem;
}

.mode-list {
  margin: 0;
}

.mode-row {
  margin: 0 0 1rem;
}

.mode-row:last-child {
  margin-bottom: 0;
}

.mode-row dt {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.mode-row dd {
  margin: 0;
  color: var(--text-primary);
}

.coming-soon {
  display: inline-block;
  margin-left: 0.35rem;
  padding: 0.08rem 0.4rem;
  font-size: 0.72rem;
  font-weight: 500;
  text-transform: lowercase;
  letter-spacing: 0.02em;
  color: var(--text-muted);
  border: 1px dashed var(--text-muted);
  border-radius: 6px;
  vertical-align: middle;
}

.workflow-line {
  margin: 0 0 0.85rem;
  padding: 0.5rem 0.65rem;
  font-size: 0.78rem;
  line-height: 1.4;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  color: var(--text-muted);
  background: var(--bg-elevated);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  overflow-x: auto;
}

.workflow-steps {
  margin: 0;
  padding-left: 1.25rem;
}

.workflow-steps li {
  margin-bottom: 0.65rem;
}

.workflow-steps li:last-child {
  margin-bottom: 0;
}

.workflow-steps code {
  font-size: 0.86em;
}

.shortcuts-table-wrap {
  overflow-x: auto;
}

.shortcuts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.shortcuts-table th,
.shortcuts-table td {
  padding: 0.45rem 0.6rem;
  text-align: left;
  border-bottom: 1px solid var(--panel-border);
  vertical-align: top;
}

.shortcuts-table thead th {
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.shortcuts-table tbody th[scope='row'] {
  font-weight: 600;
  white-space: nowrap;
  color: var(--text-primary);
}

.shortcuts-table kbd {
  display: inline-block;
  padding: 0.12rem 0.35rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.82em;
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  background: var(--bg-elevated);
}

.shortcut-note {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.82em;
  color: var(--text-muted);
}
</style>
