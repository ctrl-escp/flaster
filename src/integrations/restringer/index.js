import * as normalizeComputedModule from 'restringer/src/modules/safe/normalizeComputed.js';
import * as parseTemplateLiteralsIntoStringLiteralsModule from 'restringer/src/modules/safe/parseTemplateLiteralsIntoStringLiterals.js';
import * as rearrangeSequencesModule from 'restringer/src/modules/safe/rearrangeSequences.js';
import * as rearrangeSwitchesModule from 'restringer/src/modules/safe/rearrangeSwitches.js';
import * as replaceFunctionShellsWithWrappedValueModule from 'restringer/src/modules/safe/replaceFunctionShellsWithWrappedValue.js';
import * as replaceIdentifierWithFixedAssignedValueModule from 'restringer/src/modules/safe/replaceIdentifierWithFixedAssignedValue.js';
import * as resolveDeterministicIfStatementsModule from 'restringer/src/modules/safe/resolveDeterministicIfStatements.js';
import * as resolveProxyCallsModule from 'restringer/src/modules/safe/resolveProxyCalls.js';
import * as resolveProxyReferencesModule from 'restringer/src/modules/safe/resolveProxyReferences.js';
import * as resolveProxyVariablesModule from 'restringer/src/modules/safe/resolveProxyVariables.js';
import * as simplifyCallsModule from 'restringer/src/modules/safe/simplifyCalls.js';
import * as unwrapIIFEsModule from 'restringer/src/modules/safe/unwrapIIFEs.js';
import {areReferencesModified} from 'restringer/src/modules/utils/areReferencesModified.js';
import {createNewNode} from 'restringer/src/modules/utils/createNewNode.js';
import {createOrderedSrc} from 'restringer/src/modules/utils/createOrderedSrc.js';
import {doesDescendantMatchCondition} from 'restringer/src/modules/utils/doesDescendantMatchCondition.js';
import {generateHash} from 'restringer/src/modules/utils/generateHash.js';
import {getCache} from 'restringer/src/modules/utils/getCache.js';
import {getCalleeName} from 'restringer/src/modules/utils/getCalleeName.js';
import {getDeclarationWithContext} from 'restringer/src/modules/utils/getDeclarationWithContext.js';
import {getDescendants} from 'restringer/src/modules/utils/getDescendants.js';
import {getMainDeclaredObjectOfMemberExpression} from 'restringer/src/modules/utils/getMainDeclaredObjectOfMemberExpression.js';
import {getObjType} from 'restringer/src/modules/utils/getObjType.js';
import {isNodeInRanges} from 'restringer/src/modules/utils/isNodeInRanges.js';
import restringerPackage from 'restringer/package.json' with {type: 'json'};
import {knownStructureRegistry} from './registry.js';

/**
 * @typedef {import('flast/src/arborist.js').Arborist} Arborist
 */

/**
 * @typedef {import('flast/src/types.js').ASTNode} ASTNode
 */

/**
 * @typedef {'browser-safe' | 'iframe-sandbox' | 'node-only'} KnownStructureExecutionMode
 */

/**
 * @typedef {'available' | 'unavailable-in-browser' | 'planned' | 'disabled'} KnownStructureAvailabilityStatus
 */

const safeModules = Object.freeze({
  normalizeComputed: normalizeComputedModule,
  parseTemplateLiteralsIntoStringLiterals: parseTemplateLiteralsIntoStringLiteralsModule,
  rearrangeSequences: rearrangeSequencesModule,
  rearrangeSwitches: rearrangeSwitchesModule,
  replaceFunctionShellsWithWrappedValue: replaceFunctionShellsWithWrappedValueModule,
  replaceIdentifierWithFixedAssignedValue: replaceIdentifierWithFixedAssignedValueModule,
  resolveDeterministicIfStatements: resolveDeterministicIfStatementsModule,
  resolveProxyCalls: resolveProxyCallsModule,
  resolveProxyReferences: resolveProxyReferencesModule,
  resolveProxyVariables: resolveProxyVariablesModule,
  simplifyCalls: simplifyCallsModule,
  unwrapIIFEs: unwrapIIFEsModule,
});

