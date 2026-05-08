import {describe, it, expect} from 'vitest';
import {Arborist} from 'flast/src/arborist.js';
import {
  decodeNodePath,
  encodeNodePath,
  sourceRangeToTuple,
  sourceRangesOverlap,
} from '../../src/domain/structures/matchNormalization.js';
import {runKnownStructureMatcher} from '../../src/integrations/restringer/index.js';
import {STRUCTURE_FIXTURE_ENTRIES} from '../fixtures/structure-match-snippets.js';

describe('matchNormalization', () => {
  it('encodeNodePath round-trips nodeId paths through decodeNodePath', () => {
    const src = STRUCTURE_FIXTURE_ENTRIES['proxy-calls'].source;
    const arb = new Arborist(src);
    const run = runKnownStructureMatcher(arb, 'proxy-calls');
    expect(run.count).toBeGreaterThan(0);
    const node = run.matches[0].relevantNode;
    const path = encodeNodePath(node);
    expect(path?.[0]).toBe('nodeId');
    expect(decodeNodePath(arb, path)).toBe(node);
  });

  it('returns null for decode when path is unknown', () => {
    const arb = new Arborist('1;');
    expect(decodeNodePath(arb, ['other', 0])).toBeNull();
  });

  it('sourceRangeToTuple accepts arrays and {start,end} objects', () => {
    expect(sourceRangeToTuple([1, 5])).toEqual([1, 5]);
    expect(sourceRangeToTuple({start: 2, end: 4})).toEqual([2, 4]);
    expect(sourceRangeToTuple(null)).toBeNull();
  });

  it('sourceRangesOverlap compares array ranges to object ranges', () => {
    expect(sourceRangesOverlap({start: 0, end: 3}, [2, 5])).toBe(true);
    expect(sourceRangesOverlap({start: 0, end: 1}, [2, 3])).toBe(false);
  });
});
