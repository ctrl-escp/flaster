/**
 * Maps a single stored pipeline step + source string to a Phase 5 {@link TransformResult}.
 * Used by {@link replayPipeline} and the reactive store facade.
 */

import {loadDeobWorkspaceModules} from '../deob/workspaceModules.js';
import {normalizeCustomTransformRunSettings} from '../transforms/customTransformRuntime.js';
import {getPipelineStepStructureId, normalizePipelineStepEntry} from './pipelineModel.js';

/**
 * @typedef {import('../transforms/transformExecutor.js').TransformResult} TransformResult
 */

/**
 * @typedef {Awaited<ReturnType<typeof loadDeobWorkspaceModules>>} DeobWorkspaceModules
 */

/**
 * @param {object} metadata
 * @param {object} draft
 */
export function normalizeDeleteStructureRunSettings(metadata = {}, draft = {}) {
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

function hasMatchedAncestor(node, matchedNodes) {
  let current = node?.parentNode ?? null;

  while (current) {
    if (matchedNodes.has(current)) {
      return true;
    }

    current = current.parentNode ?? null;
  }

  return false;
}

/**
 * @param {unknown[]} matches
 * @returns {unknown[]}
 */
export function getOutermostMatchedNodes(matches = []) {
  const nodes = matches
    .map((match) => (match && typeof match === 'object' && 'relevantNode' in match ? match.relevantNode : match))
    .filter(Boolean);
  const matchedNodes = new Set(nodes);

  return nodes.filter((node) => node && !hasMatchedAncestor(node, matchedNodes));
}

/**
 * @param {string} script
 * @param {object} step
 * @param {{
 *   templateDrafts?: Record<string, {runMode?: string, maxIterations?: number}>,
 * }} ctx
 * @returns {Promise<TransformResult>}
 */
async function replayPipelineStepToTransformResult(script, step, ctx = {}) {
  const templateDrafts = ctx.templateDrafts ?? {};
  const normalizedStep = normalizePipelineStepEntry(step);
  const templateType = normalizedStep.templateType ?? '';
  const structureId = getPipelineStepStructureId(normalizedStep);

  if (normalizedStep.enabled === false) {
    return {
      isDone: true,
      changesCount: 0,
      source: script,
      structureName: structureId,
      transformName: '',
      error: null,
    };
  }

  const m = await loadDeobWorkspaceModules();

  if (templateType === 'advanced-js-step' ||
    (normalizedStep.kind === 'custom' && normalizedStep.transformationCode)) {
    return runCustomStepTransform(script, normalizedStep, templateDrafts, structureId, m);
  }

  if (templateType === 'apply-known-transform' ||
    normalizedStep.kind === 'known-structure-transform') {
    return runKnownStructureStep(script, structureId, m);
  }

  if (templateType === 'delete-structure-matches') {
    return runDeleteStructureMatchesStep(script, structureId, normalizedStep, templateDrafts, m);
  }

  if (templateType === 'isolate-structure-matches') {
    return runIsolateStructureMatchesStep(script, structureId, m);
  }

  return {
    isDone: true,
    changesCount: 0,
    source: script,
    structureName: structureId,
    transformName: '',
    error: null,
  };
}

/**
 * @param {Record<string, {runMode?: string, maxIterations?: number}>} templateDrafts
 * @returns {(step: object, source: string) => Promise<TransformResult>}
 */
export function createPipelineStepExecutor(templateDrafts = {}) {
  return (step, source) => replayPipelineStepToTransformResult(source, step, {templateDrafts});
}

/**
 * @param {string} script
 * @param {object} normalizedStep
 * @param {Record<string, unknown>} templateDrafts
 * @param {string | null} structureId
 * @param {DeobWorkspaceModules} m
 * @returns {Promise<TransformResult>}
 */
async function runCustomStepTransform(script, normalizedStep, templateDrafts, structureId, m) {
  const raw = normalizedStep.transformationCode;
  const source = typeof raw === 'string' ? raw.trim() : '';

  if (!source.length) {
    return {
      isDone: true,
      changesCount: 0,
      source: script,
      structureName: structureId,
      transformName: '',
      error: null,
    };
  }

  const arb = m.createArborist(script);
  const candidateFilters = Array.isArray(normalizedStep?.filters)
    ? normalizedStep.filters.filter((filter) => filter?.enabled !== false && filter?.src)
    : [];
  const runSettings = normalizeCustomTransformRunSettings(
    normalizedStep,
    templateDrafts['advanced-js-step'] ?? {},
  );
  const result = await m.runCustomTransformExecution(arb, {
    body: source,
    structureId: structureId ?? null,
    candidateFilters,
    runSettings,
  });

  if (!result.isDone) {
    return {
      isDone: false,
      changesCount: 0,
      source: script,
      structureName: structureId,
      transformName: '',
      error: result.error instanceof Error ? result.error : new Error(String(result.error)),
    };
  }

  return {
    isDone: true,
    changesCount: result.changesCount ?? 0,
    source: result.source,
    structureName: structureId,
    transformName: 'custom',
    error: null,
  };
}

/**
 * @param {string} script
 * @param {string | null} structureId
 * @param {DeobWorkspaceModules} m
 * @returns {Promise<TransformResult>}
 */
async function runKnownStructureStep(script, structureId, m) {
  if (!structureId) {
    return {
      isDone: false,
      changesCount: 0,
      source: script,
      structureName: null,
      transformName: '',
      error: new Error('Missing structure id for known-structure replay'),
    };
  }

  const arb = m.createArborist(script);
  const transformResult = await m.executeKnownStructureTransformApply(arb, structureId);

  if (!transformResult.isDone) {
    return transformResult;
  }

  if (transformResult.changesCount < 1) {
    return {
      isDone: true,
      changesCount: 0,
      source: script,
      structureName: transformResult.structureName ?? structureId,
      transformName: transformResult.transformName ?? '',
      error: null,
    };
  }

  return transformResult;
}

/**
 * @param {string} script
 * @param {string | null} structureId
 * @param {object} normalizedStep
 * @param {Record<string, unknown>} templateDrafts
 * @param {DeobWorkspaceModules} m
 * @returns {Promise<TransformResult>}
 */
async function runDeleteStructureMatchesStep(script, structureId, normalizedStep, templateDrafts, m) {
  if (!structureId) {
    return {
      isDone: false,
      changesCount: 0,
      source: script,
      structureName: null,
      transformName: '',
      error: new Error('Missing structure id for delete-structure-matches replay'),
    };
  }

  const arb = m.createArborist(script);
  const runSettings = normalizeDeleteStructureRunSettings(normalizedStep, templateDrafts['delete-structure-matches'] ?? {});
  let iterationCount = 0;
  const shouldContinue = () => runSettings.runMode === 'until-stable' ||
    (runSettings.runMode === 'count' && iterationCount < runSettings.maxIterations) ||
    (runSettings.runMode === 'once' && iterationCount < 1);

  try {
    while (shouldContinue()) {
      const matchRun = m.runKnownStructureMatcher(arb, structureId);
      if (matchRun.error) {
        return {
          isDone: false,
          changesCount: 0,
          source: typeof arb?.script === 'string' ? arb.script : script,
          structureName: structureId,
          transformName: '',
          error: matchRun.error instanceof Error ? matchRun.error : new Error(String(matchRun.error)),
        };
      }

      const matchedNodes = m.collectKnownStructureMatchNodes(matchRun.rawMatches);
      if (!matchedNodes.length) {
        break;
      }

      for (const node of matchedNodes) {
        if (node) {
          arb.markNode(node);
        }
      }

      const changes = arb.applyChanges();
      if (changes < 1) {
        break;
      }

      iterationCount += 1;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      isDone: false,
      changesCount: 0,
      source: typeof arb?.script === 'string' ? arb.script : script,
      structureName: structureId,
      transformName: '',
      error: err,
    };
  }

  return {
    isDone: true,
    changesCount: iterationCount,
    source: typeof arb?.script === 'string' ? arb.script : script,
    structureName: structureId,
    transformName: 'delete-structure-matches',
    error: null,
  };
}

/**
 * @param {string} script
 * @param {string | null} structureId
 * @param {DeobWorkspaceModules} m
 * @returns {Promise<TransformResult>}
 */
async function runIsolateStructureMatchesStep(script, structureId, m) {
  if (!structureId) {
    return {
      isDone: false,
      changesCount: 0,
      source: script,
      structureName: null,
      transformName: '',
      error: new Error('Missing structure id for isolate-structure-matches replay'),
    };
  }

  const arb = m.createArborist(script);

  try {
    const matchRun = m.runKnownStructureMatcher(arb, structureId);
    if (matchRun.error) {
      return {
        isDone: false,
        changesCount: 0,
        source: script,
        structureName: structureId,
        transformName: '',
        error: matchRun.error instanceof Error ? matchRun.error : new Error(String(matchRun.error)),
      };
    }

    const programNode = arb?.ast?.find((node) => node.type === 'Program');
    if (!programNode) {
      return {
        isDone: true,
        changesCount: 0,
        source: script,
        structureName: structureId,
        transformName: '',
        error: null,
      };
    }

    const matchedNodes = m.collectKnownStructureMatchNodes(matchRun.rawMatches);
    const isolatedNodes = getOutermostMatchedNodes(matchedNodes).filter(Boolean);

    if (!isolatedNodes.length) {
      return {
        isDone: true,
        changesCount: 0,
        source: script,
        structureName: structureId,
        transformName: '',
        error: null,
      };
    }

    arb.markNode(programNode, {
      type: 'Program',
      sourceType: programNode.sourceType,
      body: [{
        type: 'BlockStatement',
        body: isolatedNodes,
      }],
    });
    arb.applyChanges();

    return {
      isDone: true,
      changesCount: 1,
      source: typeof arb?.script === 'string' ? arb.script : script,
      structureName: structureId,
      transformName: 'isolate-structure-matches',
      error: null,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      isDone: false,
      changesCount: 0,
      source: script,
      structureName: structureId,
      transformName: '',
      error: err,
    };
  }
}
