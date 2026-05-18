import {describe, it, expect} from 'vitest';
import {resolveStructureSelection, CliValidationError} from '../../../src/domain/cli/resolveStructureSelection.js';

function makeCatalog(overrides = []) {
  return [
    {id: 'proxy-vars',        categoryGroup: 'obfuscation', executionMode: 'no-eval',  matcherAvailable: true},
    {id: 'array-replacements', categoryGroup: 'obfuscation', executionMode: 'no-eval',  matcherAvailable: true},
    {id: 'some-sandbox',      categoryGroup: 'obfuscation', executionMode: 'iframe-sandbox', matcherAvailable: false},
    {id: 'window-inner-width', categoryGroup: 'api-surface',  executionMode: 'no-eval',  matcherAvailable: true},
    ...overrides,
  ];
}

function opts(overrides = {}) {
  return {section: [], structures: [], onlySection: [], excludeSection: [], ...overrides};
}

describe('resolveStructureSelection', () => {
  describe('default (no flags)', () => {
    it('includes all runnable obfuscation ids', () => {
      const sel = resolveStructureSelection(opts(), makeCatalog());
      expect(sel.obfuscationIds).toContain('proxy-vars');
      expect(sel.obfuscationIds).toContain('array-replacements');
      expect(sel.obfuscationIds).not.toContain('some-sandbox');
    });

    it('includes api-surface and capabilities', () => {
      const sel = resolveStructureSelection(opts(), makeCatalog());
      expect(sel.includeApiSurface).toBe(true);
      expect(sel.includeCapabilities).toBe(true);
    });

    it('counts skipped non-no-eval entries', () => {
      const sel = resolveStructureSelection(opts(), makeCatalog());
      expect(sel.skippedNonNoEvalCount).toBe(1);
    });
  });

  describe('--section', () => {
    it('obfuscation only excludes api-surface', () => {
      const sel = resolveStructureSelection(opts({section: ['obfuscation']}), makeCatalog());
      expect(sel.includeApiSurface).toBe(false);
      expect(sel.includeCapabilities).toBe(false);
      expect(sel.obfuscationIds).toContain('proxy-vars');
    });

    it('api-surface only excludes obfuscation ids', () => {
      const sel = resolveStructureSelection(opts({section: ['api-surface']}), makeCatalog());
      expect(sel.includeApiSurface).toBe(true);
      expect(sel.obfuscationIds).toHaveLength(0);
    });

    it('both sections includes everything', () => {
      const sel = resolveStructureSelection(opts({section: ['obfuscation', 'api-surface']}), makeCatalog());
      expect(sel.includeApiSurface).toBe(true);
      expect(sel.obfuscationIds).toContain('proxy-vars');
    });
  });

  describe('--structures', () => {
    it('runs only specified obfuscation ids', () => {
      const sel = resolveStructureSelection(opts({structures: ['proxy-vars']}), makeCatalog());
      expect(sel.obfuscationIds).toEqual(['proxy-vars']);
      expect(sel.includeApiSurface).toBe(false);
    });

    it('throws CliValidationError for unknown id', () => {
      expect(() =>
        resolveStructureSelection(opts({structures: ['unknown-id']}), makeCatalog()),
      ).toThrow(CliValidationError);
    });

    it('throws CliValidationError for api-surface id', () => {
      expect(() =>
        resolveStructureSelection(opts({structures: ['window-inner-width']}), makeCatalog()),
      ).toThrow(CliValidationError);
    });
  });

  describe('report-only flags (implies full analysis)', () => {
    it('runs full analysis when only-section is set', () => {
      const sel = resolveStructureSelection(opts({onlySection: ['obfuscation']}), makeCatalog());
      expect(sel.includeApiSurface).toBe(true);
      expect(sel.obfuscationIds.length).toBeGreaterThan(0);
    });
  });
});
