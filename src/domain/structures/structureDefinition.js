/**
 * Runtime/product metadata for a known structure type (detector + transforms), not a
 * detected match and not test-only data.
 *
 * @typedef {object} StructureDefinition
 * @property {string} name Stable catalog id (historically `id` in `catalog.js`).
 * @property {string} label Human-facing title.
 * @property {string} description
 * @property {string} category Primary category slug (for grouping/filtering).
 * @property {string | null} matcherName Safe-module matcher export name, or null if none.
 * @property {string[]} transformNames Registered transform export names for this structure.
 * @property {{
 *   match: boolean,
 *   transform: boolean,
 *   export: boolean,
 *   noEval: boolean,
 * }} capabilities
 * @property {'no-eval' | 'custom-runtime' | 'unknown'} executionMode
 * @property {string | null} searchText Lowercase search blob; null when not computed at rest.
 * @property {{ moduleName: string | null, matcherName: string | null }} implementation
 */

/** Keys allowed on raw rows in `knownStructureRegistry` (runtime catalog only). */
export const KNOWN_STRUCTURE_CATALOG_ROW_KEYS = Object.freeze(
  new Set([
    'id',
    'title',
    'categoryGroup',
    'category',
    'description',
    'codeExample',
    'noEval',
    'executionMode',
    'matcherName',
    'transformName',
    'transformEnabled',
    'moduleName',
  ]),
);

const TEST_OR_FIXTURE_KEY = /^(fixture|fixtures|expects|expected|test|spec|snippet)/iu;

/**
 * @param {string} executionMode
 * @returns {'no-eval' | 'custom-runtime' | 'unknown'}
 */
export function normalizeExecutionModeForContract(executionMode) {
  if (executionMode === 'no-eval') {
    return 'no-eval';
  }

  if (executionMode === 'iframe-sandbox') {
    return 'custom-runtime';
  }

  if (executionMode === 'node-only') {
    return 'unknown';
  }

  return 'unknown';
}

/**
 * @param {object} row
 * @returns {StructureDefinition}
 */
export function buildStructureDefinition(row) {
  const executionMode = normalizeExecutionModeForContract(
    row.executionMode ?? (row.noEval ? 'no-eval' : 'unknown'),
  );
  const transformNames =
    typeof row.transformName === 'string' && row.transformName.length > 0
      ? [row.transformName]
      : [];
  const hasImplementation = Boolean(row.moduleName && row.matcherName);
  const transformCapable = Boolean(row.transformEnabled && transformNames.length && hasImplementation);

  return {
    name: row.id,
    label: row.title,
    description: row.description,
    category: row.category,
    matcherName: typeof row.matcherName === 'string' && row.matcherName.length > 0
      ? row.matcherName
      : null,
    transformNames: Object.freeze([...transformNames]),
    capabilities: Object.freeze({
      match: hasImplementation,
      transform: transformCapable,
      export: executionMode === 'no-eval' && hasImplementation,
      noEval: Boolean(row.noEval ?? executionMode === 'no-eval'),
    }),
    executionMode,
    searchText: null,
    implementation: Object.freeze({
      moduleName: typeof row.moduleName === 'string' && row.moduleName.length > 0
        ? row.moduleName
        : null,
      matcherName: typeof row.matcherName === 'string' && row.matcherName.length > 0
        ? row.matcherName
        : null,
    }),
  };
}

/**
 * @param {unknown} registry
 * @returns {asserts registry is object[]}
 */
export function validateKnownStructureCatalogRegistry(registry) {
  if (!Array.isArray(registry)) {
    throw new Error('knownStructureRegistry must be an array');
  }

  const seenNames = new Set();

  for (const row of registry) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error('Each catalog row must be a plain object');
    }

    for (const key of Object.keys(row)) {
      if (!KNOWN_STRUCTURE_CATALOG_ROW_KEYS.has(key)) {
        throw new Error(
          `Catalog row "${row.id ?? '<unknown>'}" has disallowed key "${key}" ` +
            `(fixtures and test policy belong in tests/fixtures only).`,
        );
      }

      if (TEST_OR_FIXTURE_KEY.test(key)) {
        throw new Error(`Catalog row "${row.id ?? '<unknown>'}" has test/fixture-like key "${key}"`);
      }
    }

    if (typeof row.id !== 'string' || !row.id.length) {
      throw new Error('Each catalog row needs a non-empty string id');
    }

    if (seenNames.has(row.id)) {
      throw new Error(`Duplicate catalog structure name/id: ${row.id}`);
    }

    seenNames.add(row.id);

    if (typeof row.title !== 'string' || !row.title.trim().length) {
      throw new Error(`Catalog row "${row.id}" needs a display label (title)`);
    }

    if (typeof row.category !== 'string' || !row.category.trim().length) {
      throw new Error(`Catalog row "${row.id}" needs a category`);
    }

    if (typeof row.description !== 'string' || !row.description.trim().length) {
      throw new Error(`Catalog row "${row.id}" needs a description`);
    }

    if (typeof row.moduleName !== 'string' || !row.moduleName.length) {
      throw new Error(`Catalog row "${row.id}" needs moduleName (runner mapping)`);
    }

    if (typeof row.matcherName !== 'string' || !row.matcherName.length) {
      throw new Error(`Catalog row "${row.id}" needs matcherName (runner mapping)`);
    }

    if (typeof row.transformName !== 'string') {
      throw new Error(`Catalog row "${row.id}" needs transformName (string)`);
    }

    if (row.transformEnabled && (!row.transformName || !row.transformName.trim().length)) {
      throw new Error(`Catalog row "${row.id}" needs a non-empty transformName when transformEnabled is true`);
    }

    const def = buildStructureDefinition(row);

    if (!def.capabilities.match) {
      throw new Error(`Catalog row "${row.id}" is missing matcher/module mapping for capabilities.match`);
    }

    if (typeof row.transformEnabled === 'boolean' && row.transformEnabled && !def.capabilities.transform) {
      throw new Error(
        `Catalog row "${row.id}" declares transformEnabled but transformNames/implementation do not satisfy transform capability`,
      );
    }
  }
}
