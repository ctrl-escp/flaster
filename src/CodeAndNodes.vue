<script setup>
import NodesList from './components/NodesList.vue';
import InputCodeEditor from './components/InputCodeEditor.vue';
</script>

<template>
  <div class="code-and-nodes">
    <input-code-editor/>
    <nodes-list/>
  </div>
</template>

<style scoped>
.code-and-nodes {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
}
</style>