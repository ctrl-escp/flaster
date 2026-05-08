/**
 * Pipeline step model: stable identity, catalog names, and helpers for UI replay.
 *
 * @typedef {'known-structure' | 'custom-transform' | 'template' | 'manual'} PipelineStepType
 */

/**
 * @param {object} step
 * @returns {string | null}
 */
export function getPipelineStepStructureId(step) {
  if (!step || typeof step !== 'object') {
    return null;
  }

  return step.selectionSource?.kind === 'known-structure'
    ? step.selectionSource.structureId
    : step.params?.structureId ?? step.structureId ?? null;
}

/**
 * Catalog/runtime structure name (structure id string in flASTer).
 *
 * @param {object} step
 * @returns {string | null}
 */
function getPipelineStepStructureName(step) {
  return getPipelineStepStructureId(step);
}

/**
 * @param {object} step
 * @returns {string | null}
 */
function getPipelineStepTransformName(step) {
  if (!step || typeof step !== 'object') {
    return null;
  }

  if (typeof step.transformName === 'string' && step.transformName.length) {
    return step.transformName;
  }

  const fromParams = step.params?.transformName;
  return typeof fromParams === 'string' && fromParams.length ? fromParams : null;
}

/**
 * @param {object} step
 * @returns {PipelineStepType}
 */
function inferPipelineStepType(step) {
  if (!step || typeof step !== 'object') {
    return 'manual';
  }

  if (step.kind === 'known-structure-transform') {
    return 'known-structure';
  }

  const templateType = step.templateType ?? '';

  if (templateType === 'apply-known-transform') {
    return 'known-structure';
  }

  if (templateType === 'advanced-js-step' && typeof step.transformationCode === 'string' &&
      step.transformationCode.trim().length) {
    return 'custom-transform';
  }

  if (
    templateType === 'delete-structure-matches' ||
    templateType === 'isolate-structure-matches' ||
    templateType === 'no-transform'
  ) {
    return 'template';
  }

  if (step.kind === 'custom' && typeof step.transformationCode === 'string' &&
      step.transformationCode.trim().length) {
    return 'custom-transform';
  }

  return 'manual';
}

/**
 * @param {string} [id]
 * @param {string} [now]
 * @returns {string}
 */
function defaultStepId(id, now) {
  if (typeof id === 'string' && id.length) {
    return id;
  }

  const g = typeof globalThis !== 'undefined' ? globalThis : undefined;
  if (g?.crypto?.randomUUID) {
    return g.crypto.randomUUID();
  }

  return `step-${now}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Ensures id, createdAt, and canonical type fields exist (immutable).
 *
 * @param {object} step
 * @param {{ now?: string, id?: string }} [options]
 * @returns {object}
 */
export function finalizePipelineStepForStorage(step, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const id = typeof step.id === 'string' && step.id.length
    ? step.id
    : defaultStepId(options.id, now);
  const createdAt = typeof step.createdAt === 'string' && step.createdAt.length ? step.createdAt : now;
  const type = step.type ?? inferPipelineStepType(step);
  const structureName = step.structureName ?? getPipelineStepStructureName(step);
  const transformName = step.transformName ?? getPipelineStepTransformName(step);

  return {
    ...step,
    id,
    createdAt,
    type,
    structureName,
    transformName,
  };
}

/**
 * Deterministic factory for tests (`now` / `id` override unstable fields).
 *
 * @param {object} partial
 * @param {{ now?: string, id?: string }} [options]
 * @returns {object}
 */
export function createStep(partial = {}, options = {}) {
  return finalizePipelineStepForStorage(normalizePipelineStepEntry(partial), options);
}

/**
 * Same normalization rules as the reactive store historically used.
 *
 * @param {object} [stepEntry={}]
 * @returns {object}
 */
export function normalizePipelineStepEntry(stepEntry = {}) {
  const nextLabel = stepEntry.label ||
    (stepEntry.kind === 'known-structure-transform'
      ? `Apply ${stepEntry.structureTitle ?? stepEntry.structureId}`
      : 'Custom JS transform');
  const nextParams = stepEntry.params ?? {};
  const nextRunMode = stepEntry.runMode ?? nextParams.runMode ?? 'once';
  const nextMaxIterations = Number.isInteger(stepEntry.maxIterations)
    ? stepEntry.maxIterations
    : Number.isInteger(nextParams.maxIterations)
      ? nextParams.maxIterations
      : 1;

  return {
    enabled: stepEntry.enabled ?? true,
    label: nextLabel,
    templateType: stepEntry.templateType ?? (stepEntry.kind === 'known-structure-transform'
      ? 'apply-known-transform'
      : 'advanced-js-step'),
    params: {
      ...nextParams,
      runMode: nextRunMode,
      maxIterations: nextMaxIterations,
    },
    previewSummary: stepEntry.previewSummary ?? '',
    selectionSource: stepEntry.selectionSource ?? null,
    runMode: nextRunMode,
    maxIterations: nextMaxIterations,
    ...stepEntry,
  };
}

/**
 * @param {readonly object[]} steps
 * @param {string} structureId
 * @returns {boolean}
 */
export function pipelineStepsReferenceStructureId(steps, structureId) {
  if (!structureId || !Array.isArray(steps)) {
    return false;
  }

  return steps.some((step) => getPipelineStepStructureId(step) === structureId);
}

/**
 * @param {readonly object[]} steps
 * @param {string} transformationCode
 * @returns {boolean}
 */
function pipelineStepsReferenceTransformationCode(steps, transformationCode) {
  const needle = typeof transformationCode === 'string' ? transformationCode.trim() : '';
  if (!needle.length || !Array.isArray(steps)) {
    return false;
  }

  return steps.some((step) => {
    const body = typeof step?.transformationCode === 'string' ? step.transformationCode.trim() : '';
    return body.length > 0 && body === needle;
  });
}

/**
 * User-facing copy when a catalog definition change invalidates the current script
 * relative to the pipeline baseline (replay uses latest definitions).
 *
 * @returns {string}
 */
function getPipelineDefinitionChangeReplayExplanation() {
  return (
    'The current transformed code will revert to the pipeline baseline, the full pipeline will replay ' +
    'with the latest structure and transform definitions, and the result will be re-parsed. Continue?'
  );
}

/**
 * @param {readonly object[]} steps
 * @param {string} structureId
 * @returns {string | null}
 */
export function getPipelineSaveWarningForStructure(steps, structureId) {
  if (!pipelineStepsReferenceStructureId(steps, structureId)) {
    return null;
  }

  return getPipelineDefinitionChangeReplayExplanation();
}

/**
 * @param {readonly object[]} steps
 * @param {string} transformationCode
 * @returns {string | null}
 */
export function getPipelineSaveWarningForTransformBody(steps, transformationCode) {
  if (!pipelineStepsReferenceTransformationCode(steps, transformationCode)) {
    return null;
  }

  return getPipelineDefinitionChangeReplayExplanation();
}
