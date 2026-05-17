import {describe, it, expect} from 'vitest';
import {apiDetectorRegistry} from '../../../src/domain/apiSurface/detectorRegistry.js';
import {buildApiDetectorCodeExample} from '../../../src/domain/apiSurface/codeExampleBuilder.js';
import {buildHydratedKnownStructureCatalog} from '../../../src/domain/apiSurface/asKnownStructures.js';

describe('buildApiDetectorCodeExample', () => {
  it('generates a non-empty example for every detector', () => {
    for (const row of apiDetectorRegistry) {
      const example = buildApiDetectorCodeExample(row);
      expect(example.trim().length, row.id).toBeGreaterThan(0);
    }
  });

  it('includes the API surface in the usage line', () => {
    const row = apiDetectorRegistry.find((d) => d.id === 'window-inner-width');
    expect(buildApiDetectorCodeExample(row)).toContain('window.innerWidth');

    const storage = apiDetectorRegistry.find((d) => d.id === 'local-storage-setitem');
    expect(buildApiDetectorCodeExample(storage)).toContain("localStorage.setItem('key', 'value')");
  });

  it('adds setup lines for instance-bound APIs', () => {
    const row = apiDetectorRegistry.find((d) => d.id === 'canvas-get-context');
    const example = buildApiDetectorCodeExample(row);
    expect(example).toContain("document.createElement('canvas')");
    expect(example).toContain("getContext('2d')");
  });
});

describe('buildHydratedKnownStructureCatalog codeExample', () => {
  it('hydrates API structures with examples', () => {
    const structures = buildHydratedKnownStructureCatalog([]);
    expect(structures.length).toBe(apiDetectorRegistry.length);
    for (const structure of structures) {
      expect(structure.codeExample).toBe(buildApiDetectorCodeExample(
        apiDetectorRegistry.find((row) => row.id === structure.id),
      ));
    }
  });
});
