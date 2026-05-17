import {describe, it, expect} from 'vitest';
import {
  REPORT_FILTER_OPTIONS,
  countFindingsForFilter,
  filterReportSections,
} from '../../../src/domain/report/index.js';

describe('report filters', () => {
  const sections = [
    {id: 'capabilities', filterId: 'api-surface', findings: [{id: 'cap-1'}]},
    {id: 'obfuscation', filterId: 'obfuscation', findings: [{id: 'obs-1'}, {id: 'obs-2'}]},
    {id: 'api-surface', filterId: 'api-surface', findings: [{id: 'api-1'}]},
  ];

  it('counts findings per filter', () => {
    expect(countFindingsForFilter(sections, 'obfuscation')).toBe(2);
    expect(countFindingsForFilter(sections, 'api-surface')).toBe(2);
  });

  it('filters visible sections by enabled filter ids', () => {
    const visible = filterReportSections(sections, new Set(['obfuscation']));

    expect(visible.map((section) => section.id)).toEqual(['obfuscation']);
    expect(REPORT_FILTER_OPTIONS.map((filter) => filter.id)).toEqual([
      'obfuscation',
      'api-surface',
    ]);
  });
});
