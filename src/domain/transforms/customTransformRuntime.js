/**
 * User-authored custom transforms run here via `new Function` (interim browser runtime).
 * Prefer a Web Worker with timeouts when this surface needs hard isolation.
 *
 * @typedef {object} TransformResult
 * @property {boolean} isDone
 * @property {number} changesCount
 * @property {string} source
 * @property {string | null} structureName
 * @property {string} transformName
 * @property {Error | null} error
 */

import {runKnownStructureMatcher} from '../../integrations/restringer/index.js';

/**
 * Compiles a filter body used as the expression inside `(n) => <body>`.
 *
 * @param {string} filterSrc
 * @returns {(n: unknown) => boolean}
 */
export function compileNodePredicate(filterSrc) {
  const trimmed = String(filterSrc ?? '').trim();
  if (!trimmed) {
    throw new Error('Empty filter predicate');
  }

  // eslint-disable-next-line no-new-func
  return new Function('n', `return Boolean(${trimmed});`);
}

/**
 * @param {object} metadata
 * @param {object} draft Defaults from UI template draft (e.g. advanced-js-step).
 */
export function normalizeCustomTransformRunSettings(metadata = {}, draft = {}) {
  const requestedMode = metadata.runMode ?? draft.runMode ?? 'until-stable';
  const runMode = ['once', 'count', 'until-stable'].includes(requestedMode)
    ? requestedMode
    : 'until-stable';
  const requestedIterations = Number.parseInt(
    metadata.maxIterations ?? draft.maxIterations ?? 3,
    10,
  );
  const maxIterations = runMode === 'count'
    ? Math.max(1, Number.isFinite(requestedIterations) ? requestedIterations : 1)
    : 1;

  return {
    runMode,
    maxIterations,
  };
}

/**
 * @param {string} body
 * @param {'structure' | 'per-node'} mode
 */
function compileTransformBody(body, mode) {
  const trimmed = String(body ?? '').trim();
  if (!trimmed) {
    throw new Error('Empty transformation body');
  }

  if (mode === 'structure') {
    // eslint-disable-next-line no-new-func
    return new Function('matches', 'arb', `"use strict";\n${trimmed}`);
  }

  // eslint-disable-next-line no-new-func
  return new Function('n', 'arb', `"use strict";\n${trimmed}`);
}

/**
 * Runs a custom JS transform loop (advanced-js-step semantics).
 *
 * @param {import('flast/src/arborist.js').Arborist} arborist
 * @param {{
 *   body: string,
 *   structureId: string | null,
 *   candidateFilters: Array<{src?: string, enabled?: boolean}>,
 *   runSettings: ReturnType<typeof normalizeCustomTransformRunSettings>,
 * }} options
 * @returns {TransformResult}
 */
export function runCustomTransformExecution(arborist, options) {
  const {body, structureId, candidateFilters, runSettings} = options;
  const sourceBefore = typeof arborist?.script === 'string' ? arborist.script : '';
  const transformName = 'custom';
  const structureName = structureId ?? null;

  const normalizedBody = String(body ?? '').trim();
  if (!normalizedBody) {
    return {
      isDone: true,
      changesCount: 0,
      source: sourceBefore,
      structureName,
      transformName,
      error: null,
    };
  }

  const enabledFilters = (Array.isArray(candidateFilters) ? candidateFilters : [])
    .filter((filter) => filter?.enabled !== false && filter?.src);
  const filterFns = enabledFilters.map((filter) => compileNodePredicate(filter.src));

  const combineFilter = filterFns.length
    ? (node) => filterFns.every((fn) => fn(node))
    : () => true;

  const firstPassNodes = filterFns.length ? null : [...(arborist?.ast ?? [])];
  let totalChanges = 0;
  let iterationCount = 0;

  const shouldContinue = () => runSettings.runMode === 'until-stable' ||
    (runSettings.runMode === 'count' && iterationCount < runSettings.maxIterations) ||
    (runSettings.runMode === 'once' && iterationCount < 1);

  try {
    while (shouldContinue()) {
      if (structureId) {
        const matchRun = runKnownStructureMatcher(arborist, structureId, {
          candidateFilter: combineFilter,
        });

        if (matchRun.error) {
          throw matchRun.error;
        }

        const matches = matchRun.rawMatches;
        const runBody = compileTransformBody(normalizedBody, 'structure');
        runBody(matches, arborist);
      } else {
        const candidateNodes = filterFns.length
          ? (arborist?.ast ?? []).filter((node) => combineFilter(node))
          : iterationCount === 0
            ? firstPassNodes ?? []
            : arborist?.ast ?? [];

        const runBody = compileTransformBody(normalizedBody, 'per-node');
        for (const n of candidateNodes) {
          runBody(n, arborist);
        }
      }

      const changes = arborist.applyChanges();
      if (changes < 1) {
        break;
      }

      totalChanges += changes;
      iterationCount += 1;
    }

    return {
      isDone: true,
      changesCount: totalChanges,
      source: typeof arborist?.script === 'string' ? arborist.script : sourceBefore,
      structureName,
      transformName,
      error: null,
      executedIterations: iterationCount,
    };
  } catch (error) {
    return {
      isDone: false,
      changesCount: 0,
      source: sourceBefore,
      structureName,
      transformName,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
