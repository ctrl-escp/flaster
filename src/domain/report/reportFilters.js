/**
 * @typedef {'obfuscation' | 'api-surface'} ReportFilterId
 */

/** @type {{ id: ReportFilterId, label: string }[]} */
export const REPORT_FILTER_OPTIONS = [
  {id: 'obfuscation', label: 'Obfuscation'},
  {id: 'api-surface', label: 'API Surface'},
];

/**
 * @param {readonly { filterId: ReportFilterId, findings: unknown[] }[]} sections
 * @param {ReportFilterId} filterId
 */
export function countFindingsForFilter(sections, filterId) {
  let total = 0;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (section.filterId === filterId) {
      total += section.findings.length;
    }
  }

  return total;
}

/**
 * @param {readonly { filterId: ReportFilterId }[]} sections
 * @param {Set<ReportFilterId>} enabledFilters
 */
export function filterReportSections(sections, enabledFilters) {
  return sections.filter((section) => enabledFilters.has(section.filterId));
}
