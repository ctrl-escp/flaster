/**
 * Applies --only-section / --exclude-section filters to a built report model.
 * Returns a new sections array (does not mutate the model).
 *
 * @param {import('../../domain/report/reportModel.js').ReportSection[]} sections
 * @param {{ onlySection: string[], excludeSection: string[] }} options
 * @returns {import('../../domain/report/reportModel.js').ReportSection[]}
 */
export function resolveReportSections(sections, options) {
  if (options.onlySection.length > 0) {
    return sections.filter((s) => options.onlySection.includes(s.id));
  }

  if (options.excludeSection.length > 0) {
    return sections.filter((s) => !options.excludeSection.includes(s.id));
  }

  return sections;
}
