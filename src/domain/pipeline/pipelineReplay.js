/**
 * Deterministic pipeline replay over a baseline source string.
 *
 * @typedef {import('../transforms/transformExecutor.js').TransformResult} TransformResult
 */

/**
 * Replays enabled steps in order. Disabled steps are skipped without calling the executor.
 *
 * @param {{
 *   baselineSource: string,
 *   steps: readonly object[],
 *   executor: (step: object, source: string) => TransformResult,
 * }} args
 * @returns {{
 *   ok: boolean,
 *   source: string,
 *   lastSuccessfulSource: string,
 *   error: Error | null,
 *   failedStepId: string | null,
 *   failedStepIndex: number | null,
 * }}
 */
export function replayPipeline({baselineSource, steps, executor}) {
  let source = typeof baselineSource === 'string' ? baselineSource : String(baselineSource ?? '');
  let lastSuccessfulSource = source;
  const list = Array.isArray(steps) ? steps : [];

  for (let i = 0; i < list.length; i++) {
    const step = list[i];
    if (step?.enabled === false) {
      continue;
    }

    const stepId = typeof step?.id === 'string' && step.id.length ? step.id : `index-${i}`;
    /** @type {TransformResult} */
    let result;

    try {
      result = executor(step, source);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        ok: false,
        source: lastSuccessfulSource,
        lastSuccessfulSource,
        error: err,
        failedStepId: stepId,
        failedStepIndex: i,
      };
    }

    if (!result || result.isDone !== true) {
      const err = result?.error instanceof Error
        ? result.error
        : new Error(String(result?.error ?? 'Transform failed'));
      return {
        ok: false,
        source: lastSuccessfulSource,
        lastSuccessfulSource,
        error: err,
        failedStepId: stepId,
        failedStepIndex: i,
      };
    }

    source = typeof result.source === 'string' ? result.source : source;
    lastSuccessfulSource = source;
  }

  return {
    ok: true,
    source,
    lastSuccessfulSource: source,
    error: null,
    failedStepId: null,
    failedStepIndex: null,
  };
}
