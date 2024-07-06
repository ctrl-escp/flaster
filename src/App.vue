<script setup>
import store from './store';
import NavBar from './NavBar.vue';
import CodeAndNodes from './CodeAndNodes.vue';
import FilterEditor from './FilterEditor.vue';
import TransformEditor from './TransformEditor.vue';
import ComposeEditor from './ComposeEditor.vue';
import ToasterView from './components/ToasterView.vue';

const bottomPanes = {
  filter: FilterEditor,
  transform: TransformEditor,
  compose: ComposeEditor,
};

</script>

<template>
  <header>
    <nav-bar/>
  </header>
  <main>
    <div class="panes">
      <code-and-nodes/>
      <div class="pane-bottom">
        <component :is="bottomPanes[store.currentBottomPane]"/>
      </div>
    </div>
  </main>
  <toaster-view/>
</template>

<style scoped>
.pane-bottom {
  flex: 1;
  display: flex;
  max-height: 45vh;
}
.panes {
  display: flex;
  flex-direction: column;
  height: calc(90vh - var(--nav-height));
  gap: .2rem;
  width: 100%;
}
</style>
