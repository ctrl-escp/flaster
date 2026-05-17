import {groupStructureMatches} from '../../integrations/restringer/matchingEngine.js';
import {normalizeStructureMatch} from '../../integrations/restringer/normalizers.js';
import {apiDetectorRegistry} from './detectorRegistry.js';

/**
 * Merges API detector hits into the known-structure match store so API patterns
 * appear in Structure Explorer and Explore Nodes alongside REstringer results.
 *
 * @param {{
 *   availableKnownStructures: readonly {id: string, categoryGroup?: string}[],
 *   latestKnownStructureMatches: {structureId: string}[],
 *   knownStructureMatchesById: Record<string, unknown[]>,
 *   knownStructureMatchCounts: Record<string, number>,
 *   knownStructureExecutionErrors: Record<string, unknown>,
 *   knownStructureExecutionStatus: {totalMatches?: number, lastRunAt?: string | null, [key: string]: unknown},
 *   apiDetectorHits: Record<string, unknown[]>,
 *   getKnownStructureById: (id: string) => {id: string} | null,
 * }} storeSlice
 */
export function syncApiDetectorHitsToKnownStructureMatches(storeSlice) {
  const apiStructureIds = new Set(
    storeSlice.availableKnownStructures
      .filter((structure) => structure.categoryGroup === 'api-interaction')
      .map((structure) => structure.id),
  );

  if (!apiStructureIds.size) {
    return;
  }

  const retainedMatches = storeSlice.latestKnownStructureMatches.filter(
    (match) => !apiStructureIds.has(match.structureId),
  );
  const retainedMatchesById = Object.fromEntries(
    Object.entries(storeSlice.knownStructureMatchesById).filter(
      ([structureId]) => !apiStructureIds.has(structureId),
    ),
  );
  const retainedCounts = Object.fromEntries(
    Object.entries(storeSlice.knownStructureMatchCounts).filter(
      ([structureId]) => !apiStructureIds.has(structureId),
    ),
  );
  const retainedErrors = Object.fromEntries(
    Object.entries(storeSlice.knownStructureExecutionErrors).filter(
      ([structureId]) => !apiStructureIds.has(structureId),
    ),
  );

  const apiMatches = [];
  const apiMatchesById = {};
  const apiCounts = {};

  for (const row of apiDetectorRegistry) {
    const rawMatches = storeSlice.apiDetectorHits[row.id];
    if (!rawMatches?.length) {
      continue;
    }

    const structure = storeSlice.getKnownStructureById(row.id);
    if (!structure) {
      continue;
    }

    const normalized = rawMatches.map((match, index) =>
      normalizeStructureMatch(structure, match, index),
    );
    apiMatchesById[row.id] = normalized;
    apiCounts[row.id] = normalized.length;
    apiMatches.push(...normalized);
  }

  const latestKnownStructureMatches = [...retainedMatches, ...apiMatches];

  storeSlice.latestKnownStructureMatches = latestKnownStructureMatches;
  storeSlice.knownStructureMatchesById = {...retainedMatchesById, ...apiMatchesById};
  storeSlice.knownStructureMatchCounts = {...retainedCounts, ...apiCounts};
  storeSlice.knownStructureExecutionErrors = retainedErrors;
  storeSlice.knownStructureGroupedMatches = groupStructureMatches(latestKnownStructureMatches);
  storeSlice.knownStructureExecutionStatus = {
    ...storeSlice.knownStructureExecutionStatus,
    totalMatches: latestKnownStructureMatches.length,
    lastRunAt: storeSlice.knownStructureExecutionStatus.lastRunAt ?? new Date().toISOString(),
  };
}
