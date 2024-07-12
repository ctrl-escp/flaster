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
  justify-content: center;
  position: fixed;
  bottom: .5rem;
}
</style>