const structureRegistryDefinitions = Object.freeze(
  knownStructureRegistry.map((definition) => Object.freeze({...definition})),
);

export const safeUtils = Object.freeze({
  areReferencesModified,
  createNewNode,
  createOrderedSrc,
  doesDescendantMatchCondition,
  generateHash,
  getCache,
  getCalleeName,
  getDeclarationWithContext,
  getDescendants,
  getMainDeclaredObjectOfMemberExpression,
  getObjType,
  isNodeInRanges,
});

/**
 * Creates a frozen copy of an array for exported descriptor metadata.
 *
 * @template T
 * @param {readonly T[]} values
 * @returns {ReadonlyArray<T>}
 */
function freezeArray(values) {
  return Object.freeze([...values]);
}

/**
 * Looks up a named matcher or transform member from a curated safe REstringer module.
 *
 * @param {string} moduleName
 * @param {string} memberName
 * @returns {Function|null}
 */
function getSafeModuleMember(moduleName, memberName) {
  const module = safeModules[moduleName];

  if (!module) {
    throw new Error(`Unknown REstringer safe module: ${moduleName}`);
  }

  return module[memberName] ?? null;
}

/**
 * Builds a lowercase search index string for a known structure descriptor.
 *
 * @param {{
 *   title: string,
 *   category: string,
 *   description: string,
 *   tags: readonly string[],
 *   searchTerms: readonly string[],
 * }} definition
 * @returns {string}
 */
function createSearchText(definition) {
  return [
    definition.title,
    definition.category,
    definition.description,
    ...definition.tags,
    ...definition.searchTerms,
  ].join(' ').toLowerCase();
}

/**
 * Normalizes the execution mode for a structure registry entry.
 *
 * @param {{executionMode?: KnownStructureExecutionMode, browserSafe?: boolean}} definition
 * @returns {KnownStructureExecutionMode}
 */
function getExecutionMode(definition) {
  if (definition.executionMode) {
    return definition.executionMode;
  }

  return definition.browserSafe ? 'browser-safe' : 'node-only';
}

/**
 * Normalizes the availability state for a structure registry entry.
 *
 * @param {{
 *   availabilityStatus?: KnownStructureAvailabilityStatus,
 *   executionMode?: KnownStructureExecutionMode,
 *   browserSafe?: boolean,
 * }} definition
 * @returns {KnownStructureAvailabilityStatus}
 */
function getAvailabilityStatus(definition) {
  if (definition.availabilityStatus) {
    return definition.availabilityStatus;
  }

  const executionMode = getExecutionMode(definition);

  if (executionMode === 'browser-safe') {
    return 'available';
  }

  return definition.browserSafe ? 'available' : 'unavailable-in-browser';
}

/**
 * Returns whether the current browser bundle can run the structure directly.
 *
 * @param {{
 *   executionMode?: KnownStructureExecutionMode,
 *   availabilityStatus?: KnownStructureAvailabilityStatus,
 *   browserSafe?: boolean,
 * }} definition
 * @returns {boolean}
 */
function isBrowserRunnable(definition) {
  return getExecutionMode(definition) === 'browser-safe' &&
    getAvailabilityStatus(definition) === 'available';
}

/**
 * Creates a readable capability note for future UI affordances.
 *
 * @param {{
 *   title: string,
 *   executionMode?: KnownStructureExecutionMode,
 *   availabilityStatus?: KnownStructureAvailabilityStatus,
 *   browserSafe?: boolean,
 * }} definition
 * @returns {string}
 */
