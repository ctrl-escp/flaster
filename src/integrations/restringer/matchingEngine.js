import {loadRestringerIntegration} from './integrationLoader.js';
import {liteKnownStructures} from './knownStructuresLite.js';
import {normalizeStructureMatch as normalizeStructureMatchForStructure} from './normalizers.js';

export {
  collectKnownStructureMatchNodes,
  describeKnownStructureMatchShape,
} from './normalizers.js';

/** @import {Arborist} from '../../flastTypes.js' */

/**
 * @typedef {typeof liteKnownStructures[number]} KnownStructureDescriptor
 */

/**
 * @typedef {Awaited<ReturnType<Awaited<ReturnType<typeof loadRestringerIntegration>>['runKnownStructureMatcher']>>} KnownStructureRun
 */

/**
 * @typedef {KnownStructureRun['matches'][number]} KnownStructureMatch
 */

/**
 * @typedef {{
 *   byStructureId: Record<string, KnownStructureMatch[]>,
 *   byNodeType: Record<string, KnownStructureMatch[]>,
 *   byParentType: Record<string, KnownStructureMatch[]>,
 * }} KnownStructureMatchGroups
 */

/**
 * High-level detection entry point for the store and tests.
 *
 * @param {{
 *   source: string,
 *   arborist: Arborist,
 *   structureIds?: readonly string[],
 *   catalog?: readonly KnownStructureDescriptor[],
 * }} args
 */
export async function detectStructures({source, arborist, structureIds, catalog}) {
  const resolvedSource = typeof source === 'string' ? source : '';
  const arbScript = typeof arborist?.script === 'string' ? arborist.script : null;
  if (arbScript !== null && resolvedSource !== arbScript) {
    throw new Error(
      'detectStructures: `source` must be the same string used to construct `arborist` (arborist.script mismatch).',
    );
  }

  return runKnownStructureMatchingSession(arborist, structureIds, {
    structures: catalog,
  });
}

/**
 * @param {ReadonlyArray<KnownStructureDescriptor>} [structures=liteKnownStructures]
 * @returns {string[]}
 */
export function getDefaultSelectedStructureIds(structures = liteKnownStructures) {
  return structures
    .filter(Boolean)
    .map((structure) => structure.id);
}

/**
 * Lite-catalog lookup used by export resolution before the heavy adapter loads.
 * Pass a structure object through unchanged (API-detector rows, hydrated entries).
 *
 * @param {string | KnownStructureDescriptor | null | undefined} structureOrId
 * @returns {KnownStructureDescriptor | object | null}
 */
export function getKnownStructure(structureOrId) {
  if (!structureOrId) {
    return null;
  }

  if (typeof structureOrId !== 'string') {
    return structureOrId;
  }

  return liteKnownStructures.find((structure) => structure.id === structureOrId) ?? null;
}

/**
 * @param {string | KnownStructureDescriptor} structureOrId
 * @param {unknown} match
 * @param {number} [index=0]
 */
export function normalizeStructureMatch(structureOrId, match, index = 0) {
  const structure = getKnownStructure(structureOrId);

  if (!structure) {
    throw new Error(`Unknown known structure: ${structureOrId}`);
  }

  return normalizeStructureMatchForStructure(structure, match, index);
}

/**
 * @param {ReadonlyArray<KnownStructureDescriptor>} [structures=liteKnownStructures]
 */
export function createKnownStructureState(structures = liteKnownStructures) {
  const availableKnownStructures = [...structures];
  const selectedKnownStructureIds = getDefaultSelectedStructureIds(availableKnownStructures);

  return {
    availableKnownStructures,
    selectedKnownStructureIds,
    activeKnownStructureId: null,
    latestKnownStructureMatches: [],
    knownStructureMatchesById: {},
    knownStructureMatchCounts: {},
    knownStructureExecutionErrors: {},
    knownStructureGroupedMatches: createEmptyMatchGroups(),
    knownStructureExecutionStatus: createExecutionStatus(),
    lastKnownStructureRunIds: [],
  };
}

/**
 * @returns {KnownStructureMatchGroups}
 */
export function createEmptyMatchGroups() {
  return {
    byStructureId: {},
    byNodeType: {},
    byParentType: {},
  };
}

