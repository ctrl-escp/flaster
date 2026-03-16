import {
  getKnownStructure,
  knownStructures,
  listKnownStructures,
  runKnownStructureMatcher,
} from './index.js';

/**
 * @typedef {import('flast/src/arborist.js').Arborist} Arborist
 */

/**
 * @typedef {ReturnType<typeof listKnownStructures>[number]} KnownStructureDescriptor
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
 * Returns the built-in structure IDs that should be selected by default.
 *
 * @param {ReadonlyArray<KnownStructureDescriptor>} [structures=knownStructures]
 * @returns {string[]}
 */
export function getDefaultSelectedStructureIds(structures = knownStructures) {
  return structures
    .filter((structure) => structure.enabledByDefault && structure.matcherAvailable)
    .map((structure) => structure.id);
}

/**
 * Picks the initial active structure ID from the selected or available entries.
 *
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
 * Creates the default store state used for known structure matching.
 *
 * @param {ReadonlyArray<KnownStructureDescriptor>} [structures=knownStructures]
 * @returns {{
 *   availableKnownStructures: KnownStructureDescriptor[],
 *   selectedKnownStructureIds: string[],
 *   activeKnownStructureId: string | null,
 *   latestKnownStructureMatches: KnownStructureMatch[],
 *   knownStructureMatchesById: Record<string, KnownStructureMatch[]>,
 *   knownStructureMatchCounts: Record<string, number>,
 *   knownStructureExecutionErrors: Record<string, Error | null>,
 *   knownStructureGroupedMatches: KnownStructureMatchGroups,
 *   knownStructureExecutionStatus: {
 *     state: 'idle' | 'running' | 'complete',
 *     totalStructures: number,
 *     completedStructures: number,
 *     totalMatches: number,
 *     lastRunAt: string | null,
 *   },
 *   lastKnownStructureRunIds: string[],
 * }}
 */
export function createKnownStructureState(structures = knownStructures) {
  const availableKnownStructures = [...structures];
  const selectedKnownStructureIds = getDefaultSelectedStructureIds(availableKnownStructures);

  return {
    availableKnownStructures,
    selectedKnownStructureIds,
    activeKnownStructureId: getInitialActiveStructureId(
      availableKnownStructures,
      selectedKnownStructureIds,
    ),
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
 * Creates the empty grouped structure used when no matches have been run yet.
 *
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
 * Creates the default execution status object for store initialization and reset.
 *
 * @returns {{
 *   state: 'idle' | 'running' | 'complete',
 *   totalStructures: number,
 *   completedStructures: number,
 *   totalMatches: number,
 *   lastRunAt: string | null,
 * }}
 */
export function createExecutionStatus() {
  return {
    state: 'idle',
    totalStructures: 0,
    completedStructures: 0,
    totalMatches: 0,
    lastRunAt: null,
  };
}

/**
 * Groups normalized matches by structure ID, node type, and parent type.
 *
 * @param {readonly KnownStructureMatch[]} matches
 * @returns {KnownStructureMatchGroups}
 */
export function groupStructureMatches(matches) {
  return matches.reduce((groups, match) => {
    pushGroupedMatch(groups.byStructureId, match.structureId, match);
    pushGroupedMatch(groups.byNodeType, match.type ?? 'Unknown', match);
    pushGroupedMatch(groups.byParentType, match.parentType ?? 'Unknown', match);
    return groups;
  }, createEmptyMatchGroups());
}

/**
 * Runs multiple known structure matchers against the same Arborist instance
 * without mutating the parsed script or AST.
 *
 * @param {Arborist} arb
 * @param {readonly string[]} [structureIds]
 * @param {{candidateFilter?: (node: KnownStructureMatch['node']) => boolean}} [options={}]
 * @returns {{
 *   structureIds: string[],
 *   runs: KnownStructureRun[],
 *   matches: KnownStructureMatch[],
 *   matchCounts: Record<string, number>,
 *   errors: Record<string, Error | null>,
 *   groupedMatches: KnownStructureMatchGroups,
 *   totalMatches: number,
 *   ranAt: string,
 * }}
 */
export function runKnownStructureMatchingSession(arb, structureIds, options = {}) {
  const idsToRun = getRunnableStructureIds(structureIds);
  const runs = idsToRun.map((structureId) => runKnownStructureMatcher(arb, structureId, options));
  const matches = runs.flatMap((run) => run.matches);
  const groupedMatches = groupStructureMatches(matches);
  const matchCounts = Object.fromEntries(runs.map((run) => [run.structureId, run.count]));
  const errors = Object.fromEntries(runs.map((run) => [run.structureId, run.error]));

  return {
    structureIds: idsToRun,
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
 * Normalizes a requested list of structure IDs into a de-duplicated runnable set.
 *
 * @param {readonly string[] | undefined} structureIds
 * @returns {string[]}
 */
export function getRunnableStructureIds(structureIds) {
  const requestedIds = Array.isArray(structureIds) && structureIds.length
    ? structureIds
    : getDefaultSelectedStructureIds();

  return [...new Set(requestedIds)].filter((structureId) => {
    const structure = getKnownStructure(structureId);
    return !!structure?.matcherAvailable;
  });
}

/**
 * Appends a match into a string-keyed grouping map.
 *
 * @param {Record<string, KnownStructureMatch[]>} groups
 * @param {string} key
 * @param {KnownStructureMatch} match
 * @returns {void}
 */
function pushGroupedMatch(groups, key, match) {
  if (!groups[key]) {
    groups[key] = [];
  }

  groups[key].push(match);
}
