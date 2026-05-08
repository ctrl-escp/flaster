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
import {
  createAvailabilityNote,
  createSearchText,
  getExecutionMode,
  isRunnable,
} from './capabilities.js';
import {knownStructureRegistry} from './catalog.js';
import {
  collectKnownStructureMatchNodes,
  describeKnownStructureMatchShape,
  normalizeStructureMatch as normalizeStructureMatchForStructure,
} from './normalizers.js';
import {
  executeKnownStructureMatcher,
  executeKnownStructureTransform,
  executeKnownStructureTransformSession,
  getMatcherRunner,
  getTransformRunner,
  getTransformSessionRunner,
} from './runners.js';

/**
 * @typedef {import('flast/src/arborist.js').Arborist} Arborist
 */

/**
 * @typedef {import('flast/src/types.js').ASTNode} ASTNode
 */

/**
 * @typedef {'no-eval' | 'iframe-sandbox' | 'node-only'} KnownStructureExecutionMode
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

/**
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

export const knownStructures = Object.freeze(
  structureRegistryDefinitions.map((definition) => {
    const matcher = getSafeModuleMember(definition.moduleName, definition.matcherName);
    const transform = getSafeModuleMember(definition.moduleName, definition.transformName);
    const executionMode = getExecutionMode(definition);
    const runnable = isRunnable(definition);

    return Object.freeze({
      id: definition.id,
      title: definition.title,
      categoryGroup: definition.categoryGroup ?? 'obfuscation',
      category: definition.category,
      description: definition.description,
      codeExample: definition.codeExample ?? '',
      searchText: createSearchText(definition),
      noEval: definition.noEval ?? executionMode === 'no-eval',
      executionMode,
      matcher,
      matcherAvailable: runnable && typeof matcher === 'function',
      transform,
      transformAvailable: runnable && typeof transform === 'function',
      transformEnabled: runnable &&
        definition.transformEnabled &&
        typeof transform === 'function',
      support: Object.freeze({
        safeMatch: runnable && typeof matcher === 'function',
        safeTransform: runnable &&
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
 * @param {{
 *   ids?: string[],
 *   search?: string,
 *   categoryGroup?: string,
 *   category?: string,
 *   transformAvailable?: boolean,
 *   transformEnabled?: boolean,
 *   noEval?: boolean,
 *   runnable?: boolean,
 *   executionMode?: KnownStructureExecutionMode,
 * }} [filters={}]
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

    if (filters.categoryGroup && structure.categoryGroup !== filters.categoryGroup) {
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

    if (typeof filters.noEval === 'boolean' &&
      structure.noEval !== filters.noEval) {
      return false;
    }

    if (typeof filters.runnable === 'boolean' &&
      isRunnable(structure) !== filters.runnable) {
      return false;
    }

    if (filters.executionMode && structure.executionMode !== filters.executionMode) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return structure.searchText.includes(normalizedSearch);
  });
}

/**
 * @param {string} structureId
 */
export function getKnownStructure(structureId) {
  return knownStructuresById[structureId] ?? null;
}

/**
 * @param {string | typeof knownStructures[number]} structureOrId
 */
function resolveKnownStructure(structureOrId) {
  return typeof structureOrId === 'string'
    ? getKnownStructure(structureOrId)
    : structureOrId;
}

/**
 * @param {string | typeof knownStructures[number]} structureOrId
 * @param {unknown} match
 * @param {number} [index=0]
 */
export function normalizeStructureMatch(structureOrId, match, index = 0) {
  const structure = resolveKnownStructure(structureOrId);

  if (!structure) {
    throw new Error(`Unknown known structure: ${structureOrId}`);
  }

  return normalizeStructureMatchForStructure(structure, match, index);
}

export {collectKnownStructureMatchNodes, describeKnownStructureMatchShape};

/**
 * @param {Arborist} arb
 * @param {string | typeof knownStructures[number]} structureOrId
 * @param {{candidateFilter?: (node: ASTNode) => boolean}} [options={}]
 */
export function runKnownStructureMatcher(arb, structureOrId, options = {}) {
  const structure = resolveKnownStructure(structureOrId);

  if (!structure) {
    throw new Error(`Unknown known structure: ${structureOrId}`);
  }

  return executeKnownStructureMatcher(structure, arb, options);
}

/**
 * @param {Arborist} arb
 * @param {string | typeof knownStructures[number]} structureOrId
 * @param {unknown} match
 */
export function runKnownStructureTransform(arb, structureOrId, match) {
  const structure = resolveKnownStructure(structureOrId);

  if (!structure) {
    throw new Error(`Unknown known structure: ${structureOrId}`);
  }

  return executeKnownStructureTransform(structure, arb, match);
}

/**
 * @param {Arborist} arb
 * @param {string | typeof knownStructures[number]} structureOrId
 * @param {{candidateFilter?: (node: ASTNode) => boolean}} [options={}]
 */
export function runKnownStructureTransformSession(arb, structureOrId, options = {}) {
  const structure = resolveKnownStructure(structureOrId);

  if (!structure) {
    throw new Error(`Unknown known structure: ${structureOrId}`);
  }

  return executeKnownStructureTransformSession(structure, arb, options);
}

export {
  getMatcherRunner,
  getTransformRunner,
  getTransformSessionRunner,
} from './runners.js';

export const restringerSafe = Object.freeze({
  version: restringerPackage.version,
  knownStructureRegistry: structureRegistryDefinitions,
  knownStructures,
  knownStructuresById,
  safeMatchers,
  safeTransforms,
  safeUtils,
  listKnownStructures,
  getKnownStructure,
  describeKnownStructureMatchShape,
  collectKnownStructureMatchNodes,
  normalizeStructureMatch,
  getMatcherRunner,
  getTransformRunner,
  getTransformSessionRunner,
  runKnownStructureMatcher,
  runKnownStructureTransform,
  runKnownStructureTransformSession,
});

export default restringerSafe;
