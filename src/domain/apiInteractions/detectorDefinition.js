/**
 * A single atomic API-interaction detector — describes one specific browser/JS API
 * surface and how it's accessed. Matchers are not stored here; this is catalog-only.
 *
 * @typedef {'property-read' | 'property-write' | 'method-call' | 'constructor'} ApiKind
 *
 * @typedef {object} ApiDetectorRow
 * @property {string} id               Stable catalog key.
 * @property {string} title            Human-facing name.
 * @property {string} categoryGroup    Always 'api-interaction'.
 * @property {string} category         Subgroup slug (window-geometry, storage, canvas, …).
 * @property {string} apiObject        Receiver name (window, document, localStorage, …).
 * @property {string} apiName          Property or method name (innerWidth, setItem, …).
 * @property {ApiKind} apiKind         How the API is accessed.
 * @property {string} description
 * @property {string[]} extractionRoles  Role names this detector may return (e.g. ['key'], ['context-type','attributes']).
 *                                       Empty when the detector is purely structural (no values extracted).
 */

/**
 * A single named extraction slot. The role (e.g. 'key', 'context-type', 'url') is the
 * key in the extractions map, not a field on the object itself.
 *
 * @typedef {object} DetectorExtractionSlot
 * @property {string[]} values  Statically resolved strings. Empty when not resolvable.
 * @property {import('flast/src/types.js').ASTNode[]} nodes  Contributing AST nodes.
 */

/**
 * The return value of a matcher function.
 * `node` is the primary matched AST node (used for source location / highlighting).
 * `extractions` maps role names to their data slots — e.g. `{ 'key': { values, nodes } }`.
 * An empty object means the match is purely structural with nothing to extract.
 *
 * @typedef {object} DetectorMatch
 * @property {import('flast/src/types.js').ASTNode} node
 * @property {Record<string, DetectorExtractionSlot>} extractions
 */

/**
 * Built, validated descriptor stored in the lite catalog and passed to the UI.
 *
 * @typedef {object} ApiDetectorDefinition
 * @property {string} id
 * @property {string} title
 * @property {string} categoryGroup
 * @property {string} category
 * @property {string} apiObject
 * @property {string} apiName
 * @property {ApiKind} apiKind
 * @property {string} description
 * @property {boolean} extractsValue
 * @property {string | null} extractedValueLabel
 * @property {string} searchText  Lowercase search blob.
 */

const VALID_API_KINDS = new Set(['property-read', 'property-write', 'method-call', 'constructor']);

const REQUIRED_STRINGS = ['id', 'title', 'category', 'apiObject', 'apiName', 'apiKind', 'description'];

/**
 * @param {ApiDetectorRow} row
 * @returns {ApiDetectorDefinition}
 */
export function buildApiDetectorDefinition(row) {
  return {
    id: row.id,
    title: row.title,
    categoryGroup: 'api-interaction',
    category: row.category,
    apiObject: row.apiObject,
    apiName: row.apiName,
    apiKind: row.apiKind,
    description: row.description,
    extractsValue: Boolean(row.extractsValue),
    extractedValueLabel: row.extractedValueLabel ?? null,
    searchText: [row.title, row.category, row.apiObject, row.apiName, row.description]
      .join(' ')
      .toLowerCase(),
  };
}

/**
 * @param {unknown[]} registry
 * @returns {asserts registry is ApiDetectorRow[]}
 */
export function validateApiDetectorRegistry(registry) {
  if (!Array.isArray(registry)) {
    throw new Error('apiDetectorRegistry must be an array');
  }

  const seenIds = new Set();

  for (const row of registry) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error('Each detector row must be a plain object');
    }

    for (const key of REQUIRED_STRINGS) {
      if (typeof row[key] !== 'string' || !row[key].trim().length) {
        throw new Error(`Detector row "${row.id ?? '<unknown>'}" needs a non-empty string for "${key}"`);
      }
    }

    if (!VALID_API_KINDS.has(row.apiKind)) {
      throw new Error(
        `Detector row "${row.id}" has invalid apiKind "${row.apiKind}". ` +
          `Valid: ${[...VALID_API_KINDS].join(', ')}`,
      );
    }

    if (row.categoryGroup !== undefined && row.categoryGroup !== 'api-interaction') {
      throw new Error(`Detector row "${row.id}" must not override categoryGroup`);
    }

    if (row.extractsValue && !row.extractedValueLabel) {
      throw new Error(`Detector row "${row.id}" sets extractsValue but is missing extractedValueLabel`);
    }

    if (seenIds.has(row.id)) {
      throw new Error(`Duplicate detector id: ${row.id}`);
    }

    seenIds.add(row.id);
  }
}
