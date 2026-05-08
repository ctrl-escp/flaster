import {
  knownStructures,
  runKnownStructureMatcher,
} from './index.js';

/**
 * @typedef {import('flast/src/arborist.js').Arborist} Arborist
 */

/**
 * @typedef {typeof knownStructures[number]} KnownStructureDescriptor
 */

/**
 * @typedef {ReturnType<typeof runKnownStructureMatcher>} KnownStructureRun
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
export function detectStructures({source, arborist, structureIds, catalog}) {
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
 * @param {ReadonlyArray<KnownStructureDescriptor>} [structures=knownStructures]
 * @returns {string[]}
 */
export function getDefaultSelectedStructureIds(structures = knownStructures) {
  return structures
    .filter(Boolean)
    .map((structure) => structure.id);
}

/**
 * @param {ReadonlyArray<KnownStructureDescriptor>} [structures=knownStructures]
 * @param {readonly string[]} [selectedStructureIds]
 * @returns {string|null}
 */
export function getInitialActiveStructureId(
  structures = knownStructures,
  selectedStructureIds = getDefaultSelectedStructureIds(structures),
) {
  return selectedStructureIds[0] ?? structures[0]?.id ?? null;
}

/**
 * @param {ReadonlyArray<KnownStructureDescriptor>} [structures=knownStructures]
 */
export function createKnownStructureState(structures = knownStructures) {
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
export function runKnownStructureMatchingSession(arb, structureIds, options = {}) {
  const availableStructures = Array.isArray(options.structures) && options.structures.length
    ? options.structures
    : knownStructures;
  const structuresById = Object.fromEntries(availableStructures.map((structure) => [structure.id, structure]));
  const requestedIds = getRequestedStructureIds(structureIds, availableStructures);
  const idsToRun = getRunnableStructureIds(requestedIds, availableStructures);
  const runs = idsToRun.map((structureId) =>
    runKnownStructureMatcher(arb, structuresById[structureId] ?? structureId, options));
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
 * @param {ReadonlyArray<KnownStructureDescriptor>} [structures=knownStructures]
 * @returns {string[]}
 */
export function getRequestedStructureIds(structureIds, structures = knownStructures) {
  const structuresById = Object.fromEntries(structures.map((structure) => [structure.id, structure]));
  const requestedIds = Array.isArray(structureIds) && structureIds.length
    ? structureIds
    : getDefaultSelectedStructureIds(structures);

  return [...new Set(requestedIds)].filter((structureId) => !!structuresById[structureId]);
}

/**
 * @param {readonly string[] | undefined} structureIds
 * @param {ReadonlyArray<KnownStructureDescriptor>} [structures=knownStructures]
 * @returns {string[]}
 */
export function getRunnableStructureIds(structureIds, structures = knownStructures) {
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
