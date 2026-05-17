/**
 * Pinia-style store section for API interaction analysis.
 *
 * Orchestration (after parse / arborist apply):
 *   runApiDetectors → runInferences → apiDetectorHits / apiInferences → sync → highlights
 *
 * @see ../apiInteractionSync.js
 */

import {
  apiDetectorRegistry,
  runApiDetectors,
  runInferences,
} from '../../../domain/apiInteractions/index.js';
import {syncApiDetectorHitsToKnownStructureMatches} from '../apiInteractionSync.js';

/**
 * @typedef {import('../../../domain/apiInteractions/inferenceEngine.js').InferenceResult} InferenceResult
 * @typedef {import('../../../domain/apiInteractions/detectorDefinition.js').DetectorMatch} DetectorMatch
 */

export function createApiInteractionsSection() {
  return {
    /** @type {'idle' | 'running' | 'done'} */
    apiInteractionsStatus: 'idle',

    /**
     * Fired inferences from the last analysis pass.
     * @type {InferenceResult[]}
     */
    apiInferences: [],

    /**
     * Detector hits from the last analysis pass, keyed by detector id.
     * @type {Record<string, DetectorMatch[]>}
     */
    apiDetectorHits: {},

    clearApiInteractionResults() {
      this.apiInteractionsStatus = 'idle';
      this.apiInferences = [];
      this.apiDetectorHits = {};
    },

    syncApiDetectorHitsToKnownStructureMatches() {
      syncApiDetectorHitsToKnownStructureMatches(this);
    },

    /**
     * Runs the detector + inference pipeline on the current `arb` and syncs results
     * into known-structure state. Called from Parse, script history, and arborist apply.
     */
    async runApiInteractionsMatcher() {
      const arb = this.arb;
      if (!arb?.ast?.length) {
        this.clearApiInteractionResults();
        this.syncApiDetectorHitsToKnownStructureMatches();
        this.refreshKnownStructureHighlights();
        return;
      }

      this.apiInteractionsStatus = 'running';

      const detectorResults = runApiDetectors(arb);
      const inferences = runInferences(detectorResults);

      // Map → plain object so Vue can track per-detector hit lists reactively.
      const hits = {};
      for (const row of apiDetectorRegistry) {
        const matches = detectorResults.get(row.id);
        if (matches?.length) hits[row.id] = matches;
      }

      this.apiDetectorHits = hits;
      this.apiInferences = inferences;
      this.apiInteractionsStatus = 'done';
      this.syncApiDetectorHitsToKnownStructureMatches();
      this.refreshKnownStructureHighlights();
    },
  };
}
