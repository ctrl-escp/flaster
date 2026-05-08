/**
 * Export script constants, input normalization, and safety checks for emitted code.
 */

export const GENERATED_HEADER = '// Generated via flASTer (https://ctrl-escp.github.io/flaster)';

/**
 * Filters pipeline steps to those emitted as active in the generated script.
 *
 * @param {readonly unknown[] | undefined} steps
 * @returns {unknown[]}
 */
function normalizeStepsForExport(steps) {
  return Array.isArray(steps) ? steps.filter((step) => step?.enabled !== false) : [];
}

/**
 * @param {{
 *   steps?: readonly unknown[],
 *   combineFilters?: (filters: string[]) => string,
 *   resolveStructureFilter?: (structureId: string) => string,
 * }} [options]
 */
export function normalizeExportComposeOptions(options = {}) {
  const steps = normalizeStepsForExport(options.steps);
  const combineFilters = typeof options.combineFilters === 'function'
    ? options.combineFilters
    : createFallbackFilterCombiner;
  const resolveStructureFilter = typeof options.resolveStructureFilter === 'function'
    ? options.resolveStructureFilter
    : () => '';

  return {steps, combineFilters, resolveStructureFilter};
}

/**
 * Patterns that must not appear in emitted pipeline scripts (regression guard).
 *
 * @param {string} script
 * @param {string} [contextLabel]
 * @throws {Error}
 */
export function assertNoExportScriptPlaceholders(script, contextLabel = 'generated export script') {
  const checks = [
    {re: /TODO\s*\(\s*Stage\s+\d+/i, hint: 'staged TODO placeholder'},
    {re: /\bTODO\b/i, hint: 'TODO marker'},
    {re: /\bFIXME\b/i, hint: 'FIXME marker'},
    {re: /\bHACK\b/i, hint: 'HACK marker'},
  ];

  for (const {re, hint} of checks) {
    if (re.test(script)) {
      throw new Error(`${contextLabel} must not contain ${hint}`);
    }
  }
}

/** Substrings that indicate accidental browser-environment leakage into Node output. */
const BROWSER_GLOBAL_MARKERS = ['window.', 'document.', 'navigator.', 'location.'];

/**
 * @param {string} script
 * @throws {Error}
 */
export function assertNoBrowserOnlyGlobalsInExport(script) {
  for (const marker of BROWSER_GLOBAL_MARKERS) {
    if (script.includes(marker)) {
      throw new Error(`Generated export script must not reference browser global pattern: ${marker}`);
    }
  }
}

/**
 * Creates the fallback filter combiner used when no store helper is provided.
 *
 * @param {string[]} filters
 * @returns {string}
 */
function createFallbackFilterCombiner(filters) {
  if (!filters.length) {
    return 'true';
  }

  let filterSrc = `(${filters[0]})\n`;

  for (const filter of filters.slice(1)) {
    filterSrc += ` && (${filter})\n`;
  }

  return filterSrc;
}

/**
 * Removes leading comment-only lines from a seeded filter snippet so exported
 * code uses only the executable predicate text.
 *
 * @param {string} source
 * @returns {string}
 */
export function stripLeadingComments(source) {
  return String(source || '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.length && !trimmed.startsWith('//');
    })
    .join('\n')
    .trim();
}

/**
 * @param {string[]} values
 * @returns {string[]}
 */
export function sortStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}
