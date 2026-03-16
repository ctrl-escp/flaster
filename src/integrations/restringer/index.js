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
import {knownStructureRegistry} from './registry.js';

/**
 * @typedef {import('flast/src/arborist.js').Arborist} Arborist
 */

/**
 * @typedef {import('flast/src/types.js').ASTNode} ASTNode
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

export const knownStructures = Object.freeze(
  structureRegistryDefinitions.map((definition) => {
    const matcher = getSafeModuleMember(definition.moduleName, definition.matcherName);
    const transform = getSafeModuleMember(definition.moduleName, definition.transformName);

    return Object.freeze({
      id: definition.id,
      title: definition.title,
      category: definition.category,
      description: definition.description,
      tags: freezeArray(definition.tags),
      searchTerms: freezeArray(definition.searchTerms),
      searchText: createSearchText(definition),
      browserSafe: definition.browserSafe,
      experimental: definition.experimental,
      enabledByDefault: definition.enabledByDefault,
      matcher,
      matcherAvailable: typeof matcher === 'function',
      transform,
      transformAvailable: typeof transform === 'function',
      transformEnabled: definition.transformEnabled && typeof transform === 'function',
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
      .filter((structure) => structure.transformAvailable)
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

  if (!structure.matcherAvailable) {
    throw new Error(`Known structure ${structure.id} does not have an available matcher`);
  }

  const candidateFilter = typeof options.candidateFilter === 'function'
    ? options.candidateFilter
    : () => true;

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

  if (!structure.transformAvailable) {
    throw new Error(`Known structure ${structure.id} does not have an available transform`);
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

export const restringerBrowser = Object.freeze({
  knownStructureRegistry: structureRegistryDefinitions,
  knownStructures,
  knownStructuresById,
  safeMatchers,
  safeTransforms,
  safeUtils,
  listKnownStructures,
  getKnownStructure,
  normalizeStructureMatch,
  runKnownStructureMatcher,
  runKnownStructureTransform,
});

export default restringerBrowser;