function createAvailabilityNote(definition) {
  const executionMode = getExecutionMode(definition);
  const availabilityStatus = getAvailabilityStatus(definition);

  if (availabilityStatus === 'available') {
    return executionMode === 'browser-safe'
      ? 'Runnable in the current browser session.'
      : 'Runnable in a supported non-browser environment.';
  }

  if (availabilityStatus === 'planned') {
    return `${definition.title} is reserved for a future execution path.`;
  }

  if (availabilityStatus === 'disabled') {
    return `${definition.title} is currently disabled.`;
  }

  if (executionMode === 'iframe-sandbox') {
    return `${definition.title} will require a future iframe-backed sandbox runner.`;
  }

  if (executionMode === 'node-only') {
    return `${definition.title} is intended for a future Node-only execution path.`;
  }

  return `${definition.title} is not runnable in the current browser environment.`;
}

export const knownStructures = Object.freeze(
  structureRegistryDefinitions.map((definition) => {
    const matcher = getSafeModuleMember(definition.moduleName, definition.matcherName);
    const transform = getSafeModuleMember(definition.moduleName, definition.transformName);
    const executionMode = getExecutionMode(definition);
    const availabilityStatus = getAvailabilityStatus(definition);
    const browserRunnable = isBrowserRunnable(definition);

    return Object.freeze({
      id: definition.id,
      title: definition.title,
      category: definition.category,
      description: definition.description,
      tags: freezeArray(definition.tags),
      searchTerms: freezeArray(definition.searchTerms),
      searchText: createSearchText(definition),
      browserSafe: definition.browserSafe,
      executionMode,
      availabilityStatus,
      browserRunnable,
      experimental: definition.experimental,
      enabledByDefault: definition.enabledByDefault,
      matcher,
      matcherAvailable: browserRunnable && typeof matcher === 'function',
      transform,
      transformAvailable: browserRunnable && typeof transform === 'function',
      transformEnabled: browserRunnable &&
        definition.transformEnabled &&
        typeof transform === 'function',
      support: Object.freeze({
        browserMatch: browserRunnable && typeof matcher === 'function',
        browserTransform: browserRunnable &&
          definition.transformEnabled &&
          typeof transform === 'function',
        sandboxMatch: executionMode === 'iframe-sandbox',
        sandboxTransform: executionMode === 'iframe-sandbox',
        nodeMatch: executionMode === 'node-only',
        nodeTransform: executionMode === 'node-only',
        note: createAvailabilityNote(definition),
      }),
      implementation: Object.freeze({
        moduleName: definition.moduleName,
        matcherName: definition.matcherName,
        transformName: definition.transformName,
      }),
    });
  }),
);

export const knownStructuresById = Object.freeze(
  Object.fromEntries(knownStructures.map((structure) => [structure.id, structure])),
);

export const safeMatchers = Object.freeze(
  Object.fromEntries(
    knownStructures
      .filter((structure) => structure.matcherAvailable)
      .map((structure) => [structure.id, structure.matcher]),
  ),
);

export const safeTransforms = Object.freeze(
  Object.fromEntries(
    knownStructures
      .filter((structure) => structure.transformEnabled)
      .map((structure) => [structure.id, structure.transform]),
  ),
);

/**
 * Lists built-in known structures with optional filtering for future UI use.
 *
 * @param {{
 *   ids?: string[],
 *   search?: string,
 *   category?: string,
 *   transformAvailable?: boolean,
 *   transformEnabled?: boolean,
 *   browserSafe?: boolean,
 *   browserRunnable?: boolean,
 *   executionMode?: KnownStructureExecutionMode,
 *   availabilityStatus?: KnownStructureAvailabilityStatus,
 *   enabledByDefault?: boolean,
 *   experimental?: boolean,
 * }} [filters={}]
 * @returns {ReadonlyArray<typeof knownStructures[number]>}
 */
