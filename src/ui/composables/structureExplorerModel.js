export const STRUCTURE_EXPLORER_PAGE_SIZE = 100;

export function formatCategoryLabel(value) {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

/**
 * @param {Array<{ categoryGroup?: string; category: string }>} structures
 */
export function buildCategoryGroupOptions(structures) {
  const categoryGroups = [...new Set(
    structures.map((structure) => structure.categoryGroup ?? 'obfuscation'),
  )];

  return categoryGroups
    .map((categoryGroup) => {
      const structuresInGroup = structures.filter((structure) =>
        (structure.categoryGroup ?? 'obfuscation') === categoryGroup,
      );
      const subcategoryCount = new Set(structuresInGroup.map((structure) => structure.category)).size;

      return {
        value: categoryGroup,
        label: `${formatCategoryLabel(categoryGroup)} (${subcategoryCount})`,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

/**
 * @param {Array<{ categoryGroup?: string; category: string }>} structures
 * @param {string} categoryGroup
 */
export function listCategoriesForGroup(structures, categoryGroup) {
  const eligibleStructures = categoryGroup
    ? structures.filter((structure) =>
      (structure.categoryGroup ?? 'obfuscation') === categoryGroup,
    )
    : structures;

  return [...new Set(eligibleStructures.map((structure) => structure.category))].sort();
}

/**
 * @param {Array<{ categoryGroup?: string; category: string }>} structures
 * @param {{ categoryGroup: string; categories: string[] }} filters
 */
export function buildCategoryOptions(structures, {categoryGroup, categories}) {
  return categories.map((category) => ({
    value: category,
    label: `${formatCategoryLabel(category)} (${structures.filter((structure) =>
      structure.category === category &&
      (!categoryGroup || (structure.categoryGroup ?? 'obfuscation') === categoryGroup),
    ).length})`,
  }));
}

/**
 * @param {Array<{ categoryGroup?: string; category: string; searchText: string; title: string }>} structures
 * @param {{
 *   search: string;
 *   categoryGroup: string;
 *   category: string;
 *   showMatchesOnly: boolean;
 *   getMatchCount: (structure: object) => number;
 * }} filters
 */
export function filterVisibleStructures(structures, filters) {
  const search = filters.search.trim().toLowerCase();

  return structures
    .filter((structure) => {
      if (filters.showMatchesOnly && filters.getMatchCount(structure) <= 0) {
        return false;
      }

      if (filters.categoryGroup &&
        (structure.categoryGroup ?? 'obfuscation') !== filters.categoryGroup) {
        return false;
      }

      if (filters.category && structure.category !== filters.category) {
        return false;
      }

      if (!search) {
        return true;
      }

      return structure.searchText.includes(search);
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function totalPagesForCount(totalItems, pageSize) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function slicePage(items, page, pageSize) {
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

export function formatStructureExplorerPageRange({totalStructures, currentPage, pageSize}) {
  if (!totalStructures) {
    return '0 - 0';
  }

  const start = currentPage * pageSize + 1;
  const end = Math.min(totalStructures, start + pageSize - 1);
  return `${start} - ${end}`;
}
