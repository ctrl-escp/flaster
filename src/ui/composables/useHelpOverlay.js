import {onBeforeUnmount, onMounted, ref} from 'vue';
import {isHelpToggleEvent, nextHelpOpenState} from './helpOverlayModel.js';

export function useHelpOverlay() {
  const helpOpen = ref(false);

  function open() {
    helpOpen.value = nextHelpOpenState(helpOpen.value, 'open');
  }

  function close() {
    helpOpen.value = nextHelpOpenState(helpOpen.value, 'close');
  }

  function toggle() {
    helpOpen.value = nextHelpOpenState(helpOpen.value, 'toggle');
  }

  function handleKeydown(event) {
    if (isHelpToggleEvent(event)) {
      event.preventDefault();
      toggle();
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown));
  onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));

  return {helpOpen, open, close, toggle};
}
