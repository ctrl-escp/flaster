import {describe, expect, it} from 'vitest';
import {buildNodeInspectorOverviewRows} from '../../src/ui/composables/nodeInspectorModel.js';

describe('nodeInspectorModel', () => {
  it('returns an empty list without a node', () => {
    expect(buildNodeInspectorOverviewRows({
      node: null,
      selectedNodeSource: null,
      scopeBlockType: null,
      childCount: 0,
      nodeMatchCount: 0,
      overlapCount: 0,
    })).toEqual([]);
  });

  it('builds overview rows for a node', () => {
    const rows = buildNodeInspectorOverviewRows({
      node: {type: 'Identifier', parentNode: {type: 'VariableDeclarator'}},
      selectedNodeSource: 'results',
      scopeBlockType: 'BlockStatement',
      childCount: 2,
      nodeMatchCount: 3,
      overlapCount: 1,
    });

    expect(rows.find((row) => row.label === 'Type')?.value).toBe('Identifier');
    expect(rows.find((row) => row.label === 'Selection source')?.value).toBe('results');
    expect(rows.find((row) => row.label === 'Children')?.value).toBe('2');
  });
});
