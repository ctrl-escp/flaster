import {describe, expect, it} from 'vitest';
import {
  TRANSFORM_EDITOR_INITIAL_VALUE,
  buildApplyCustomTransformationOptions,
  transformEditorContextMessage,
} from '../../src/ui/composables/transformEditorModel.js';

describe('transformEditorModel', () => {
  it('exposes a non-empty initial editor hint', () => {
    expect(TRANSFORM_EDITOR_INITIAL_VALUE).toContain('Known structure mode');
  });

  describe('transformEditorContextMessage', () => {
    it('prefers the active structure title', () => {
      expect(transformEditorContextMessage({title: 'Proxy calls'}, 3)).toContain('Proxy calls');
    });

    it('falls back to filter counts when no structure is active', () => {
      expect(transformEditorContextMessage(null, 2)).toContain('2 active filters');
    });

    it('falls back to the generic result-set copy', () => {
      expect(transformEditorContextMessage(null, 0)).toBe(
        'Runs against the current result set when no filters are active',
      );
    });
  });

  describe('buildApplyCustomTransformationOptions', () => {
    it('builds a known-structure payload', () => {
      const options = buildApplyCustomTransformationOptions({
        activeStructure: {id: 'proxy-calls', title: 'Proxy calls'},
        runSettings: {runMode: 'count', maxIterations: '4'},
        structureFilterSeed: 'return true;',
      });

      expect(options.selectionSource).toEqual({kind: 'known-structure', structureId: 'proxy-calls'});
      expect(options.filters).toEqual([{src: 'return true;', enabled: true}]);
      expect(options.maxIterations).toBe(4);
    });

    it('omits filters when the seed is empty', () => {
      const options = buildApplyCustomTransformationOptions({
        activeStructure: null,
        runSettings: {},
        structureFilterSeed: '',
      });

      expect(options.selectionSource).toEqual({kind: 'advanced-js'});
      expect(options.filters).toBeUndefined();
      expect(options.maxIterations).toBe(1);
    });
  });
});
