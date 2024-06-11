<script setup>
import {onMounted, ref} from 'vue';
import store from '../store';

const messages = {
  isOriginal: 'Show Transformed Code',
  isTransformed: 'Show Original Code',
};

const codeViewBtn = ref(null);

onMounted(() => {});
</script>

<template>
  <button ref="codeViewBtn" class="btn" @click="store.isShowingTransformedCode = !store.isShowingTransformedCode" :disabled="!store.isTransformed">
    {{ store.isShowingTransformedCode ? messages.isTransformed : messages.isOriginal }}
  </button>
</template>

<style scoped>
</style>
