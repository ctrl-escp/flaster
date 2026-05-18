import {groupStructureMatches} from '../../integrations/restringer/index.js';

/**
 * Creates a headless duck-type store compatible with `buildReportModel` and the sync/enrich pipeline.
 * No Vue/Pinia. Mirrors the shape expected by domain report collectors and capabilityMatches.
 *
 * @param {{
 *   availableKnownStructures: readonly {id: string, categoryGroup?: string}[],
 * }} catalog
 * @returns {object}
 */
export function createAnalysisStore(catalog) {
  const availableKnownStructures = Array.from(catalog.availableKnownStructures);
  const knownStructuresById = Object.fromEntries(
    availableKnownStructures.map((s) => [s.id, s]),
  );

  return {
    arb: null,

    availableKnownStructures,

    latestKnownStructureMatches: [],
    knownStructureMatchesById: {},
    knownStructureMatchCounts: {},
    knownStructureExecutionErrors: {},
    knownStructureGroupedMatches: groupStructureMatches([]),
    knownStructureExecutionStatus: {state: 'idle', totalMatches: 0, lastRunAt: null},

    apiSurfaceStatus: 'idle',
    apiDetectorHits: {},
    capabilities: [],

    getKnownStructureById(id) {
      return knownStructuresById[id] ?? null;
    },

    getKnownStructureMatches(structureId) {
      return this.knownStructureMatchesById[structureId] ?? [];
    },
  };
}
