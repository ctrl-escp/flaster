import {describe, it, expect} from 'vitest';
import {Arborist} from 'flast/src/arborist.js';
import {buildStructureDefinition} from '../../src/domain/structures/structureDefinition.js';
import {knownStructureIds, knownStructureRegistry} from '../../src/integrations/restringer/catalog.js';
import {
  knownStructuresById,
  runKnownStructureMatcher,
} from '../../src/integrations/restringer/index.js';
import {STRUCTURE_FIXTURE_MANIFEST} from '../fixtures/structure-fixtures.js';
import {STRUCTURE_FIXTURE_ENTRIES} from '../fixtures/structure-match-snippets.js';

describe('structure catalog integrity', () => {
  it('every catalog row resolves to adapter metadata with matching runner contract', () => {
    for (const row of knownStructureRegistry) {
      expect(row.id).toBeTruthy();
      expect(row.moduleName).toBeTruthy();
      expect(row.matcherName).toBeTruthy();
      expect(typeof row.transformName).toBe('string');

      const assembled = knownStructuresById[row.id];
      expect(assembled).toBeTruthy();

      if (row.executionMode === 'no-eval') {
        expect(typeof assembled.matcher).toBe('function');
        if (row.transformEnabled) {
          expect(typeof assembled.transform).toBe('function');
        } else {
          expect(assembled.transformEnabled).toBe(false);
        }
      }
    }
  });

  it('fails when metadata declares a matcher but the adapter cannot resolve a function', () => {
    for (const row of knownStructureRegistry) {
      if (row.executionMode !== 'no-eval') {
        continue;
      }
      const assembled = knownStructuresById[row.id];
      if (row.matcherName && typeof assembled.matcher !== 'function') {
        throw new Error(
          `Catalog vs adapter mismatch for ${row.id}: metadata names matcher "${row.matcherName}" but no function resolved.`,
        );
      }
    }
  });

  it('every catalog id has a fixture source or fixtureMissingReason', () => {
    for (const row of knownStructureRegistry) {
      const entry = STRUCTURE_FIXTURE_ENTRIES[row.id];
      expect(entry, `missing fixture entry for ${row.id}`).toBeTruthy();
      if ('fixtureMissingReason' in entry) {
        expect(entry.fixtureMissingReason.length).toBeGreaterThan(0);
        expect('source' in entry).toBe(false);
      } else {
        expect(entry.source.length).toBeGreaterThan(0);
      }
    }
  });

  it('fixture manifest lists exactly the built-in catalog ids', () => {
    const manifestIds = STRUCTURE_FIXTURE_MANIFEST.map((e) => e.structureName).sort();
    const catalogIds = [...knownStructureIds].sort();
    expect(manifestIds).toEqual(catalogIds);
    for (const block of STRUCTURE_FIXTURE_MANIFEST) {
      if (block.fixtureCoverageExemption) {
        expect(block.fixtureCoverageExemption.reason.trim().length).toBeGreaterThan(0);
        continue;
      }

      expect(block.fixtures?.length ?? 0).toBeGreaterThan(0);
      const first = block.fixtures[0];
      expect(first.path?.length ?? 0).toBeGreaterThan(0);
      if (first.expectedMinMatches != null) {
        expect(first.expectedMinMatches).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('buildStructureDefinition matches catalog invariants', () => {
    for (const row of knownStructureRegistry) {
      const def = buildStructureDefinition(row);
      expect(def.name).toBe(row.id);
      expect(def.label).toBe(row.title);
      expect(def.capabilities.export).toBe(row.executionMode === 'no-eval');
      expect(def.implementation.moduleName).toBe(row.moduleName);
      expect(def.implementation.matcherName).toBe(row.matcherName);
    }
  });
});

describe('structure match fixtures', () => {
  for (const row of knownStructureRegistry) {
    const entry = STRUCTURE_FIXTURE_ENTRIES[row.id];
    if (!entry || 'fixtureMissingReason' in entry) {
      continue;
    }

    it(`matches at least once for ${row.id}`, () => {
      const arb = new Arborist(entry.source);
      const run = runKnownStructureMatcher(arb, row.id);
      expect(run.error).toBeNull();
      expect(run.count).toBeGreaterThan(0);
      const first = run.matches[0];
      expect(first.structureId).toBe(row.id);
      expect(first.matchId).toBe(`${row.id}:0`);
      expect(first.label?.length ?? 0).toBeGreaterThan(0);
      expect(first.relevantNode).toBeTruthy();
      expect(Array.isArray(first.relevantNode.range) && first.relevantNode.range.length >= 2).toBe(true);
      expect(first.metadata?.matchOrdinal).toBe(0);
      expect(first.metadata?.runnerMatch).toBeDefined();
      expect('confidence' in first).toBe(false);
    });
  }
});
