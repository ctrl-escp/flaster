/**
 * Shared predicates for pipeline steps (import planning + emission).
 */

export function isStructureSelectionStep(step) {
  return step?.templateType === 'delete-structure-matches' ||
    step?.templateType === 'isolate-structure-matches';
}

export function isNoTransformStep(step) {
  return step?.templateType === 'no-transform';
}

export function stepNeedsKnownStructureRuntime(step) {
  return step?.kind === 'known-structure-transform' || isStructureSelectionStep(step);
}

export function getCustomStepRunMode(step) {
  const runMode = step?.runMode ?? step?.params?.runMode ?? 'until-stable';
  return ['once', 'count', 'until-stable'].includes(runMode) ? runMode : 'until-stable';
}

export function getCustomStepMaxIterations(step) {
  const runMode = getCustomStepRunMode(step);
  const requestedValue = Number.parseInt(step?.maxIterations ?? step?.params?.maxIterations ?? 1, 10);

  if (runMode === 'once') {
    return 1;
  }

  if (runMode === 'count') {
    return Math.max(1, Number.isFinite(requestedValue) ? requestedValue : 1);
  }

  return 1;
}
