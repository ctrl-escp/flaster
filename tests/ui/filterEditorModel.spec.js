import {describe, expect, it} from 'vitest';
import {findExistingStructureCategory, formatFilterSummary} from '../../src/ui/composables/filterEditorModel.js';

describe('filterEditorModel', () => {
  describe('findExistingStructureCategory', () => {
    it('matches case-insensitively', () => {
      expect(findExistingStructureCategory(['Custom', 'Other'], 'custom')).toBe('Custom');
    });

    it('returns null when nothing matches', () => {
      expect(findExistingStructureCategory(['Custom'], 'missing')).toBe(null);
    });
  });

  describe('formatFilterSummary', () => {
    it('handles the empty state', () => {
      expect(formatFilterSummary(0, 0)).toBe('No saved filters');
    });

    it('formats active counts', () => {
      expect(formatFilterSummary(2, 5)).toBe('2 of 5 active');
    });
  });
});
