/**
 * Pinia-style store section for API surface analysis.
 *
 * Orchestration (after parse / arborist apply):
 *   runApiDetectors → runInferences → apiDetectorHits / capabilities → sync → highlights
 *
 * @see ../../../domain/apiSurface/syncDetectorHits.js
 */

import {
  apiDetectorRegistry,
  runApiDetectors,
  runInferences,
} from '../../../domain/apiSurface/index.js';
import {syncDetectorHits} from '../../../domain/apiSurface/syncDetectorHits.js';

/**
 * @typedef {import('../../../domain/apiSurface/inferenceEngine.js').InferenceResult} InferenceResult
 * @typedef {import('../../../domain/apiSurface/detectorDefinition.js').DetectorMatch} DetectorMatch
 */

export function createApiSurfaceSection() {
  return {
    /** @type {'idle' | 'running' | 'done'} */
    apiSurfaceStatus: 'idle',

    /**
     * Fired capabilities from the last analysis pass.
     * @type {InferenceResult[]}
     */
    capabilities: [],

    /**
     * Detector hits from the last analysis pass, keyed by detector id.
     * @type {Record<string, DetectorMatch[]>}
     */
    apiDetectorHits: {},

    clearApiSurfaceResults() {
      this.apiSurfaceStatus = 'idle';
      this.capabilities = [];
      this.apiDetectorHits = {};
    },

    syncApiDetectorHitsToKnownStructureMatches() {
      syncDetectorHits(this);
    },

    /**
     * Runs the detector + capability pipeline on the current `arb` and syncs results
     * into known-structure state. Called from Parse, script history, and arborist apply.
     */
    async runApiSurfaceMatcher() {
      const arb = this.arb;
      if (!arb?.ast?.length) {
        this.clearApiSurfaceResults();
        this.syncApiDetectorHitsToKnownStructureMatches();
        this.refreshKnownStructureHighlights();
        return;
      }

      this.apiSurfaceStatus = 'running';

      const detectorResults = runApiDetectors(arb);
      const capabilities = runInferences(detectorResults);

      // Map → plain object so Vue can track per-detector hit lists reactively.
      const hits = {};
      for (const row of apiDetectorRegistry) {
        const matches = detectorResults.get(row.id);
        if (matches?.length) hits[row.id] = matches;
      }

      this.apiDetectorHits = hits;
      this.capabilities = capabilities;
      this.apiSurfaceStatus = 'done';
      this.syncApiDetectorHitsToKnownStructureMatches();
      this.refreshKnownStructureHighlights();
    },
  };
}
