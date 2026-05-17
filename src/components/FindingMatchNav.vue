<script setup>
import IconArrowLeft from './icons/IconArrowLeft.vue';
import IconArrowRight from './icons/IconArrowRight.vue';

defineProps({
  active: {
    type: Boolean,
    default: false,
  },
  position: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(['prev', 'next']);
</script>

<template>
  <div
    v-if="total > 0"
    class="finding-match-nav"
    :class="{active}"
  >
    <button
      class="finding-nav-btn"
      type="button"
      title="Jump to the previous match in the editor"
      aria-label="Previous match"
      @click="emit('prev')"
    >
      <icon-arrow-left />
      <span>Prev</span>
    </button>
    <div class="finding-match-status" aria-live="polite">
      <strong>{{ position }}</strong>
      <span>/</span>
      <span>{{ total }}</span>
    </div>
    <button
      class="finding-nav-btn"
      type="button"
      title="Jump to the next match in the editor"
      aria-label="Next match"
      @click="emit('next')"
    >
      <span>Next</span>
      <icon-arrow-right />
    </button>
  </div>
</template>

<style scoped>
.finding-match-nav {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.1rem 0.25rem;
  margin-left: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.18);
  flex-shrink: 0;
}

.finding-match-nav.active {
  border-color: rgba(126, 202, 255, 0.28);
  background: rgba(126, 202, 255, 0.08);
}

.finding-nav-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.65rem;
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-muted);
  cursor: pointer;
}

.finding-nav-btn svg {
  width: 0.72rem;
  height: 0.72rem;
}

.finding-nav-btn:hover,
.finding-nav-btn:focus-visible {
  color: #d7f0ff;
  border-color: rgba(126, 202, 255, 0.28);
  outline: none;
}

.finding-match-status {
  display: inline-flex;
  align-items: baseline;
  gap: 0.2rem;
  font-size: 0.65rem;
  color: var(--text-muted);
}

.finding-match-status strong {
  color: #d7f0ff;
  font-weight: 600;
}
</style>
