import {runApiDetectors} from '../../../domain/apiInteractions/matchingEngine.js';
import {runInferences} from '../../../domain/apiInteractions/inferenceEngine.js';
import {apiDetectorRegistry} from '../../../domain/apiInteractions/detectorRegistry.js';
import {syncApiDetectorHitsToKnownStructureMatches} from '../../../domain/apiInteractions/syncKnownStructureMatches.js';

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
