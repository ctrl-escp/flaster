<script setup>
import store from './store';
import NavBar from './NavBar.vue';
import CodeAndNodes from './CodeAndNodes.vue';
import ToasterView from './components/ToasterView.vue';
import FilterEditor from './components/FilterEditor.vue';

const bottomPanes = {
  filter: FilterEditor,
  transform: '',
  compose: '',
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
main {
  margin-top: .5rem;
}
.pane-bottom {
  flex: 1;
  display: flex;
}
.panes {
  display: flex;
  flex-direction: column;
  height: calc(95vh - var(--nav-height));
  gap: .2rem;
  width: 100%;
}
</style>
