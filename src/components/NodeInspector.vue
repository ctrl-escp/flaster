<script setup>
import {computed} from 'vue';
import store from '../store';
import IconParse from './icons/IconParse.vue';
import IconStructure from './icons/IconStructure.vue';
import IconFilter from './icons/IconFilter.vue';
import IconEye from './icons/IconEye.vue';

const selectedNode = computed(() => store.getSelectedNode());
const overlaps = computed(() => store.getKnownStructureOverlaps());
const nodeMatches = computed(() => store.getNodeMatches(selectedNode.value));
const children = computed(() => store.getNodeChildren(selectedNode.value));
const scopeChain = computed(() => store.getNodeScopeChain(selectedNode.value));
const attributes = computed(() => store.getSelectedNodeAttributes());

const sections = [
  {id: 'overview', label: 'Overview', icon: IconParse},
  {id: 'scope', label: 'Scope', icon: IconStructure},
  {id: 'attributes', label: 'Attributes', icon: IconFilter},
  {id: 'structures', label: 'Structures', icon: IconEye},
];

const overviewRows = computed(() => {
  if (!selectedNode.value) {
    return [];
  }

  const node = selectedNode.value;

  return [
    {label: 'Type', value: node.type},
    {label: 'Selection source', value: store.selectedNodeSource || 'direct'},
    {label: 'Parent', value: node.parentNode?.type ?? 'Root'},
    {label: 'Scope block', value: scopeChain.value[0]?.type ?? 'Program'},
    {label: 'Children', value: String(children.value.length)},
    {label: 'Related structures', value: String(nodeMatches.value.length)},
    {label: 'Overlaps', value: String(overlaps.value.length)},
  ];
});

function jumpToNode(node, source = 'related') {
  store.inspectNode(node, source);
}
</script>

<template>
  <section class="workspace-panel inspector-panel">
    <div class="panel-header">
      <h2>{{ selectedNode ? selectedNode.type : 'Select a match or node' }}</h2>
      <div class="panel-meta">{{ store.selectedNodeSource || 'No selection' }}</div>
    </div>

    <div v-if="selectedNode" class="inspector-switches">
        <button
          v-for="section in sections"
          :key="section.id"
          class="section-btn icon-btn"
          :class="{active: store.activeNodeInspectorSection === section.id}"
          type="button"
          :disabled="store.activeNodeInspectorSection === section.id"
          :title="`Show the ${section.label.toLowerCase()} section for the selected node`"
          :aria-label="`Open ${section.label} section`"
          @click="store.setActiveNodeInspectorSection(section.id)"
        >
          <component :is="section.icon" />
        </button>
    </div>

    <div v-if="selectedNode" class="inspector-content">
      <section v-if="store.activeNodeInspectorSection === 'overview'" class="inspector-card">
        <h3>Overview</h3>
        <p class="source-preview">{{ selectedNode.src || 'No source snippet available.' }}</p>
        <dl class="overview-list">
          <div v-for="row in overviewRows" :key="row.label">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </section>

      <section v-else-if="store.activeNodeInspectorSection === 'scope'" class="inspector-card">
        <h3>Scope and nearby nodes</h3>
        <div class="subsection">
          <h4>Scope chain to the current scope block</h4>
          <div class="stack-list">
            <button
              v-for="node in scopeChain"
              :key="node.nodeId"
              class="list-btn"
              type="button"
              title="Inspect this ancestor node"
              @click="jumpToNode(node, 'related')"
            >
              <strong>{{ node.type }}</strong>
              <span>{{ node.src?.slice(0, 140) }}</span>
            </button>
            <p v-if="!scopeChain.length" class="empty-copy">No scoped ancestors were found for this node.</p>
          </div>
        </div>

        <div class="subsection">
          <h4>Immediate children</h4>
          <div class="stack-list">
            <button
              v-for="node in children"
              :key="node.nodeId"
              class="list-btn"
              type="button"
              title="Inspect this child node"
              @click="jumpToNode(node, 'related')"
            >
              <strong>{{ node.type }}</strong>
              <span>{{ node.src?.slice(0, 140) }}</span>
            </button>
            <p v-if="!children.length" class="empty-copy">This node has no immediate children in the parsed AST list.</p>
          </div>
        </div>
      </section>

      <section v-else-if="store.activeNodeInspectorSection === 'attributes'" class="inspector-card">
        <h3>Attributes</h3>
        <dl class="overview-list">
          <div v-for="entry in attributes" :key="entry.key">
            <dt>{{ entry.key }}</dt>
            <dd>{{ entry.value }}</dd>
          </div>
        </dl>
      </section>

      <section v-else class="inspector-card">
        <h3>Structures and overlaps</h3>
        <div class="subsection">
          <h4>Related structures</h4>
          <div class="stack-list">
            <button
              v-for="match in nodeMatches"
              :key="`${match.structureId}:${match.index}`"
              class="list-btn"
              type="button"
              title="Inspect this related structure match"
              @click="store.setSelectedKnownStructureMatch(match.structureId, match.index)"
            >
              <strong>{{ match.structureTitle }}</strong>
              <span>{{ match.summary }}</span>
            </button>
            <p v-if="!nodeMatches.length" class="empty-copy">No known-structure matches overlap this node.</p>
          </div>
        </div>

        <div class="subsection">
          <h4>Overlapping/conflicting structures</h4>
          <div class="stack-list">
            <button
              v-for="match in overlaps"
              :key="`${match.structureId}:${match.index}`"
              class="list-btn"
              type="button"
              title="Inspect this overlapping structure match"
              @click="store.setSelectedKnownStructureMatch(match.structureId, match.index)"
            >
              <strong>{{ match.structureTitle }}</strong>
              <span>{{ match.summary }}</span>
            </button>
            <p v-if="!overlaps.length" class="empty-copy">No overlapping structure conflicts were found.</p>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="empty-state">
      Select a match, AST node, or related node to inspect its source, scope chain, attributes, and structural overlaps.
    </div>
  </section>
</template>

<style scoped>
.inspector-panel {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  min-height: 0;
  height: 100%;
}

.panel-header,
.inspector-switches {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.panel-meta,
.empty-copy {
  color: var(--text-muted);
}

.inspector-switches {
  justify-content: flex-start;
}

.section-btn {
  border: 1px solid var(--panel-border);
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 9px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.section-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.section-btn.active {
  background: rgba(126, 202, 255, 0.18);
  border-color: rgba(126, 202, 255, 0.42);
  color: #eef8ff;
  box-shadow: inset 0 0 0 1px rgba(126, 202, 255, 0.12);
}

.section-btn.active:disabled {
  opacity: 1;
  cursor: default;
}

.inspector-content {
  min-height: 0;
  overflow: auto;
  padding-right: 0.1rem;
}

.inspector-card {
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  padding: 0.8rem;
  background: var(--panel-card);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.source-preview {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  color: var(--text-primary);
}

.overview-list,
.stack-list,
.subsection {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.overview-list div {
  display: grid;
  grid-template-columns: minmax(7rem, 9rem) minmax(0, 1fr);
  gap: 0.5rem;
  align-items: start;
}

dt {
  color: var(--text-muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

dd {
  word-break: break-word;
  overflow-wrap: anywhere;
}

.list-btn {
  border: 1px solid var(--panel-border);
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.list-btn span {
  color: var(--text-muted);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.empty-state {
  border: 1px dashed var(--panel-border);
  border-radius: 12px;
  padding: 1rem;
  color: var(--text-muted);
}

@media (max-width: 720px) {
  .overview-list div {
    grid-template-columns: 1fr;
  }
}
</style>
