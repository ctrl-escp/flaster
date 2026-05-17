import {describe, it, expect} from 'vitest';
import {
  collectCapabilityEvidenceMatches,
  countCapabilityEvidenceMatches,
} from '../../../src/domain/report/capabilityMatches.js';

describe('capabilityMatches', () => {
  const store = {
    getKnownStructureMatches(structureId) {
      return this.matchesById?.[structureId] ?? [];
    },
    matchesById: {
      'detector-a': [
        {structureId: 'detector-a', metadata: {matchOrdinal: 1}},
        {structureId: 'detector-a', metadata: {matchOrdinal: 0}},
      ],
      'detector-b': [
        {structureId: 'detector-b', metadata: {matchOrdinal: 0}},
      ],
    },
  };

  it('aggregates and sorts matches from fired detectors', () => {
    const matches = collectCapabilityEvidenceMatches(store, ['detector-b', 'detector-a']);

    expect(matches).toEqual([
      {structureId: 'detector-a', metadata: {matchOrdinal: 0}},
      {structureId: 'detector-a', metadata: {matchOrdinal: 1}},
      {structureId: 'detector-b', metadata: {matchOrdinal: 0}},
    ]);
    expect(countCapabilityEvidenceMatches(store, ['detector-a'])).toBe(2);
  });

  it('returns zero when no detectors fired', () => {
    expect(collectCapabilityEvidenceMatches(store, [])).toEqual([]);
    expect(countCapabilityEvidenceMatches(store, [])).toBe(0);
  });
});
