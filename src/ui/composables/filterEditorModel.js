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
