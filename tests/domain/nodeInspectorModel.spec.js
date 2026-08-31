import {describe, expect, it} from 'vitest';
import {Arborist} from 'flast/src/arborist.js';
import {listChildNodesFromFlatAst} from '../../src/domain/selection/nodeInspectorModel.js';
import {DEFAULT_ARBORIST_OPTIONS} from '../../src/domain/parse/parseSource.js';

describe('listChildNodesFromFlatAst', () => {
  it('returns childNodes when present instead of scanning the flat AST', () => {
    const parent = {nodeId: 1, type: 'Program', childNodes: [{nodeId: 2, type: 'ExpressionStatement'}]};
    const decoy = {nodeId: 99, type: 'Literal', parentNode: parent};
    const children = listChildNodesFromFlatAst([parent, decoy], parent);
    expect(children).toBe(parent.childNodes);
    expect(children).toHaveLength(1);
    expect(children[0].nodeId).toBe(2);
  });

  it('falls back to a parentNode scan when childNodes is missing', () => {
    const parent = {nodeId: 1, type: 'BlockStatement'};
    const child = {nodeId: 2, type: 'ReturnStatement', parentNode: parent};
    const other = {nodeId: 3, type: 'Literal', parentNode: {nodeId: 9}};
    expect(listChildNodesFromFlatAst([parent, child, other], parent)).toEqual([child]);
  });

  it('returns children from a real flAST node', () => {
    const arb = new Arborist('const x = 1;', DEFAULT_ARBORIST_OPTIONS);
    const program = arb.ast[0];
    const children = listChildNodesFromFlatAst(arb.ast, program);
    expect(children.length).toBeGreaterThan(0);
    expect(children.every((node) => node.parentNode === program)).toBe(true);
  });
});
