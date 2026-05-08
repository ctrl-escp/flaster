import {describe, it, expect} from 'vitest';
import {createKnownStructureHighlightState} from '../../src/domain/selection/highlightModel.js';

describe('highlightModel', () => {
  it('builds ranges for matches with relevantNode ranges', () => {
    const matches = [
      {structureId: 'a', relevantNode: {range: [0, 5]}, metadata: {matchOrdinal: 0}},
      {structureId: 'a', relevantNode: {range: [10, 12]}, metadata: {matchOrdinal: 1}},
    ];
    const state = createKnownStructureHighlightState(matches, {structureId: 'a', index: 1});
    expect(state.ranges).toHaveLength(2);
    expect(state.ranges[0].className).toBe('known-structure-highlight');
    expect(state.ranges[1].className).toBe('known-structure-highlight-active');
    expect(state.activeRange).toEqual(state.ranges[1]);
  });

  it('skips matches without a usable range', () => {
    const matches = [
      {structureId: 'a', relevantNode: null, metadata: {matchOrdinal: 0}},
      {structureId: 'a', metadata: {matchOrdinal: 1}},
      {structureId: 'a', relevantNode: {range: [1, 2]}, metadata: {matchOrdinal: 2}},
    ];
    const state = createKnownStructureHighlightState(matches, {structureId: 'a', index: 2});
    expect(state.ranges).toHaveLength(1);
    expect(state.ranges[0].from).toBe(1);
    expect(state.activeRange?.className).toBe('known-structure-highlight-active');
  });

  it('marks selection without relevant spans as no active editor range', () => {
    const matches = [
      {structureId: 'a', relevantNode: null, metadata: {matchOrdinal: 0}},
    ];
    const state = createKnownStructureHighlightState(matches, {structureId: 'a', index: 0});
    expect(state.ranges).toHaveLength(0);
    expect(state.activeRange).toBe(null);
  });
});
