import {describe, it, expect} from 'vitest';
import {resolveReportSections} from '../../../src/domain/cli/resolveReportSections.js';

function makeSection(id) {
  return {id, filterId: id, title: id, helperCopy: '', findings: [{id: 'f1'}]};
}

const ALL_SECTIONS = [makeSection('obfuscation'), makeSection('api-surface'), makeSection('capabilities')];

describe('resolveReportSections', () => {
  it('returns all sections when no filters', () => {
    const result = resolveReportSections(ALL_SECTIONS, {onlySection: [], excludeSection: []});
    expect(result).toHaveLength(3);
  });

  it('applies --only-section filter', () => {
    const result = resolveReportSections(ALL_SECTIONS, {
      onlySection: ['obfuscation'],
      excludeSection: [],
    });
    expect(result.map((s) => s.id)).toEqual(['obfuscation']);
  });

  it('applies --exclude-section filter', () => {
    const result = resolveReportSections(ALL_SECTIONS, {
      onlySection: [],
      excludeSection: ['capabilities'],
    });
    expect(result.map((s) => s.id)).toEqual(['obfuscation', 'api-surface']);
  });

  it('returns empty array when --only-section has no matches', () => {
    const result = resolveReportSections([], {onlySection: ['obfuscation'], excludeSection: []});
    expect(result).toEqual([]);
  });

  it('--only-section takes precedence over --exclude-section (caller must enforce exclusivity)', () => {
    const result = resolveReportSections(ALL_SECTIONS, {
      onlySection: ['obfuscation'],
      excludeSection: ['api-surface'],
    });
    expect(result.map((s) => s.id)).toEqual(['obfuscation']);
  });
});
