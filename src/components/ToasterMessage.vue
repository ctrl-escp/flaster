<script setup>
import {onMounted, ref} from 'vue';

const TOAST_TIMEOUT = 2.5 * 1000;


const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    default: 'info',
  },
  closeFunc: {
    type: Function,
    required: true,
  },
});

const isVisible = ref(false);


function closeToast() {
  isVisible.value = false;
  setTimeout(props.closeFunc, 1000);
}

onMounted(() => {
  isVisible.value = true;
  setTimeout(closeToast, TOAST_TIMEOUT);
});

</script>

<template>
  <transition name="fade">
    <div v-if="isVisible" class="toast" :class="'toast-' + level">
      <button class="btn toast-close-message" @click="closeToast">x</button>
      <span>{{ props.text }}</span>
    </div>
  </transition>
</template>

<style scoped>
/*noinspection CssUnusedSymbol*/
.fade-enter-active, .fade-leave-active {
  transition: opacity .5s ease;
}
/*noinspection CssUnusedSymbol*/
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
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
  margin-top: -8px;
  background-color: transparent;
  border: none;
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
