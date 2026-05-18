
/**
 * @typedef {{
 *   obfuscationIds: string[],
 *   includeApiSurface: boolean,
 *   includeCapabilities: boolean,
 *   skippedNonNoEvalCount: number,
 * }} StructureSelection
 */

/**
 * Resolves which analysis engines to run based on CLI options and the hydrated catalog.
 *
 * Structure id existence and api-surface id misuse are validated here (requires catalog).
 * Returns a StructureSelection or throws a CliValidationError.
 *
 * @param {{
 *   section: string[],
 *   structures: string[],
 *   onlySection: string[],
 *   excludeSection: string[],
 * }} options
 * @param {readonly {id: string, categoryGroup?: string, executionMode?: string, matcherAvailable?: boolean}[]} catalog
 * @returns {StructureSelection}
 */
export function resolveStructureSelection(options, catalog) {
  const hasReportFilters = options.onlySection.length > 0 || options.excludeSection.length > 0;

  if (options.structures.length > 0) {
    return resolveFromStructureIds(options.structures, catalog);
  }

  if (options.section.length > 0) {
    return resolveFromSections(options.section, catalog);
  }

  if (hasReportFilters) {
    return resolveDefaultFullAnalysis(catalog);
  }

  return resolveDefaultFullAnalysis(catalog);
}

function resolveDefaultFullAnalysis(catalog) {
  const obfuscationIds = getRunnableObfuscationIds(catalog);
  const nonRunnable = countNonRunnableInSections(['obfuscation', 'api-surface'], catalog);
  return {
    obfuscationIds,
    includeApiSurface: true,
    includeCapabilities: true,
    skippedNonNoEvalCount: nonRunnable,
  };
}

function resolveFromSections(sections, catalog) {
  const includeObfuscation = sections.includes('obfuscation');
  const includeApiSurface  = sections.includes('api-surface');

  const obfuscationIds = includeObfuscation ? getRunnableObfuscationIds(catalog) : [];
  const nonRunnable = countNonRunnableInSections(sections, catalog);

  return {
    obfuscationIds,
    includeApiSurface,
    includeCapabilities: includeApiSurface,
    skippedNonNoEvalCount: nonRunnable,
  };
}

function resolveFromStructureIds(structureIds, catalog) {
  const catalogById = Object.fromEntries(catalog.map((s) => [s.id, s]));

  for (const id of structureIds) {
    if (!catalogById[id]) {
      const knownIds = catalog.map((s) => s.id).join(', ');
      throw new CliValidationError(`Unknown structure id "${id}". Known ids: ${knownIds}.`);
    }

    if (catalogById[id].categoryGroup === 'api-surface') {
      throw new CliValidationError(
        `Structure id "${id}" is an api-surface detector. ` +
        'Use --section api-surface to run all API surface detectors (v1 limitation).',
      );
    }
  }

  const obfuscationIds = structureIds.filter((id) => {
    const s = catalogById[id];
    return s?.executionMode === 'no-eval' && s?.matcherAvailable !== false;
  });

  const skipped = structureIds.length - obfuscationIds.length;

  return {
    obfuscationIds,
    includeApiSurface: false,
    includeCapabilities: false,
    skippedNonNoEvalCount: skipped,
  };
}

function getRunnableObfuscationIds(catalog) {
  return catalog
    .filter(
      (s) =>
        s.categoryGroup === 'obfuscation' &&
        s.executionMode === 'no-eval' &&
        s.matcherAvailable !== false,
    )
    .map((s) => s.id);
}

function countNonRunnableInSections(sections, catalog) {
  return catalog.filter(
    (s) =>
      sections.includes(s.categoryGroup ?? '') &&
      s.executionMode !== 'no-eval',
  ).length;
}

export class CliValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CliValidationError';
  }
}
