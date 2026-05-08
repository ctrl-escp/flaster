import {normalizeStructureMatch} from './normalizers.js';

/**
 * @typedef {import('flast/src/arborist.js').Arborist} Arborist
 */

/**
 * @typedef {import('flast/src/types.js').ASTNode} ASTNode
 */

/**
 * @param {object} structure
 * @param {'match' | 'transform'} operation
 * @returns {Error}
 */
function createUnsupportedExecutionError(structure, operation) {
  const modeLabel = structure.executionMode === 'iframe-sandbox'
    ? 'a future iframe-backed sandbox'
    : structure.executionMode === 'node-only'
      ? 'a future Node-only runtime'
      : 'the current browser runtime';

  return new Error(
    `${structure.title} cannot ${operation} in the current browser session; it is reserved for ${modeLabel}.`,
  );
}

/**
 * @param {object} structure
 * @param {Arborist} arb
 * @param {(node: ASTNode) => boolean} candidateFilter
 */
function runSafeMatcher(structure, arb, candidateFilter) {
  if (!structure.matcherAvailable) {
    throw createUnsupportedExecutionError(structure, 'match');
  }

  try {
    const rawMatches = structure.matcher(arb, candidateFilter) ?? [];
    const normalizedMatches = rawMatches.map((match, index) =>
      normalizeStructureMatch(structure, match, index),
    );

    return Object.freeze({
      structure,
      structureId: structure.id,
      rawMatches,
      matches: Object.freeze(normalizedMatches),
      count: normalizedMatches.length,
      error: null,
    });
  } catch (error) {
    return Object.freeze({
      structure,
      structureId: structure.id,
      rawMatches: Object.freeze([]),
      matches: Object.freeze([]),
      count: 0,
      error,
    });
  }
}

/**
 * @param {object} structure
 */
function runUnsupportedMatcher(structure) {
  return Object.freeze({
    structure,
    structureId: structure.id,
    rawMatches: Object.freeze([]),
    matches: Object.freeze([]),
    count: 0,
    error: createUnsupportedExecutionError(structure, 'match'),
  });
}

/**
 * @param {object} structure
 * @param {Arborist} arb
 * @param {unknown} match
 */
function runSafeTransform(structure, arb, match) {
  if (!structure.transformEnabled) {
    throw createUnsupportedExecutionError(structure, 'transform');
  }

  const normalizedMatch = normalizeStructureMatch(structure, match);
  structure.transform(arb, match);

  return Object.freeze({
    structure,
    structureId: structure.id,
    match: normalizedMatch,
    pendingChanges: typeof arb.getNumberOfChanges === 'function' ? arb.getNumberOfChanges() : null,
  });
}

/**
 * @param {object} structure
 * @param {ReturnType<typeof executeKnownStructureMatcher>} [matchRun]
 */
function runUnsupportedTransformSession(structure, matchRun) {
  return Object.freeze({
    structure,
    structureId: structure.id,
    transformName: structure.implementation.transformName,
    matches: matchRun?.matches ?? Object.freeze([]),
    rawMatches: matchRun?.rawMatches ?? Object.freeze([]),
    targetedMatchCount: matchRun?.count ?? 0,
    pendingChanges: 0,
    error: createUnsupportedExecutionError(structure, 'transform'),
  });
}

/**
 * @param {object} structure
 * @param {Arborist} arb
 * @param {ReturnType<typeof executeKnownStructureMatcher>} matchRun
 */
function runSafeTransformSession(structure, arb, matchRun) {
  if (!structure.transformEnabled) {
    return runUnsupportedTransformSession(structure, matchRun);
  }

  try {
    for (const rawMatch of matchRun.rawMatches) {
      structure.transform(arb, rawMatch);
    }

    return Object.freeze({
      structure,
      structureId: structure.id,
      transformName: structure.implementation.transformName,
      matches: matchRun.matches,
      rawMatches: matchRun.rawMatches,
      targetedMatchCount: matchRun.count,
      pendingChanges: typeof arb.getNumberOfChanges === 'function' ? arb.getNumberOfChanges() : null,
      error: null,
    });
  } catch (error) {
    return Object.freeze({
      structure,
      structureId: structure.id,
      transformName: structure.implementation.transformName,
      matches: matchRun.matches,
      rawMatches: matchRun.rawMatches,
      targetedMatchCount: matchRun.count,
      pendingChanges: 0,
      error,
    });
  }
}

const matchRunnersByMode = Object.freeze({
  'no-eval': runSafeMatcher,
  'iframe-sandbox': runUnsupportedMatcher,
  'node-only': runUnsupportedMatcher,
});

const transformRunnersByMode = Object.freeze({
  'no-eval': runSafeTransform,
  'iframe-sandbox': (structure) => {
    throw createUnsupportedExecutionError(structure, 'transform');
  },
  'node-only': (structure) => {
    throw createUnsupportedExecutionError(structure, 'transform');
  },
});

const transformSessionRunnersByMode = Object.freeze({
  'no-eval': runSafeTransformSession,
  'iframe-sandbox': runUnsupportedTransformSession,
  'node-only': runUnsupportedTransformSession,
});

/**
 * @param {object} structure
 */
export function getMatcherRunner(structure) {
  return matchRunnersByMode[structure.executionMode] ?? runUnsupportedMatcher;
}

/**
 * @param {object} structure
 */
export function getTransformRunner(structure) {
  return transformRunnersByMode[structure.executionMode] ?? transformRunnersByMode['node-only'];
}

/**
 * @param {object} structure
 */
export function getTransformSessionRunner(structure) {
  return transformSessionRunnersByMode[structure.executionMode] ??
    transformSessionRunnersByMode['node-only'];
}

/**
 * @param {object} structure
 * @param {Arborist} arb
 * @param {{candidateFilter?: (node: ASTNode) => boolean}} [options={}]
 */
export function executeKnownStructureMatcher(structure, arb, options = {}) {
  const candidateFilter = typeof options.candidateFilter === 'function'
    ? options.candidateFilter
    : () => true;

  return getMatcherRunner(structure)(structure, arb, candidateFilter);
}

/**
 * @param {object} structure
 * @param {Arborist} arb
 * @param {unknown} match
 */
export function executeKnownStructureTransform(structure, arb, match) {
  return getTransformRunner(structure)(structure, arb, match);
}

/**
 * @param {object} structure
 * @param {Arborist} arb
 * @param {{candidateFilter?: (node: ASTNode) => boolean}} [options={}]
 */
export function executeKnownStructureTransformSession(structure, arb, options = {}) {
  const matchRun = executeKnownStructureMatcher(structure, arb, options);

  if (matchRun.error) {
    return Object.freeze({
      structure: matchRun.structure,
      structureId: matchRun.structureId,
      transformName: matchRun.structure.implementation.transformName,
      matches: Object.freeze([]),
      rawMatches: Object.freeze([]),
      targetedMatchCount: 0,
      pendingChanges: 0,
      error: matchRun.error,
    });
  }

  return getTransformSessionRunner(matchRun.structure)(matchRun.structure, arb, matchRun);
}
