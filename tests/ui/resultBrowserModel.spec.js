import {describe, expect, it} from 'vitest';
import {buildResultBrowserItems, canOpenResultBrowserMode} from '../../src/ui/composables/resultBrowserModel.js';

const node = (nodeId, type = 'Identifier', extras = {}) => ({
  nodeId,
  type,
  src: 'example',
  parentNode: {type: 'Program'},
  ...extras,
});

describe('resultBrowserModel', () => {
  it('builds AST items', () => {
    const items = buildResultBrowserItems({
      activeResultMode: 'ast',
      areFiltersActive: false,
      filteredNodes: [],
      astNodes: [node(1)],
      relatedNodeEntries: [],
      knownStructureMatches: [],
      getStructureTitle: () => '',
    });

    expect(items[0].kind).toBe('node');
    expect(items[0].key).toBe('node:1');
  });

  it('builds related-node items', () => {
    const items = buildResultBrowserItems({
      activeResultMode: 'related',
      areFiltersActive: false,
      filteredNodes: [],
      astNodes: [],
      relatedNodeEntries: [{node: node(2), relationLabel: 'child'}],
      knownStructureMatches: [],
      getStructureTitle: () => '',
    });

    expect(items[0].relationLabel).toBe('child');
  });

  it('builds match items with structure titles', () => {
    const items = buildResultBrowserItems({
      activeResultMode: 'matches',
      areFiltersActive: false,
      filteredNodes: [],
      astNodes: [],
      relatedNodeEntries: [],
      knownStructureMatches: [{
        structureId: 'proxy-calls',
        label: 'match',
        relevantNode: node(3),
        metadata: {matchOrdinal: 0},
      }],
      getStructureTitle: (id) => (id === 'proxy-calls' ? 'Proxy calls' : id),
    });

    expect(items[0].kind).toBe('match');
    expect(items[0].label).toBe('Proxy calls');
  });

  describe('canOpenResultBrowserMode', () => {
    const base = {
      activeResultMode: 'matches',
      matchCount: 1,
      astCount: 1,
      relatedCount: 1,
    };

    it('blocks switching to the active mode', () => {
      expect(canOpenResultBrowserMode('matches', base)).toBe(false);
    });

    it('opens modes with backing data', () => {
      expect(canOpenResultBrowserMode('ast', {...base, activeResultMode: 'matches'})).toBe(true);
      expect(canOpenResultBrowserMode('related', {...base, activeResultMode: 'matches'})).toBe(true);
    });

    it('refuses empty modes', () => {
      expect(canOpenResultBrowserMode('ast', {...base, activeResultMode: 'related', astCount: 0})).toBe(false);
    });
  });
});
