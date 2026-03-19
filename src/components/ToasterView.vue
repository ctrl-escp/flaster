<script setup>
import store from '../store';
import {onMounted, reactive} from 'vue';
import ToasterMessage from './ToasterMessage.vue';

const toastQueue = reactive({});

const validLevels = ['success', 'info', 'error'];

function logMessage(text, level) {
  if (!validLevels.includes(level)) return logMessage(`Unknown msg level: ${level}.\nMsg: ${text}`, 'error');
  const key = level + text;
  if (!toastQueue[key]) toastQueue[key] = {text, level};
  console.log(`[${level}] ${text}`);
}

function removeMessage(msgKey) {
  delete toastQueue[msgKey];
}

onMounted(() => {
  store.logMessage = logMessage;
});
</script>

<template>
  <div class="toaster">
    <div v-for="(toast, key) in toastQueue" :key="key">
      <toaster-message :text="toast.text" :level="toast.level" :data-key="key" :close-func="() => removeMessage(key)"/>
    </div>
  </div>
</template>

<style scoped>
.toaster {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.65rem;
  width: min(42rem, calc(100vw - 1.5rem));
  z-index: 100;
  pointer-events: none;
}
</style>
