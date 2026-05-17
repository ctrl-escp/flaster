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
  {id: 'console', label: 'Continue in the Console'},
  {id: 'persistence', label: 'Saved workspace'},
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
                  that simplify them. Stack matches and transforms into a pipeline, then automate it as an <code>.mjs</code>
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
                  pipeline/automate workflow applies in reverse.
                </dd>
              </div>
              <div class="mode-row">
                <dt>
                  Feature Detection
                  <span class="coming-soon">coming soon</span>
                </dt>
                <dd>
                  <strong>API Surface</strong> finds browser and runtime API usage; <strong>Capabilities</strong>
                  infer higher-level patterns (fingerprinting, anti-debugging, tracking) from those hits —
                  all from the AST without executing the code. Open the <strong>API Surface</strong> tab after
                  parse; detector hits also appear as known structures in Code Structures.
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
            <pre class="workflow-line" aria-hidden="true">Load &amp; Parse → Match Structures → Attach Transforms → Iterate → Automate</pre>
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
                <strong>Automate</strong>
                — Review the generated script, then copy or download it as an <code>.mjs</code> file.
                The script embeds all structure definitions and transformers and can be run locally using Node.js, Deno, Bun, or any compatible runtime.
              </li>
            </ol>
          </section>

          <section
            v-show="activeTabIndex === 2"
            :id="`help-panel-${HELP_TABS[2].id}`"
            class="help-panel help-console-panel"
            role="tabpanel"
            :aria-labelledby="`help-tab-${HELP_TABS[2].id}`"
          >
            <p class="console-help-lead">
              Open the <strong>Console</strong> to continue working with the same flAST tree and script as the UI.
              The following names are attached to <code>window</code> for that workflow:
            </p>

            <dl class="console-help-dl">
              <div class="console-help-row">
                <dt><code>flast</code></dt>
                <dd>
                  The flAST library namespace loaded from the package, plus a <code>version</code> string and
                  <code>applyArboristToUI(arborist)</code> (see below). Highlights include
                  <code>Arborist</code>
                  (parse a script into a flat <code>ast</code>, queue edits with
                  <code>markNode</code>, <code>replaceNode</code>, or <code>deleteNode</code>, then
                  <code>applyChanges()</code> to regenerate <code>script</code> and <code>ast</code>),
                  <code>generateRootNode</code>,
                  <code>generateFlatAST</code>,
                  <code>generateCode</code>,
                  <code>parseCode</code>,
                  <code>extractNodesFromRoot</code>,
                  <code>mapIdentifierRelations</code>,
                  <code>applyIteratively</code>, and
                  <code>logger</code>.
                </dd>
              </div>
              <div class="console-help-row">
                <dt><code>flast.applyArboristToUI(arborist)</code></dt>
                <dd>
                  After you change the live <code>arborist</code> in the console (mark nodes, apply changes, or swap
                  in your own <code>Arborist</code> instance), call this async function to push that state into the
                  workspace: the input editor text, the Result Browser / filters, known-structure matching, and
                  parse/selection bookkeeping all catch up with your arborist.
                </dd>
              </div>
              <div class="console-help-row">
                <dt><code>arborist</code></dt>
                <dd>
                  The current workspace arborist (same object as the UI). Use it to inspect
                  <code>script</code> and <code>ast</code>, call <code>markNode</code> / <code>applyChanges</code>, or
                  run catalog matchers against it, then sync with
                  <code>await flast.applyArboristToUI(arborist)</code>.
                </dd>
              </div>
              <div class="console-help-row">
                <dt><code>selectedNode</code></dt>
                <dd>
                  The AST node currently resolved from the UI selection (or <code>null</code>). Handy when you want
                  the same node reference while exploring parents, scope, or matches in the console.
                </dd>
              </div>
              <div class="console-help-row">
                <dt><code>catalog</code></dt>
                <dd>
                  Matchers and transforms for the <strong>current</strong> workspace: <code>structures</code> (every
                  descriptor, including user-defined ones), <code>structure(id)</code>,
                  <code>matchersById</code> / <code>transformsById</code>, and
                  <code>runMatcher</code> / <code>runTransform</code> / <code>runTransformSession</code> keyed by
                  structure id. Built-in REstringer-backed entries are one part of that surface; use
                  <code>catalog.restringer</code> for the frozen integration bundle (utilities, registry metadata,
                  <code>listBuiltInStructures</code>, and the same runner helpers the adapter exports).
                </dd>
              </div>
            </dl>
          </section>

          <section
            v-show="activeTabIndex === 3"
            :id="`help-panel-${HELP_TABS[3].id}`"
            class="help-panel"
            role="tabpanel"
            :aria-labelledby="`help-tab-${HELP_TABS[3].id}`"
          >
            <dl class="mode-list">
              <div class="mode-row">
                <dt>Automatic restore point</dt>
                <dd>
                  flASTer saves one local workspace snapshot in this browser as you work. It includes the
                  current script, editor text and cursor position, pipeline steps, filters, transform code,
                  undo history, selected structures, and user-defined structures.
                </dd>
              </div>
              <div class="mode-row">
                <dt>Private to this browser</dt>
                <dd>
                  Saved workspace data stays in your browser storage. It is used only to recover your
                  session after a reload, crash, or accidental close, and it is not part of generated
                  automation scripts.
                </dd>
              </div>
              <div class="mode-row">
                <dt>Clearing saved data</dt>
                <dd>
                  Use <strong>Clear saved data</strong> in the header to delete the saved workspace,
                  pipeline, undo history, and custom structures from this browser. The app reloads after
                  the data is cleared.
                </dd>
              </div>
            </dl>
          </section>

          <section
            v-show="activeTabIndex === 4"
            :id="`help-panel-${HELP_TABS[4].id}`"
            class="help-panel"
            role="tabpanel"
            :aria-labelledby="`help-tab-${HELP_TABS[4].id}`"
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
                    <th scope="row">
                      <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>[</kbd>
                      <span class="shortcut-note">(<kbd>Cmd</kbd> + <kbd>Option</kbd> + <kbd>[</kbd> on macOS)</span>
                    </th>
                    <td>Collapse the current editor block</td>
                  </tr>
                  <tr>
                    <th scope="row">
                      <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>]</kbd>
                      <span class="shortcut-note">(<kbd>Cmd</kbd> + <kbd>Option</kbd> + <kbd>]</kbd> on macOS)</span>
                    </th>
                    <td>Expand the current editor block</td>
                  </tr>
                  <tr>
                    <th scope="row">
                      <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>[</kbd>
                      <span class="shortcut-note">
                        (<kbd>Cmd</kbd> + <kbd>Option</kbd> + <kbd>Shift</kbd> + <kbd>[</kbd> on macOS)
                      </span>
                    </th>
                    <td>Collapse the current editor block recursively</td>
                  </tr>
                  <tr>
                    <th scope="row">
                      <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>]</kbd>
                      <span class="shortcut-note">
                        (<kbd>Cmd</kbd> + <kbd>Option</kbd> + <kbd>Shift</kbd> + <kbd>]</kbd> on macOS)
                      </span>
                    </th>
                    <td>Expand the current editor block recursively</td>
                  </tr>
                  <tr>
                    <th scope="row"><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>[</kbd></th>
                    <td>Collapse all editor blocks</td>
                  </tr>
                  <tr>
                    <th scope="row"><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>]</kbd></th>
                    <td>Expand all editor blocks</td>
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

.console-help-lead {
  margin: 0 0 0.85rem;
  color: var(--text-primary);
}

.help-console-panel .console-help-dl {
  margin: 0;
}

.console-help-row {
  margin: 0 0 0.85rem;
}

.console-help-row:last-child {
  margin-bottom: 0;
}

.console-help-row dt {
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.console-help-row dt code {
  font-size: 0.86em;
}

.console-help-row dd {
  margin: 0;
  color: var(--text-primary);
}

.console-help-row dd code {
  font-size: 0.86em;
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