export function listKnownStructures(filters = {}) {
  const normalizedSearch = typeof filters.search === 'string'
    ? filters.search.trim().toLowerCase()
    : '';

  return knownStructures.filter((structure) => {
    if (Array.isArray(filters.ids) && filters.ids.length && !filters.ids.includes(structure.id)) {
      return false;
    }

    if (filters.category && structure.category !== filters.category) {
      return false;
    }

    if (typeof filters.transformAvailable === 'boolean' &&
      structure.transformAvailable !== filters.transformAvailable) {
      return false;
    }

    if (typeof filters.transformEnabled === 'boolean' &&
      structure.transformEnabled !== filters.transformEnabled) {
      return false;
    }

    if (typeof filters.browserSafe === 'boolean' &&
      structure.browserSafe !== filters.browserSafe) {
      return false;
    }

    if (typeof filters.browserRunnable === 'boolean' &&
      structure.browserRunnable !== filters.browserRunnable) {
      return false;
    }

    if (filters.executionMode && structure.executionMode !== filters.executionMode) {
      return false;
    }

    if (filters.availabilityStatus && structure.availabilityStatus !== filters.availabilityStatus) {
      return false;
    }

    if (typeof filters.enabledByDefault === 'boolean' &&
      structure.enabledByDefault !== filters.enabledByDefault) {
      return false;
    }

    if (typeof filters.experimental === 'boolean' &&
      structure.experimental !== filters.experimental) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return structure.searchText.includes(normalizedSearch);
  });
}

/**
 * Retrieves a known structure descriptor by its stable ID.
 *
 * @param {string} structureId
 * @returns {(typeof knownStructuresById)[string] | null}
 */
export function getKnownStructure(structureId) {
  return knownStructuresById[structureId] ?? null;
}

/**
 * Checks whether a value looks like a flAST AST node with a range.
 *
 * @param {unknown} value
 * @returns {value is ASTNode}
 */
function isNodeLike(value) {
  return !!value &&
    typeof value === 'object' &&
    typeof value.type === 'string' &&
    Array.isArray(value.range);
}

/**
 * Finds the most representative AST node inside a REstringer match payload.
 *
 * Some safe modules return a node directly while others return richer objects
 * containing one or more nodes. This helper walks the match object and picks
 * the first node-shaped value that is useful for UI-facing normalization.
 *
 * @param {unknown} match
 * @param {Set<object>} [seen]
 * @returns {ASTNode|null}
 */
