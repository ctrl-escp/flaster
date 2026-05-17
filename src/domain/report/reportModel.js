import {reportSectionRegistry} from './reportSectionRegistry.js';
import {resolveReportStatus} from './reportCollectors.js';

/**
 * @typedef {import('./reportCollectors.js').ReportStatus} ReportStatus
 */

/**
 * @typedef {import('./reportCollectors.js').ReportFinding} ReportFinding
 */

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   helperCopy: string,
 *   findings: ReportFinding[],
 * }} ReportSection
 */

/**
 * @typedef {{
 *   status: ReportStatus,
 *   totalFindings: number,
 *   sections: ReportSection[],
 * }} ReportModel
 */

/**
 * Aggregates registered report sections for the Report panel.
 *
 * @param {object} store
 * @returns {ReportModel}
 */
export function buildReportModel(store) {
  const status = resolveReportStatus(store);
  const context = {store, status};
  const sections = [];

  for (let i = 0; i < reportSectionRegistry.length; i++) {
    const definition = reportSectionRegistry[i];
    const findings = definition.collect(context);
    if (findings.length) {
      sections.push({
        id: definition.id,
        title: definition.title,
        helperCopy: definition.helperCopy,
        findings,
      });
    }
  }

  const totalFindings = sections.reduce((sum, section) => sum + section.findings.length, 0);

  return {status, totalFindings, sections};
}
