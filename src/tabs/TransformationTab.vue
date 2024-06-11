<script setup>
import FilterEditor from '../components/FilterEditor.vue';
import NodesList from '../components/NodesList.vue';
import InputCodeEditor from '../components/InputCodeEditor.vue';
import FileLoader from '../components/FileLoader.vue';
import ParseButton from '../components/ParseButton.vue';
import CodeViewSwitch from '../components/CodeViewSwitch.vue';

const topButtons = [
  FileLoader,
  ParseButton,
  CodeViewSwitch,
];

</script>

<template>
  <div class="top-buttons">
    <span v-for="item of topButtons" :key="item" class="top-btn">
      <component :is="item"></component>
    </span>
  </div>
  <div class="panes">
    <div class="pane-top">
      <input-code-editor/>
      <nodes-list/>
    </div>
    <div class="pane-bottom">
      <filter-editor/>
    </div>
  </div>
</template>

<style scoped>
.top-btn {
  margin: 0 5px;
}

.top-buttons {
  display: flex;
  flex-direction: row;
}

.pane-bottom {
  flex: 1;
  display: flex;
}

.pane-top {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
}

.panes {
  display: flex;
  flex-direction: column;
  height: calc(95vh - var(--nav-height));
  gap: .2rem;
  width: 100%;
}
</style>