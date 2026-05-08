import {describe, it, expect} from 'vitest';
import {
  buildStructureDefinition,
  validateKnownStructureCatalogRegistry,
} from '../../src/domain/structures/structureDefinition.js';
import {knownStructureRegistry} from '../../src/integrations/restringer/catalog.js';

describe('structureDefinition', () => {
  it('validateKnownStructureCatalogRegistry accepts the shipped catalog', () => {
    expect(() => validateKnownStructureCatalogRegistry(knownStructureRegistry)).not.toThrow();
  });

  it('rejects unknown keys on catalog rows', () => {
    expect(() =>
      validateKnownStructureCatalogRegistry([
        {
          id: 'x',
          title: 'X',
          category: 'c',
          description: 'd',
          codeExample: '',
          noEval: true,
          executionMode: 'no-eval',
          matcherName: 'm',
          transformName: 't',
          transformEnabled: true,
          moduleName: 'mod',
          expectsMatches: true,
        },
      ]),
    ).toThrow(/disallowed key/);
  });

  it('rejects duplicate names', () => {
    const row = {
      id: 'dup',
      title: 'Dup',
      category: 'c',
      description: 'd',
      noEval: true,
      executionMode: 'no-eval',
      matcherName: 'm',
      transformName: 't',
      transformEnabled: true,
      moduleName: 'resolveProxyCalls',
    };
    expect(() => validateKnownStructureCatalogRegistry([row, {...row}])).toThrow(/Duplicate/);
  });

  it('buildStructureDefinition marks export for no-eval rows with implementation', () => {
    const def = buildStructureDefinition({
      id: 'sample',
      title: 'Sample',
      category: 'c',
      description: 'd',
      noEval: true,
      executionMode: 'no-eval',
      matcherName: 'normalizeComputedMatch',
      transformName: 'normalizeComputedTransform',
      transformEnabled: true,
      moduleName: 'normalizeComputed',
    });
    expect(def.name).toBe('sample');
    expect(def.capabilities.export).toBe(true);
    expect(def.transformNames).toEqual(['normalizeComputedTransform']);
  });
});