/**
 * @returns {{
 *   state: 'idle' | 'running' | 'complete',
 *   totalStructures: number,
 *   completedStructures: number,
 *   runnableStructures: number,
 *   blockedStructures: number,
 *   totalMatches: number,
 *   lastRunAt: string | null,
 * }}
 */
export function createExecutionStatus() {
  return {
    state: 'idle',
    totalStructures: 0,
    completedStructures: 0,
    runnableStructures: 0,
    blockedStructures: 0,
    totalMatches: 0,
    lastRunAt: null,
  };
}

/**
 * @param {readonly KnownStructureMatch[]} matches
 * @returns {KnownStructureMatchGroups}
 */
export function groupStructureMatches(matches) {
  return matches.reduce((groups, match) => {
    const node = match.relevantNode;
    const nodeType = node?.type ?? 'Unknown';
    const parentType = node?.parentNode?.type ?? 'Unknown';
    pushGroupedMatch(groups.byStructureId, match.structureId, match);
    pushGroupedMatch(groups.byNodeType, nodeType, match);
    pushGroupedMatch(groups.byParentType, parentType, match);
    return groups;
  }, createEmptyMatchGroups());
}

/**
 * @param {Arborist} arb
 * @param {readonly string[]} [structureIds]
 * @param {{
 *   candidateFilter?: (node: KnownStructureMatch['relevantNode']) => boolean,
 *   structures?: readonly KnownStructureDescriptor[],
 * }} [options={}]
 */
export async function runKnownStructureMatchingSession(arb, structureIds, options = {}) {
  const mod = await loadRestringerIntegration();
  const availableStructures = Array.isArray(options.structures) && options.structures.length
    ? options.structures
    : mod.knownStructures;
  const structuresById = Object.fromEntries(availableStructures.map((structure) => [structure.id, structure]));
  const requestedIds = getRequestedStructureIds(structureIds, availableStructures);
  const idsToRun = getRunnableStructureIds(requestedIds, availableStructures);
  const runs = idsToRun.map((structureId) =>
    mod.runKnownStructureMatcher(arb, structuresById[structureId] ?? structureId, options));
  const matches = runs.flatMap((run) => run.matches);
  const groupedMatches = groupStructureMatches(matches);
  const matchCounts = Object.fromEntries(runs.map((run) => [run.structureId, run.count]));
  const errors = Object.fromEntries(runs.map((run) => [run.structureId, run.error]));

  return {
    structureIds: idsToRun,
    skippedStructureIds: requestedIds.filter((structureId) => !idsToRun.includes(structureId)),
    runs,
    matches,
    matchCounts,
    errors,
    groupedMatches,
    totalMatches: matches.length,
    ranAt: new Date().toISOString(),
  };
}

/**
 * @param {readonly string[] | undefined} structureIds
 * @param {ReadonlyArray<KnownStructureDescriptor>} [structures=liteKnownStructures]
 * @returns {string[]}
 */
export function getRequestedStructureIds(structureIds, structures = liteKnownStructures) {
  const structuresById = Object.fromEntries(structures.map((structure) => [structure.id, structure]));
  const requestedIds = Array.isArray(structureIds) && structureIds.length
    ? structureIds
    : getDefaultSelectedStructureIds(structures);

  return [...new Set(requestedIds)].filter((structureId) => !!structuresById[structureId]);
}

/**
 * @param {readonly string[] | undefined} structureIds
 * @param {ReadonlyArray<KnownStructureDescriptor>} [structures=liteKnownStructures]
 * @returns {string[]}
 */
function getRunnableStructureIds(structureIds, structures = liteKnownStructures) {
  const structuresById = Object.fromEntries(structures.map((structure) => [structure.id, structure]));

  return getRequestedStructureIds(structureIds, structures).filter((structureId) => {
    const structure = structuresById[structureId];
    return structure?.executionMode === 'no-eval' && !!structure.matcherAvailable;
  });
}

/**
 * @param {Record<string, KnownStructureMatch[]>} groups
 * @param {string} key
 * @param {KnownStructureMatch} match
 */
function pushGroupedMatch(groups, key, match) {
  if (!groups[key]) {
    groups[key] = [];
  }

  groups[key].push(match);
}
