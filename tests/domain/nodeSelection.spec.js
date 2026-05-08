import {describe, it, expect} from 'vitest';
import {
  advanceFlatKnownStructureMatch,
  advanceStructureMatchOrdinal,
  getNodeId,
  isKnownStructureMatchSelectionActive,
  nodeForMatchSelection,
  resolveSelectedNode,
  structureMatchDisplayIndex,
} from '../../src/domain/selection/nodeSelection.js';

describe('nodeSelection', () => {
  describe('getNodeId', () => {
    it('returns nodeId when present', () => {
      expect(getNodeId({nodeId: 42, type: 'Identifier'})).toBe(42);
    });

    it('returns null when missing or invalid', () => {
      expect(getNodeId(null)).toBe(null);
      expect(getNodeId({})).toBe(null);
    });
  });

  describe('resolveSelectedNode', () => {
    const arborist = {
      ast: [
        {nodeId: 1, type: 'Program', range: [0, 10]},
        {nodeId: 2, type: 'Identifier', range: [6, 7]},
      ],
    };

    it('returns the node when session matches current parse run', () => {
      expect(resolveSelectedNode(arborist, 2, {selectionParseRunId: 5, currentParseRunId: 5})).toEqual(arborist.ast[1]);
    });

    it('returns null when parse run is stale', () => {
      expect(resolveSelectedNode(arborist, 2, {selectionParseRunId: 4, currentParseRunId: 5})).toBe(null);
    });

    it('returns null when selectionParseRunId is missing', () => {
      expect(resolveSelectedNode(arborist, 2, {selectionParseRunId: null, currentParseRunId: 5})).toBe(null);
    });

    it('returns null when node id is absent from AST', () => {
      expect(resolveSelectedNode(arborist, 99, {selectionParseRunId: 1, currentParseRunId: 1})).toBe(null);
    });
  });

  describe('isKnownStructureMatchSelectionActive', () => {
    it('returns true for the active match', () => {
      const sel = {structureId: 's1', index: 3};
      const match = {structureId: 's1', metadata: {matchOrdinal: 3}};
      expect(isKnownStructureMatchSelectionActive(sel, match)).toBe(true);
    });

    it('returns false for different structure or ordinal', () => {
      const sel = {structureId: 's1', index: 3};
      expect(isKnownStructureMatchSelectionActive(sel, {structureId: 's2', metadata: {matchOrdinal: 3}})).toBe(false);
      expect(isKnownStructureMatchSelectionActive(sel, {structureId: 's1', metadata: {matchOrdinal: 2}})).toBe(false);
    });
  });

  describe('nodeForMatchSelection', () => {
    it('returns relevantNode when set', () => {
      const node = {nodeId: 1, type: 'Literal'};
      expect(nodeForMatchSelection({relevantNode: node})).toBe(node);
    });

    it('returns null when match has no relevant node', () => {
      expect(nodeForMatchSelection({relevantNode: null, label: 'x'})).toBe(null);
      expect(nodeForMatchSelection({})).toBe(null);
    });
  });

  describe('advanceFlatKnownStructureMatch', () => {
    const matches = [
      {structureId: 'a', metadata: {matchOrdinal: 0}},
      {structureId: 'b', metadata: {matchOrdinal: 0}},
      {structureId: 'a', metadata: {matchOrdinal: 1}},
    ];

    it('returns first match when nothing selected', () => {
      expect(advanceFlatKnownStructureMatch(matches, null, 1)).toEqual({structureId: 'a', index: 0});
    });

    it('steps forward and wraps', () => {
      expect(advanceFlatKnownStructureMatch(matches, {structureId: 'a', index: 0}, 1)).toEqual({structureId: 'b', index: 0});
      expect(advanceFlatKnownStructureMatch(matches, {structureId: 'a', index: 1}, 1)).toEqual({structureId: 'a', index: 0});
    });

    it('returns null for empty list', () => {
      expect(advanceFlatKnownStructureMatch([], null, 1)).toBe(null);
    });
  });

  describe('advanceStructureMatchOrdinal', () => {
    const matches = [
      {structureId: 'x', metadata: {matchOrdinal: 10}},
      {structureId: 'x', metadata: {matchOrdinal: 20}},
      {structureId: 'x', metadata: {matchOrdinal: 30}},
    ];

    it('uses remembered ordinal when global selection is for another structure', () => {
      const next = advanceStructureMatchOrdinal(
        matches,
        'x',
        {structureId: 'other', index: 99},
        20,
        1,
      );
      expect(next).toBe(30);
    });

    it('starts at last when stepping back with no remembered index', () => {
      const next = advanceStructureMatchOrdinal(matches, 'x', null, undefined, -1);
      expect(next).toBe(30);
    });

    it('starts at first when stepping forward with no selection', () => {
      const next = advanceStructureMatchOrdinal(matches, 'x', null, undefined, 1);
      expect(next).toBe(10);
    });
  });

  describe('structureMatchDisplayIndex', () => {
    const matches = [
      {structureId: 'x', metadata: {matchOrdinal: 1}},
      {structureId: 'x', metadata: {matchOrdinal: 2}},
    ];

    it('returns 1-based index for active ordinal', () => {
      expect(structureMatchDisplayIndex(matches, 'x', {structureId: 'x', index: 2}, undefined)).toBe(2);
    });

    it('falls back to remembered ordinal', () => {
      expect(structureMatchDisplayIndex(matches, 'x', null, 2)).toBe(2);
    });

    it('returns 1 when ordinal no longer exists', () => {
      expect(structureMatchDisplayIndex(matches, 'x', {structureId: 'x', index: 99}, undefined)).toBe(1);
    });
  });
});
