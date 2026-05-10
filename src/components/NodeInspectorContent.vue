<script setup>
import {computed} from 'vue';
import store from '../store';
import {createNodeAttributeEntries} from '../domain/selection/nodeInspectorModel.js';
import {buildNodeInspectorOverviewRows} from '../ui/composables/nodeInspectorModel.js';
import IconParse from './icons/IconParse.vue';
import IconStructure from './icons/IconStructure.vue';
import IconFilter from './icons/IconFilter.vue';
import IconEye from './icons/IconEye.vue';

const props = defineProps({
  node: {type: Object, required: true},
  /** Mirrors `store.selectedNodeSource` for overview rows */
  sourceLabel: {type: String, default: null},
  /** When the row is a known-structure match, pass it so overlaps exclude this structure */
  structureMatch: {type: Object, default: null},
  /** When true, omit outer scroll (parent handles overflow) */
  embed: {type: Boolean, default: false},
});

const sections = [
  {id: 'overview', label: 'Overview', icon: IconParse},
  {id: 'scope', label: 'Scope', icon: IconStructure},
  {id: 'attributes', label: 'Attributes', icon: IconFilter},
  {id: 'structures', label: 'Structures', icon: IconEye},
];

const overlapProbe = computed(() => {
  if (props.structureMatch) {
    return props.structureMatch;
  }

  if (props.node?.range) {
    return {structureId: null, relevantNode: props.node};
  }

  return null;
});

const overlaps = computed(() => {
  if (!overlapProbe.value) {
    return [];
  }

  return store.getKnownStructureOverlaps(overlapProbe.value);
});

const nodeMatches = computed(() => store.getNodeMatches(props.node));
const children = computed(() => store.getNodeChildren(props.node));
const scopeChain = computed(() => store.getNodeScopeChain(props.node));
const attributes = computed(() => createNodeAttributeEntries(props.node));

const overviewRows = computed(() =>
  buildNodeInspectorOverviewRows({
    node: props.node,
    selectedNodeSource: props.sourceLabel,
    scopeBlockType: scopeChain.value[0]?.type,
    childCount: children.value.length,
    nodeMatchCount: nodeMatches.value.length,
    overlapCount: overlaps.value.length,
  }),
);

function jumpToNode(node, source = 'related') {
  store.inspectNode(node, source);
}
</script>

<template>
  <div class="node-inspector-content" :class="{embed}">
    <div class="inspector-switches">
      <button
        v-for="section in sections"
        :key="section.id"
        class="section-btn icon-btn"
        :class="{active: store.activeNodeInspectorSection === section.id}"
        type="button"
        :disabled="store.activeNodeInspectorSection === section.id"
        :title="`Show the ${section.label.toLowerCase()} section for this node`"
        :aria-label="`Open ${section.label} section`"
        @click="store.setActiveNodeInspectorSection(section.id)"
      >
        <component :is="section.icon" />
      </button>
    </div>

    <div class="inspector-inner">
      <section v-if="store.activeNodeInspectorSection === 'overview'" class="inspector-card">
        <h3>Overview</h3>
        <p class="source-preview">{{ node.src || 'No source snippet available.' }}</p>
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
              v-for="n in scopeChain"
              :key="n.nodeId"
              class="list-btn"
              type="button"
              title="Inspect this ancestor node"
              @click="jumpToNode(n, 'related')"
            >
              <strong>{{ n.type }}</strong>
              <span>{{ n.src?.slice(0, 140) }}</span>
            </button>
            <p v-if="!scopeChain.length" class="empty-copy">No scoped ancestors were found for this node.</p>
          </div>
        </div>

        <div class="subsection">
          <h4>Immediate children</h4>
          <div class="stack-list">
            <button
              v-for="n in children"
              :key="n.nodeId"
              class="list-btn"
              type="button"
              title="Inspect this child node"
              @click="jumpToNode(n, 'related')"
            >
              <strong>{{ n.type }}</strong>
              <span>{{ n.src?.slice(0, 140) }}</span>
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
              :key="`${match.structureId}:${match.metadata.matchOrdinal}`"
              class="list-btn"
              type="button"
              title="Inspect this related structure match"
              @click="store.setSelectedKnownStructureMatch(match.structureId, match.metadata.matchOrdinal)"
            >
              <strong>{{ store.getKnownStructureById(match.structureId)?.title ?? match.structureId }}</strong>
              <span>{{ match.label }}</span>
            </button>
            <p v-if="!nodeMatches.length" class="empty-copy">No known-structure matches overlap this node.</p>
          </div>
        </div>

        <div class="subsection">
          <h4>Overlapping/conflicting structures</h4>
          <div class="stack-list">
            <button
              v-for="match in overlaps"
              :key="`${match.structureId}:${match.metadata.matchOrdinal}`"
              class="list-btn"
              type="button"
              title="Inspect this overlapping structure match"
              @click="store.setSelectedKnownStructureMatch(match.structureId, match.metadata.matchOrdinal)"
            >
              <strong>{{ store.getKnownStructureById(match.structureId)?.title ?? match.structureId }}</strong>
              <span>{{ match.label }}</span>
            </button>
            <p v-if="!overlaps.length" class="empty-copy">No overlapping structure conflicts were found.</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.node-inspector-content {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-height: 0;
}

.node-inspector-content.embed {
  height: 17.5rem;
  min-height: 17.5rem;
  max-height: 17.5rem;
}

.node-inspector-content.embed .inspector-inner {
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
  padding-right: 0.1rem;
}

.inspector-switches {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.45rem;
  flex-wrap: wrap;
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

.inspector-inner {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-height: 0;
}

.inspector-card {
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.inspector-card h3 {
  margin: 0;
  font-size: 0.95rem;
}

.source-preview {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-size: 0.88rem;
}

.overview-list,
.stack-list,
.subsection {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.subsection h4 {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-muted);
  font-weight: 600;
}

.overview-list div {
  display: grid;
  grid-template-columns: minmax(7rem, 9rem) minmax(0, 1fr);
  gap: 0.45rem;
  align-items: start;
}

dt {
  color: var(--text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

dd {
  margin: 0;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.list-btn {
  border: 1px solid var(--panel-border);
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  padding: 0.5rem 0.65rem;
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.list-btn span {
  color: var(--text-muted);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.empty-copy {
  color: var(--text-muted);
  margin: 0;
  font-size: 0.85rem;
}

@media (max-width: 720px) {
  .overview-list div {
    grid-template-columns: 1fr;
  }
}
</style>
