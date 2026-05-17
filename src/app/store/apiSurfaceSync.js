/**
 * Bridges API detector hits into the shared known-structure match store.
 *
 * REstringer matching and API detection run separately; this module is the join step
 * so Structure Explorer / Explore Nodes can treat API detectors like any other structure.
 * Invoked from `runApiSurfaceMatcher()` after each detector pass (and on clear).
 */

import {
  groupStructureMatches,
  normalizeStructureMatch,
} from '../../integrations/restringer/index.js';
import {apiDetectorRegistry} from '../../domain/apiSurface/detectorRegistry.js';

/**
 * Merges API detector hits into the known-structure match store so API patterns
 * appear in Structure Explorer and Explore Nodes alongside REstringer results.
 *
 * Strategy: strip all prior matches for structures with `categoryGroup === 'api-surface'`,
 * then rebuild from `store.apiDetectorHits` so re-parsing does not leave stale API rows.
 * REstringer-owned structures are left untouched.
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
 * }} store
 */
export function syncApiDetectorHitsToKnownStructureMatches(store) {
  const apiStructureIds = new Set(
    store.availableKnownStructures
      .filter((structure) => structure.categoryGroup === 'api-surface')
      .map((structure) => structure.id),
  );

  if (!apiStructureIds.size) {
    return;
  }

  // Phase 1 — drop prior api-surface rows from the last combined match snapshot.
  const retainedMatches = store.latestKnownStructureMatches.filter(
    (match) => !apiStructureIds.has(match.structureId),
  );
  const retainedMatchesById = Object.fromEntries(
    Object.entries(store.knownStructureMatchesById).filter(
      ([structureId]) => !apiStructureIds.has(structureId),
    ),
  );
  const retainedCounts = Object.fromEntries(
    Object.entries(store.knownStructureMatchCounts).filter(
      ([structureId]) => !apiStructureIds.has(structureId),
    ),
  );
  const retainedErrors = Object.fromEntries(
    Object.entries(store.knownStructureExecutionErrors).filter(
      ([structureId]) => !apiStructureIds.has(structureId),
    ),
  );

  // Phase 2 — normalize current hits (same shape as REstringer matches for highlighting).
  const apiMatches = [];
  const apiMatchesById = {};
  const apiCounts = {};

  for (const row of apiDetectorRegistry) {
    const rawMatches = store.apiDetectorHits[row.id];
    if (!rawMatches?.length) {
      continue;
    }

    const structure = store.getKnownStructureById(row.id);
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

  // Phase 3 — merge and refresh derived store fields used by the explorer UI.
  const latestKnownStructureMatches = [...retainedMatches, ...apiMatches];

  store.latestKnownStructureMatches = latestKnownStructureMatches;
  store.knownStructureMatchesById = {...retainedMatchesById, ...apiMatchesById};
  store.knownStructureMatchCounts = {...retainedCounts, ...apiCounts};
  store.knownStructureExecutionErrors = retainedErrors;
  store.knownStructureGroupedMatches = groupStructureMatches(latestKnownStructureMatches);
  store.knownStructureExecutionStatus = {
    ...store.knownStructureExecutionStatus,
    totalMatches: latestKnownStructureMatches.length,
    lastRunAt: store.knownStructureExecutionStatus.lastRunAt ?? new Date().toISOString(),
  };
}
