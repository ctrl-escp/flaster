import {createKnownStructureRuleSeed} from '../../app/workspaceTemplates.js';

/**
 * Filter editor body for a known structure: live rule for user-defined, seeded matcher for catalog entries.
 *
 * @param {{ categoryGroup?: string; codeExample?: string; title?: string; id?: string; category?: string; executionMode?: string; description?: string } | null | undefined} structure
 * @returns {string}
 */
export function getKnownStructureFilterSource(structure) {
  if (!structure) {
    return '';
  }

  if ((structure.categoryGroup ?? 'obfuscation') === 'user-defined') {
    return String(structure.codeExample ?? '').trim();
  }

  return createKnownStructureRuleSeed(structure);
}

export function findExistingStructureCategory(existingCategories, requestedCategory) {
  const normalizedCategory = String(requestedCategory || '').trim().toLowerCase();

  return existingCategories.find((existingCategory) =>
    existingCategory.trim().toLowerCase() === normalizedCategory,
  ) ?? null;
}

export function formatFilterSummary(numEnabled, numAvailable) {
  if (!numAvailable) {
    return 'No saved filters';
  }

  return `${numEnabled} of ${numAvailable} active`;
}
