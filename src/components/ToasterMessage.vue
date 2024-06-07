<script setup>
import {onMounted, ref} from 'vue';

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    default: 'info',
  },
});

const messages = {};

const levels = [
  'success',
  'info',
  'error'
];

const toasterMessage = ref(null);

function closeToast() {
  toasterMessage.value.remove();
}

onMounted(() => {});

</script>

<template>
  <div ref="toasterMessage" class="toast" :class="'toast-' + level">
    <button class="toast-close-message" @click="closeToast">x</button>
    <div>{{ text }}</div>
  </div>
</template>

<style scoped>
.toast {
  padding: 10px;
  margin: 5px;
  color: black;
  font-size: larger;
  text-align: center;
  width: fit-content;
  height: fit-content;
  border-radius: 8px;
  z-index: 10;
  min-width: 350px;
  max-width: 500px;
  min-height: 30px;
  max-height: 80px;
  text-overflow: ellipsis;
  overflow: hidden;
}

.toast-close-message {
  float: right;
  font-size: larger;
  margin-top: -8px;
  background-color: transparent;
  border: none;
}

.toast-close-message:active {
  transform: translate(1px, 2px);
}

/*noinspection CssUnusedSymbol*/
.toast-error {
  background-color: red;
}

/*noinspection CssUnusedSymbol*/
.toast-info {
  background-color: yellow;
}

/*noinspection CssUnusedSymbol*/
.toast-success {
  background-color: greenyellow;
}
</style>
