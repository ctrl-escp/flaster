<script setup>
import {onMounted, ref} from 'vue';

const TOAST_TIMEOUT = 5 * 1000;


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
  setTimeout(props.closeFunc, 250);
}

onMounted(() => {
  isVisible.value = true;
  setTimeout(closeToast, TOAST_TIMEOUT);
});
</script>

<template>
  <transition name="fade">
    <div
      v-if="isVisible"
      class="toast"
      :class="'toast-' + level"
      :style="{'--toast-duration': `${TOAST_TIMEOUT}ms`}"
    >
      <div class="toast-copy">
        <span>{{ props.text }}</span>
      </div>
      <button class="btn toast-close-message" type="button" @click="closeToast">x</button>
      <span class="toast-timer" aria-hidden="true"></span>
    </div>
  </transition>
</template>

<style scoped>
/*noinspection CssUnusedSymbol*/
.fade-enter-active,
.fade-leave-active {
  transition: opacity .25s ease, transform .25s ease;
}
/*noinspection CssUnusedSymbol*/
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.toast {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.55rem 0.75rem 0.7rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
  color: var(--text-primary);
  pointer-events: auto;
  overflow: hidden;
}

.toast-copy {
  flex: 1 1 auto;
  min-width: 0;
  line-height: 1.35;
}

.toast-close-message {
  flex: 0 0 auto;
  color: inherit;
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.7;
  padding: 0;
  line-height: 1;
}

.toast-timer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: var(--toast-timer-color, rgba(255, 255, 255, 0.85));
  transform-origin: right center;
  animation: toast-timer var(--toast-duration) linear forwards;
}

@keyframes toast-timer {
  from {
    transform: scaleX(1);
  }

  to {
    transform: scaleX(0);
  }
}
/*noinspection CssUnusedSymbol*/
.toast-error {
  --toast-timer-color: #ffb3ba;
  background: linear-gradient(135deg, #4a1416 0%, #7a1d22 100%);
}
/*noinspection CssUnusedSymbol*/
.toast-info {
  --toast-timer-color: #a9d1ff;
  background: linear-gradient(135deg, #16243f 0%, #23477c 100%);
}
/*noinspection CssUnusedSymbol*/
.toast-success {
  --toast-timer-color: #b9f0c7;
  background: linear-gradient(135deg, #183922 0%, #245d36 100%);
}
</style>
