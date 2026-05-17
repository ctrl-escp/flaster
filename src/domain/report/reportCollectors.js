/** @import {ApiDetectorRow} from '../apiSurface/detectorRegistry.js' */

import {apiDetectorRegistry} from '../apiSurface/detectorRegistry.js';

/**
 * @typedef {{
 *   role: string,
 *   values: string[],
 * }} ReportExtractionGroup
 */

/**
 * @typedef {'idle' | 'running' | 'done'} ReportStatus
 */

/**
 * @typedef {{
 *   id: string,
 *   kind: 'capability',
 *   title: string,
 *   description: string,
 *   risk: string,
 *   riskReason: string,
 *   firedDetectorIds: string[],
 * }} CapabilityReportFinding
 */

/**
 * @typedef {{
 *   id: string,
 *   kind: 'structure',
 *   structureId: string,
 *   title: string,
 *   category: string,
 *   description?: string,
 *   matchCount: number,
 *   extractions?: ReportExtractionGroup[],
 * }} StructureReportFinding
 */

/**
 * @typedef {CapabilityReportFinding | StructureReportFinding} ReportFinding
 */

/**
 * @param {object} store
 * @returns {ReportStatus}
 */
export function resolveReportStatus(store) {
  if (!Array.isArray(store.arb?.ast) || !store.arb.ast.length) {
    return 'idle';
  }

  if (store.knownStructureExecutionStatus?.state === 'running' ||
    store.apiSurfaceStatus === 'running') {
    return 'running';
  }

  return 'done';
}

/**
 * @param {readonly { extractions?: Record<string, { values?: string[] }> }[]} matches
 * @returns {ReportExtractionGroup[]}
 */
export function mergeDetectorExtractions(matches) {
  const byRole = {};

  for (let i = 0; i < matches.length; i++) {
    const extractions = matches[i].extractions;
    if (!extractions) {
      continue;
    }

    const roles = Object.keys(extractions);
    for (let j = 0; j < roles.length; j++) {
      const role = roles[j];
      const slot = extractions[role];
      if (!byRole[role]) {
        byRole[role] = new Set();
      }
      for (let p = 0; p < (slot.values?.length ?? 0); p++) {
        byRole[role].add(slot.values[p]);
      }
    }
  }

  return Object.entries(byRole)
    .map(([role, vals]) => ({role, values: [...vals]}))
    .filter((entry) => entry.values.length > 0);
}

/**
 * @param {object} store
 * @param {string} categoryGroup
 * @returns {StructureReportFinding[]}
 */
export function collectStructureFindingsForGroup(store, categoryGroup) {
  const structures = store.availableKnownStructures ?? [];
  const findings = [];

  for (let i = 0; i < structures.length; i++) {
    const structure = structures[i];
    if ((structure.categoryGroup ?? 'obfuscation') !== categoryGroup) {
      continue;
    }

    const matches = store.getKnownStructureMatches(structure.id);
    if (!matches.length) {
      continue;
    }

    findings.push({
      id: structure.id,
      kind: 'structure',
      structureId: structure.id,
      title: structure.title,
      category: structure.category,
      description: structure.description,
      matchCount: matches.length,
    });
  }

  return findings.sort((left, right) => left.title.localeCompare(right.title));
}

/**
 * @param {object} store
 * @returns {StructureReportFinding[]}
 */
export function collectApiSurfaceFindings(store) {
  const hits = store.apiDetectorHits ?? {};
  const findings = [];

  for (let i = 0; i < apiDetectorRegistry.length; i++) {
    /** @type {ApiDetectorRow} */
    const row = apiDetectorRegistry[i];
    const matches = hits[row.id];
    if (!matches?.length) {
      continue;
    }

    findings.push({
      id: row.id,
      kind: 'structure',
      structureId: row.id,
      title: row.title,
      category: row.category,
      description: row.description,
      matchCount: store.getKnownStructureMatches(row.id).length || matches.length,
      extractions: mergeDetectorExtractions(matches),
    });
  }

  return findings;
}

/**
 * @param {object} store
 * @returns {CapabilityReportFinding[]}
 */
export function collectCapabilityFindings(store) {
  const capabilities = store.capabilities ?? [];

  return capabilities.map((cap) => ({
    id: cap.id,
    kind: 'capability',
    title: cap.title,
    description: cap.description,
    risk: cap.risk,
    riskReason: cap.riskReason,
    firedDetectorIds: cap.firedDetectorIds ?? [],
  }));
}
