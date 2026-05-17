/**
 * A capability — derived from one or more atomic detector hits rather than
 * a direct AST match. Capabilities are never run directly against the AST; the capability
 * engine (`inferenceEngine.js`) evaluates them after the detector pass completes.
 *
 * Requirement clauses (RequirementClause) define what detector hits are needed:
 *   { detectorIds: string[], mode: 'any' | 'all', minCount?: number }
 *   - mode 'any': at least minCount distinct detectors from the list must have fired
 *   - mode 'all': every listed detector must have fired (minCount ignored)
 *   minCount defaults to 1. A detector "fired" when it produced at least one match.
 *
 * All clauses in the `requires` array must be satisfied for the capability to fire.
 *
 * @typedef {'risky' | 'benign'} InferenceRisk
 * @typedef {'co-occurrence' | 'value-pattern' | 'frequency'} InferenceKind
 *
 * @typedef {object} RequirementClause
 * @property {string[]} detectorIds
 * @property {'any' | 'all'} mode
 * @property {number} [minCount]
 *
 * @typedef {object} ApiInferenceRow
 * @property {string} id
 * @property {string} title
 * @property {string} categoryGroup    Always 'capabilities'.
 * @property {string} category         Subgroup slug (anti-debugging, fingerprinting, tracking, …).
 * @property {InferenceRisk} risk      Whether the pattern poses a privacy or security risk.
 * @property {string} riskReason       Plain-language explanation of why this is or isn't risky.
 * @property {InferenceKind} inferenceKind
 * @property {string} description
 * @property {RequirementClause[]} requires  All clauses must pass for the capability to fire.
 */

const VALID_RISKS = new Set(['risky', 'benign']);
const VALID_INFERENCE_KINDS = new Set(['co-occurrence', 'value-pattern', 'frequency']);
const VALID_CLAUSE_MODES = new Set(['any', 'all']);

/**
 * @param {unknown[]} registry
 * @param {Set<string>} detectorIds  Known detector ids for cross-reference validation.
 * @returns {asserts registry is ApiInferenceRow[]}
 */
export function validateApiInferenceRegistry(registry, detectorIds) {
  if (!Array.isArray(registry)) {
    throw new Error('Capability registry must be an array');
  }

  const seenIds = new Set();

  for (const row of registry) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error('Each capability row must be a plain object');
    }

    for (const key of ['id', 'title', 'category', 'risk', 'riskReason', 'inferenceKind', 'description']) {
      if (typeof row[key] !== 'string' || !row[key].trim().length) {
        throw new Error(`Capability row "${row.id ?? '<unknown>'}" needs a non-empty string for "${key}"`);
      }
    }

    if (!VALID_RISKS.has(row.risk)) {
      throw new Error(
        `Capability row "${row.id}" has invalid risk "${row.risk}". ` +
          `Valid: ${[...VALID_RISKS].join(', ')}`,
      );
    }

    if (!VALID_INFERENCE_KINDS.has(row.inferenceKind)) {
      throw new Error(
        `Capability row "${row.id}" has invalid inferenceKind "${row.inferenceKind}". ` +
          `Valid: ${[...VALID_INFERENCE_KINDS].join(', ')}`,
      );
    }

    if (row.categoryGroup !== undefined && row.categoryGroup !== 'capabilities') {
      throw new Error(`Capability row "${row.id}" must not override categoryGroup`);
    }

    if (!Array.isArray(row.requires) || row.requires.length === 0) {
      throw new Error(`Capability row "${row.id}" needs a non-empty requires array`);
    }

    for (const clause of row.requires) {
      if (!Array.isArray(clause.detectorIds) || clause.detectorIds.length === 0) {
        throw new Error(`Capability row "${row.id}" has a clause with empty detectorIds`);
      }

      if (!VALID_CLAUSE_MODES.has(clause.mode)) {
        throw new Error(
          `Capability row "${row.id}" has clause with invalid mode "${clause.mode}". Valid: any, all`,
        );
      }

      if (clause.minCount !== undefined && (typeof clause.minCount !== 'number' || clause.minCount < 1)) {
        throw new Error(`Capability row "${row.id}" has clause with invalid minCount (must be ≥ 1)`);
      }

      if (detectorIds) {
        for (const did of clause.detectorIds) {
          if (!detectorIds.has(did)) {
            throw new Error(
              `Capability row "${row.id}" references unknown detector id "${did}"`,
            );
          }
        }
      }
    }

    if (seenIds.has(row.id)) {
      throw new Error(`Duplicate capability id: ${row.id}`);
    }

    seenIds.add(row.id);
  }
}
