import {describe, expect, it} from 'vitest';
import {
  buildCategoryGroupOptions,
  buildCategoryOptions,
  filterVisibleStructures,
  formatCategoryLabel,
  formatStructureExplorerPageRange,
  listCategoriesForGroup,
  slicePage,
  totalPagesForCount,
} from '../../src/ui/composables/structureExplorerModel.js';

const sampleStructures = [
  {
    id: 'a',
    title: 'Alpha',
    categoryGroup: 'obfuscation',
    category: 'proxying',
    searchText: 'alpha proxy',
  },
  {
    id: 'b',
    title: 'Beta',
    categoryGroup: 'user-defined',
    category: 'custom',
    searchText: 'beta custom',
  },
];

describe('structureExplorerModel', () => {
  it('formats dashed category labels', () => {
    expect(formatCategoryLabel('proxy-calls')).toBe('Proxy Calls');
  });

  it('builds category group options with counts', () => {
    const options = buildCategoryGroupOptions(sampleStructures);
    expect(options.map((entry) => entry.value).sort()).toEqual(['obfuscation', 'user-defined']);
    expect(options.find((entry) => entry.value === 'obfuscation')?.label).toContain('(1)');
  });

  it('lists categories for the active group', () => {
    expect(listCategoriesForGroup(sampleStructures, 'obfuscation')).toEqual(['proxying']);
    expect(listCategoriesForGroup(sampleStructures, '')).toEqual(['custom', 'proxying']);
  });

  it('counts structures per category option', () => {
    const categories = listCategoriesForGroup(sampleStructures, '');
    const options = buildCategoryOptions(sampleStructures, {categoryGroup: '', categories});
    const proxying = options.find((entry) => entry.value === 'proxying');

    expect(proxying?.label).toContain('(1)');
  });

  it('filters structures by search and toggles', () => {
    const visible = filterVisibleStructures(sampleStructures, {
      search: 'beta',
      categoryGroup: '',
      category: '',
      showMatchesOnly: false,
      getMatchCount: () => 0,
    });

    expect(visible.map((structure) => structure.id)).toEqual(['b']);
  });

  it('respects the matches-only toggle', () => {
    const visible = filterVisibleStructures(sampleStructures, {
      search: '',
      categoryGroup: '',
      category: '',
      showMatchesOnly: true,
      getMatchCount: (structure) => (structure.id === 'a' ? 1 : 0),
    });

    expect(visible.map((structure) => structure.id)).toEqual(['a']);
  });

  it('pages items predictably', () => {
    const items = ['x', 'y', 'z'];
    expect(slicePage(items, 0, 2)).toEqual(['x', 'y']);
    expect(slicePage(items, 1, 2)).toEqual(['z']);
    expect(totalPagesForCount(5, 2)).toBe(3);
  });

  it('formats page ranges', () => {
    expect(formatStructureExplorerPageRange({totalStructures: 0, currentPage: 0, pageSize: 2})).toBe('0 - 0');
    expect(formatStructureExplorerPageRange({totalStructures: 5, currentPage: 0, pageSize: 2})).toBe('1 - 2');
    expect(formatStructureExplorerPageRange({totalStructures: 5, currentPage: 1, pageSize: 2})).toBe('3 - 4');
  });
});
