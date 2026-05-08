import {computed, onBeforeUnmount, ref} from 'vue';
import {clampWorkspaceLeftWidth} from './workspaceLayoutModel.js';

const MIN_LEFT_WIDTH = 288;
const MIN_RIGHT_WIDTH = 288;
const HANDLE_WIDTH = 10;
const MIN_PANEL_RATIO = 1 / 3;
const MAX_PANEL_RATIO = 2 / 3;
const MOBILE_BREAKPOINT = 900;

export function useAppWorkspaceLayout() {
  const workspaceGrid = ref(null);
  const leftWidth = ref(0);

  let activeResize = null;
  const mobileActivePane = ref('left');

  const workspaceGridStyle = computed(() => ({
    '--left-column-width': leftWidth.value > 0 ? `${leftWidth.value}px` : '1fr',
    '--right-column-width': leftWidth.value > 0 ? 'minmax(18rem, 1fr)' : '1fr',
    '--mobile-left-row': mobileActivePane.value === 'left' ? 'minmax(5.5rem, 9fr)' : 'minmax(5.5rem, 1fr)',
    '--mobile-right-row': mobileActivePane.value === 'right' ? 'minmax(5.5rem, 9fr)' : 'minmax(5.5rem, 1fr)',
  }));

  function getAvailableContentWidth() {
    const containerWidth = workspaceGrid.value?.clientWidth ?? 0;
    return containerWidth - HANDLE_WIDTH - 8;
  }

  function clampLeftWidth(width) {
    const contentWidth = getAvailableContentWidth();

    return clampWorkspaceLeftWidth(width, contentWidth, {
      minLeftWidth: MIN_LEFT_WIDTH,
      minRightWidth: MIN_RIGHT_WIDTH,
      minPanelRatio: MIN_PANEL_RATIO,
      maxPanelRatio: MAX_PANEL_RATIO,
    });
  }

  function updateResize(event) {
    if (!activeResize) {
      return;
    }

    const delta = event.clientX - activeResize.startX;
    leftWidth.value = clampLeftWidth(activeResize.startWidth + delta);
  }

  function stopResize() {
    activeResize = null;
    window.removeEventListener('pointermove', updateResize);
    window.removeEventListener('pointerup', stopResize);
  }

  function startResize(side, event) {
    if (window.innerWidth <= 1280) {
      return;
    }

    activeResize = {
      side,
      startX: event.clientX,
      startWidth: leftWidth.value,
    };

    window.addEventListener('pointermove', updateResize);
    window.addEventListener('pointerup', stopResize);
  }

  function setMobileActivePane(pane) {
    if (window.innerWidth > MOBILE_BREAKPOINT) {
      return;
    }

    mobileActivePane.value = pane;
  }

  onBeforeUnmount(() => {
    stopResize();
  });

  return {
    workspaceGrid,
    leftWidth,
    mobileActivePane,
    workspaceGridStyle,
    startResize,
    setMobileActivePane,
  };
}
