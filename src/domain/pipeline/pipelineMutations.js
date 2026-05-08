/**
 * Pure pipeline list mutations. Callers replace `store.steps` with the returned array.
 */

/**
 * @param {readonly object[]} steps
 * @param {object} step
 * @returns {object[]}
 */
export function addStep(steps, step) {
  const base = Array.isArray(steps) ? steps : [];
  return [...base, step];
}

/**
 * @param {readonly object[]} steps
 * @param {string} stepId
 * @returns {object[]}
 */
export function removeStep(steps, stepId) {
  const base = Array.isArray(steps) ? steps : [];
  return base.filter((s) => s?.id !== stepId);
}

/**
 * @param {readonly object[]} steps
 * @param {string} stepId
 * @param {-1 | 1} direction
 * @returns {object[]}
 */
export function moveStep(steps, stepId, direction) {
  if (!Array.isArray(steps)) {
    return [];
  }

  const index = steps.findIndex((s) => s?.id === stepId);
  const nextIndex = index + direction;

  if (index < 0 || nextIndex < 0 || nextIndex >= steps.length) {
    return steps;
  }

  const base = [...steps];
  [base[index], base[nextIndex]] = [base[nextIndex], base[index]];
  return renumberSequenceIndices(base);
}

/**
 * @param {readonly object[]} steps
 * @param {number} index
 * @param {-1 | 1} direction
 * @returns {object[]}
 */
export function moveStepAtIndex(steps, index, direction) {
  if (!Array.isArray(steps)) {
    return [];
  }

  const nextIndex = index + direction;

  if (index < 0 || nextIndex < 0 || index >= steps.length || nextIndex >= steps.length) {
    return steps;
  }

  const base = [...steps];
  [base[index], base[nextIndex]] = [base[nextIndex], base[index]];
  return renumberSequenceIndices(base);
}

/**
 * @param {readonly object[]} steps
 * @param {string} stepId
 * @param {boolean} enabled
 * @returns {object[]}
 */
export function setStepEnabled(steps, stepId, enabled) {
  const base = Array.isArray(steps) ? steps : [];
  return base.map((s) => (s?.id === stepId ? {...s, enabled} : s));
}

/**
 * @param {readonly object[]} steps
 * @param {number} index
 * @param {boolean} enabled
 * @returns {object[]}
 */
export function setStepEnabledAtIndex(steps, index, enabled) {
  if (!Array.isArray(steps)) {
    return [];
  }

  if (index < 0 || index >= steps.length) {
    return steps;
  }

  return steps.map((s, i) => (i === index ? {...s, enabled} : s));
}

/**
 * @param {object[]} steps
 * @returns {object[]}
 */
export function renumberSequenceIndices(steps) {
  return steps.map((step, sequenceIndex) => ({
    ...step,
    sequenceIndex: sequenceIndex + 1,
  }));
}
