<script setup>
import {onMounted, reactive, ref} from 'vue';

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

const state = reactive({
  visible: true,
  startingStyle: {
    display: 'block',
    '@starting-style': 'display: none;',
  },
});

const toasterMessage = ref(null);


function closeToast() {
  state.visible = false;
  toasterMessage.value.remove();
}

onMounted(() => {
  setTimeout(closeToast, 2500);
});

</script>

<template>
  <transition name="fade">
    <div v-if="state.visible" ref="toasterMessage" class="toast" :class="'toast-' + level">
      <button class="btn toast-close-message" @click="closeToast">x</button>
      <span>{{ props.text }}</span>
    </div>
  </transition>
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
