/**
 * Capability engine — evaluates registered capability patterns against a completed detector pass.
 *
 * For each row in `apiInferenceRegistry`, all `requires` clauses are tested against
 * the detector results. A capability fires only when every clause passes.
 *
 * Clause evaluation — a detector "fired" when it has at least one match:
 *   mode 'any' + minCount N  →  at least N distinct detectors in the list fired
 *   mode 'all'               →  every detector in the list fired (minCount ignored)
 *
 * @typedef {import('./detectorDefinition.js').DetectorMatch} DetectorMatch
 * @typedef {Map<string, DetectorMatch[]>} DetectorResults
 *
 * @typedef {object} InferenceResult
 * @property {string} id
 * @property {string} title
 * @property {string} category
 * @property {import('./inferenceDefinition.js').InferenceRisk} risk
 * @property {string} riskReason
 * @property {string} description
 * @property {string[]} firedDetectorIds  Which detectors contributed to this capability firing.
 */

import {apiInferenceRegistry} from './inferenceRegistry.js';

/**
 * @param {import('./inferenceDefinition.js').RequirementClause} clause
 * @param {DetectorResults} detectorResults
 * @returns {{ passes: boolean, firedIds: string[] }}
 */
function evaluateClause(clause, detectorResults) {
  const ids = clause.detectorIds;
  const len = ids.length;
  const firedIds = [];

  for (let i = 0; i < len; i++) {
    if (detectorResults.has(ids[i])) firedIds.push(ids[i]);
  }

  if (clause.mode === 'all') {
    const passes = firedIds.length === len;
    return {passes, firedIds: passes ? firedIds : []};
  }

  // mode 'any': at least minCount distinct detectors from the list must have fired
  const passes = firedIds.length >= (clause.minCount ?? 1);
  return {passes, firedIds: passes ? firedIds : []};
}

/**
 * Evaluates all registered capability patterns against a detector result set.
 *
 * @param {DetectorResults} detectorResults
 * @returns {InferenceResult[]}
 */
export function runInferences(detectorResults) {
  /** @type {InferenceResult[]} */
  const fired = [];

  const clauses = apiInferenceRegistry;
  const regLen = clauses.length;
  for (let p = 0; p < regLen; p++) {
    const row = clauses[p];
    const requires = row.requires;
    const reqLen = requires.length;
    /** @type {Set<string>} */
    const firedSet = new Set();
    let allClausesPassed = true;

    // Every clause must pass; firedDetectorIds accumulates contributing detectors across clauses.
    for (let i = 0; i < reqLen; i++) {
      const {passes, firedIds} = evaluateClause(requires[i], detectorResults);
      if (!passes) {
        allClausesPassed = false;
        break;
      }
      for (let j = 0; j < firedIds.length; j++) firedSet.add(firedIds[j]);
    }

    if (!allClausesPassed) continue;

    fired.push({
      id: row.id,
      title: row.title,
      category: row.category,
      risk: row.risk,
      riskReason: row.riskReason,
      description: row.description,
      firedDetectorIds: [...firedSet],
    });
  }

  return fired;
}
