import {compileNodePredicate} from '../transforms/customTransformRuntime.js';

/**
 * @param {string} title
 * @returns {string}
 */
function createCustomStructureId(title) {
  const normalizedTitle = String(title || 'custom-structure')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'custom-structure';

  return `custom-${normalizedTitle}-${Date.now()}`;
}

/**
 * @param {string} title
 * @param {string} filterSrc
 * @param {string} [category='custom']
 */
export function createCustomStructureDescriptor(title, filterSrc, category = 'custom') {
  const normalizedTitle = String(title || 'Custom Structure').trim() || 'Custom Structure';
  const normalizedFilter = String(filterSrc || '').trim();
  const normalizedCategory = String(category || 'custom')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'custom';
  const predicate = compileNodePredicate(normalizedFilter);

  return {
    id: createCustomStructureId(normalizedTitle),
    title: normalizedTitle,
    categoryGroup: 'user-defined',
    category: normalizedCategory,
    description: 'User-defined structure created from a custom filter rule.',
    codeExample: normalizedFilter,
    searchText: [normalizedTitle, normalizedCategory, 'custom', 'structure', 'user-defined'].join(' ').toLowerCase(),
    noEval: true,
    executionMode: 'no-eval',
    matcher(arb, candidateFilter = () => true) {
      return (arb?.ast ?? []).filter((node) => candidateFilter(node) && predicate(node));
    },
    matcherAvailable: true,
    transform: null,
    transformAvailable: false,
    transformEnabled: false,
    support: Object.freeze({
      safeMatch: true,
      safeTransform: false,
      sandboxMatch: false,
      sandboxTransform: false,
      nodeMatch: false,
      nodeTransform: false,
      note: 'Custom structure available in the current workspace.',
    }),
    implementation: Object.freeze({
      moduleName: 'custom',
      matcherName: 'workspaceMatcher',
      transformName: '',
    }),
  };
}
