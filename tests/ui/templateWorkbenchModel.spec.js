import {describe, expect, it} from 'vitest';
import {
  annotateWorkbenchTemplate,
  buildWorkbenchTransformOptions,
  resolveWorkbenchTemplateHelpDescription,
} from '../../src/ui/composables/templateWorkbenchModel.js';

const baseTemplate = (type, title = 'Template') => ({
  type,
  title,
  description: 'Base description',
});

describe('templateWorkbenchModel', () => {
  describe('annotateWorkbenchTemplate', () => {
    it('annotates apply-known availability', () => {
      const enabled = annotateWorkbenchTemplate(baseTemplate('apply-known-transform'), {
        hasBuiltInTransform: true,
        activeStructure: {id: 'x'},
        activeMatchCount: 1,
      });

      expect(enabled.disabled).toBe(false);
      expect(enabled.detail).toContain('Available');

      const disabled = annotateWorkbenchTemplate(baseTemplate('apply-known-transform'), {
        hasBuiltInTransform: false,
        activeStructure: {id: 'x'},
        activeMatchCount: 1,
      });

      expect(disabled.disabled).toBe(true);
    });

    it('requires matches for advanced templates', () => {
      const annotated = annotateWorkbenchTemplate(baseTemplate('advanced-js-step'), {
        hasBuiltInTransform: true,
        activeStructure: {id: 'x'},
        activeMatchCount: 0,
      });

      expect(annotated.disabled).toBe(true);
    });
  });

  it('maps an entire catalog', () => {
    const catalog = [
      baseTemplate('apply-known-transform', 'Built-in'),
      baseTemplate('advanced-js-step', 'Custom'),
    ];

    const options = buildWorkbenchTransformOptions(catalog, {
      hasBuiltInTransform: true,
      activeStructure: {id: 'x'},
      activeMatchCount: 2,
    });

    expect(options).toHaveLength(2);
    expect(options.every((entry) => 'disabled' in entry)).toBe(true);
  });

  describe('resolveWorkbenchTemplateHelpDescription', () => {
    it('returns the baseline hint without a template', () => {
      expect(resolveWorkbenchTemplateHelpDescription({
        activeTemplate: null,
        activeTemplateType: 'apply-known-transform',
        activeStructure: {description: 'd'},
        transformName: 't',
        exampleOutcome: null,
      })).toBe('Choose how to transform the selected structure.');
    });

    it('returns catalog copy for non-built-in templates', () => {
      expect(resolveWorkbenchTemplateHelpDescription({
        activeTemplate: {description: 'Do a thing'},
        activeTemplateType: 'advanced-js-step',
        activeStructure: null,
        transformName: 't',
        exampleOutcome: null,
      })).toBe('Do a thing');
    });

    it('builds multi-line guidance for apply-known transforms', () => {
      const lines = resolveWorkbenchTemplateHelpDescription({
        activeTemplate: {description: 'ignored here'},
        activeTemplateType: 'apply-known-transform',
        activeStructure: {description: 'Does proxy cleanup'},
        transformName: 'runProxyCleanup',
        exampleOutcome: 'Removes wrappers',
      });

      expect(Array.isArray(lines)).toBe(true);
      expect(lines[0]).toContain('runProxyCleanup');
      expect(lines.at(-1)).toContain('Removes wrappers');
    });
  });
});
