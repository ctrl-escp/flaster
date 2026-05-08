import {compileNodePredicate} from '../../../domain/transforms/customTransformRuntime.js';
import {combineFilterSources} from '../storeUtils.js';

/**
 * AST filter list and combination helpers.
 * @returns {Record<string, unknown>}
 */
export function createFiltersSection() {
  return {
    filters: [],
    combineFilters(filtersArr) {
      return combineFilterSources(filtersArr);
    },
    findFilter(filterSrc) {
      return this.filters.find((filter) => filter?.src === filterSrc);
    },
    addFilter(filterSrc, options = {}) {
      if (!filterSrc) {
        this.logMessage('Missing filter code', 'error');
        return false;
      }

      try {
        const normalizedFilter = filterSrc.trim();
        const predicate = compileNodePredicate(normalizedFilter);
        this.filteredNodes = this.filteredNodes.filter((node) => predicate(node));
        if (!this.findFilter(normalizedFilter)) {
          this.filters.push({
            src: normalizedFilter,
            enabled: options.enabled ?? true,
            label: options.label ?? '',
            selectionSource: options.selectionSource ?? null,
            templateType: options.templateType ?? null,
          });
        }
        this.page = 0;
        return true;
      } catch (error) {
        this.logMessage(`Invalid filter code: ${error.message}`, 'error');
        return false;
      }
    },
    reapplyFilters() {
      this.filteredNodes = this.arb?.ast ?? [];
      for (const filter of this.filters) {
        if (filter?.enabled) {
          this.addFilter(filter.src, filter);
        }
      }
      this.page = 0;
    },
    clearAllFilters() {
      this.filters.length = 0;
      this.filteredNodes = this.arb?.ast ?? [];
      this.page = 0;
    },
    deleteFilter(filterToDelete) {
      this.filters = this.filters.filter((filter) => filter !== filterToDelete);
      this.reapplyFilters();
    },
    toggleFilterEnabled(filter) {
      filter.enabled = !filter.enabled;
      this.reapplyFilters();
    },
    combineEnabledFilters() {
      const enabledFilters = this.filters.filter((filter) => filter?.enabled && Boolean(filter?.src));
      if (enabledFilters.length > 1) {
        const filterSrc = this.combineFilters(enabledFilters.map((filter) => filter.src));
        this.filters = this.filters.filter((filter) => !enabledFilters.includes(filter));
        this.addFilter(filterSrc, {
          label: 'Combined filter',
          templateType: 'advanced-js-step',
        });
      }
    },
  };
}