function findNodeInMatch(match, seen = new Set()) {
  if (!match || typeof match !== 'object' || seen.has(match)) {
    return null;
  }

  if (isNodeLike(match)) {
    return match;
  }

  seen.add(match);

  const preferredKeys = [
    'node',
    'targetNode',
    'funcNode',
    'referenceNode',
    'declarationNode',
    'candidateNode',
    'expressionNode',
    'statementNode',
    'callNode',
    'calleeNode',
    'parentNode',
  ];

  for (const key of preferredKeys) {
    const candidate = findNodeInMatch(match[key], seen);
    if (candidate) {
      return candidate;
    }
  }

  if (Array.isArray(match)) {
    for (const entry of match) {
      const candidate = findNodeInMatch(entry, seen);
      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  for (const value of Object.values(match)) {
    const candidate = findNodeInMatch(value, seen);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

/**
 * Creates a short human-readable label for a normalized match record.
 *
 * @param {typeof knownStructures[number]} structure
 * @param {ASTNode|null} node
 * @param {number} index
 * @returns {string}
 */
function createSummary(structure, node, index) {
  if (!node) {
    return `${structure.title} match ${index + 1}`;
  }

  const summaryParts = [structure.title, node.type];
  if (node.parentNode?.type) {
    summaryParts.push(`within ${node.parentNode.type}`);
  }

  return summaryParts.join(' ');
}

/**
 * Normalizes a raw REstringer match into the shape the flASTer UI can consume.
 *
 * @param {string | typeof knownStructures[number]} structureOrId
 * @param {unknown} match
 * @param {number} [index=0]
 * @returns {{
 *   index: number,
 *   structureId: string,
 *   structureTitle: string,
 *   category: string,
 *   match: unknown,
 *   node: ASTNode | null,
 *   type: string | null,
 *   parentType: string | null,
 *   range: number[] | null,
 *   loc: ASTNode['loc'] | null,
 *   srcSnippet: string | null,
 *   summary: string,
 * }}
 */
export function normalizeStructureMatch(structureOrId, match, index = 0) {
  const structure = typeof structureOrId === 'string'
    ? getKnownStructure(structureOrId)
    : structureOrId;

  if (!structure) {
    throw new Error(`Unknown known structure: ${structureOrId}`);
  }

  const node = findNodeInMatch(match);

  return Object.freeze({
    index,
    structureId: structure.id,
    structureTitle: structure.title,
    category: structure.category,
    match,
    node,
    type: node?.type ?? null,
    parentType: node?.parentNode?.type ?? null,
    range: Array.isArray(node?.range) ? [...node.range] : null,
    loc: node?.loc ?? null,
    srcSnippet: typeof node?.src === 'string' ? node.src.slice(0, 240) : null,
    summary: createSummary(structure, node, index),
  });
}

/**
 * Runs a known structure matcher against an Arborist instance and returns both
 * raw REstringer matches and normalized UI-ready match records.
 *
 * @param {Arborist} arb
 * @param {string | typeof knownStructures[number]} structureOrId
 * @param {{candidateFilter?: (node: ASTNode) => boolean}} [options={}]
 * @returns {{
 *   structure: typeof knownStructures[number],
 *   structureId: string,
 *   rawMatches: unknown[],
 *   matches: ReadonlyArray<ReturnType<typeof normalizeStructureMatch>>,
 *   count: number,
 *   error: Error | null,
 * }}
 */
export function runKnownStructureMatcher(arb, structureOrId, options = {}) {
  const structure = typeof structureOrId === 'string'
    ? getKnownStructure(structureOrId)
    : structureOrId;

  if (!structure) {
    throw new Error(`Unknown known structure: ${structureOrId}`);
  }

  const candidateFilter = typeof options.candidateFilter === 'function'
    ? options.candidateFilter
    : () => true;

  return getMatcherRunner(structure)(structure, arb, candidateFilter);
}

/**
 * Runs a known structure transform against a single raw match and reports the
 * pending Arborist change count without applying those changes.
 *
 * @param {Arborist} arb
 * @param {string | typeof knownStructures[number]} structureOrId
 * @param {unknown} match
 * @returns {{
 *   structure: typeof knownStructures[number],
 *   structureId: string,
 *   match: ReturnType<typeof normalizeStructureMatch>,
 *   pendingChanges: number | null,
 * }}
 */
export function runKnownStructureTransform(arb, structureOrId, match) {
  const structure = typeof structureOrId === 'string'
    ? getKnownStructure(structureOrId)
    : structureOrId;

  if (!structure) {
    throw new Error(`Unknown known structure: ${structureOrId}`);
  }

  return getTransformRunner(structure)(structure, arb, match);
}

/**
 * Runs the full safe transform path for a known structure against an Arborist
 * instance without applying the pending changes.
 *
 * This helper is used for both preview and apply flows. It intentionally reruns
 * the matcher on the provided Arborist instance so the transform always acts on
 * matches produced from the same AST that will receive the pending mutations.
 *
 * @param {Arborist} arb
 * @param {string | typeof knownStructures[number]} structureOrId
 * @param {{candidateFilter?: (node: ASTNode) => boolean}} [options={}]
 * @returns {{
 *   structure: typeof knownStructures[number],
 *   structureId: string,
 *   transformName: string,
 *   matches: ReadonlyArray<ReturnType<typeof normalizeStructureMatch>>,
 *   rawMatches: unknown[],
 *   targetedMatchCount: number,
 *   pendingChanges: number | null,
 *   error: Error | null,
 * }}
 */
export function runKnownStructureTransformSession(arb, structureOrId, options = {}) {
  const matchRun = runKnownStructureMatcher(arb, structureOrId, options);

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

/**
 * Creates a consistent unsupported-capability error for placeholder runners.
 *
 * @param {typeof knownStructures[number]} structure
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
 * Runs a browser-safe matcher and normalizes its output.
 *
 * @param {typeof knownStructures[number]} structure
 * @param {Arborist} arb
 * @param {(node: ASTNode) => boolean} candidateFilter
 * @returns {ReturnType<typeof runKnownStructureMatcher>}
 */
function runBrowserSafeMatcher(structure, arb, candidateFilter) {
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
 * Returns a placeholder matcher result for future non-browser execution paths.
 *
 * @param {typeof knownStructures[number]} structure
 * @returns {ReturnType<typeof runKnownStructureMatcher>}
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
 * Runs a browser-safe transform against one raw match.
 *
 * @param {typeof knownStructures[number]} structure
 * @param {Arborist} arb
 * @param {unknown} match
 * @returns {ReturnType<typeof runKnownStructureTransform>}
 */
function runBrowserSafeTransform(structure, arb, match) {
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
 * Returns a placeholder transform-session result for future non-browser execution paths.
 *
 * @param {typeof knownStructures[number]} structure
 * @param {ReturnType<typeof runKnownStructureMatcher>} [matchRun]
 * @returns {ReturnType<typeof runKnownStructureTransformSession>}
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
 * Runs a browser-safe transform session across all matches from the current AST.
 *
 * @param {typeof knownStructures[number]} structure
 * @param {Arborist} arb
 * @param {ReturnType<typeof runKnownStructureMatcher>} matchRun
 * @returns {ReturnType<typeof runKnownStructureTransformSession>}
 */
function runBrowserSafeTransformSession(structure, arb, matchRun) {
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
  'browser-safe': runBrowserSafeMatcher,
  'iframe-sandbox': runUnsupportedMatcher,
  'node-only': runUnsupportedMatcher,
});

const transformRunnersByMode = Object.freeze({
  'browser-safe': runBrowserSafeTransform,
  'iframe-sandbox': (structure) => {
    throw createUnsupportedExecutionError(structure, 'transform');
  },
  'node-only': (structure) => {
    throw createUnsupportedExecutionError(structure, 'transform');
  },
});

const transformSessionRunnersByMode = Object.freeze({
  'browser-safe': runBrowserSafeTransformSession,
  'iframe-sandbox': runUnsupportedTransformSession,
  'node-only': runUnsupportedTransformSession,
});

/**
 * Returns the matcher runner for the structure's execution mode.
 *
 * @param {typeof knownStructures[number]} structure
 * @returns {typeof runBrowserSafeMatcher}
 */
export function getMatcherRunner(structure) {
  return matchRunnersByMode[structure.executionMode] ?? runUnsupportedMatcher;
}

/**
 * Returns the single-match transform runner for the structure's execution mode.
 *
 * @param {typeof knownStructures[number]} structure
 * @returns {typeof runBrowserSafeTransform}
 */
export function getTransformRunner(structure) {
  return transformRunnersByMode[structure.executionMode] ?? transformRunnersByMode['node-only'];
}

/**
 * Returns the transform-session runner for the structure's execution mode.
 *
 * @param {typeof knownStructures[number]} structure
 * @returns {typeof runBrowserSafeTransformSession}
 */
export function getTransformSessionRunner(structure) {
  return transformSessionRunnersByMode[structure.executionMode] ??
    transformSessionRunnersByMode['node-only'];
}

export const restringerBrowser = Object.freeze({
  version: restringerPackage.version,
  knownStructureRegistry: structureRegistryDefinitions,
  knownStructures,
  knownStructuresById,
  safeMatchers,
  safeTransforms,
  safeUtils,
  listKnownStructures,
  getKnownStructure,
  normalizeStructureMatch,
  getMatcherRunner,
  getTransformRunner,
  getTransformSessionRunner,
  runKnownStructureMatcher,
  runKnownStructureTransform,
  runKnownStructureTransformSession,
});

export default restringerBrowser;
