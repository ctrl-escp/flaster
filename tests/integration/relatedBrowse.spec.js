import {describe, it, expect, vi} from 'vitest';
import {createAppStore} from '../../src/app/createAppStore.js';

function buildParentChildAst() {
  const program = {nodeId: 1, type: 'Program', range: [0, 20], src: 'a + b', parentNode: null};
  const expr = {nodeId: 2, type: 'BinaryExpression', range: [0, 5], src: 'a + b', parentNode: program};
  const left = {nodeId: 3, type: 'Identifier', range: [0, 1], src: 'a', parentNode: expr};
  const right = {nodeId: 4, type: 'Identifier', range: [4, 5], src: 'b', parentNode: expr};

  program.children = [expr];
  expr.children = [left, right];

  return {
    ast: [program, expr, left, right],
    script: 'a + b',
  };
}

describe('related browse focus', () => {
  it('peeks without changing the related list anchor', () => {
    const store = createAppStore(undefined, {skipPersistence: true});
    store.arb = buildParentChildAst();
    store.setSelectedNode(store.getNodeById(3), 'ast');
    store.setActiveResultMode('related');

    const initialKeys = store.getRelatedNodeEntries().map((entry) => entry.node.nodeId);
    store.peekRelatedNode(store.getNodeById(4));

    expect(store.relatedPeekNodeId).toBe(4);
    expect(store.getRelatedNodeEntries().map((entry) => entry.node.nodeId)).toEqual(initialKeys);
  });

  it('changes the related list only when focus is set explicitly', () => {
    const store = createAppStore(undefined, {skipPersistence: true});
    store.arb = buildParentChildAst();
    store.setSelectedNode(store.getNodeById(3), 'ast');
    store.setActiveResultMode('related');

    const selfBefore = store.getRelatedNodeEntries().find((entry) => entry.relationKind === 'self')?.node.nodeId;
    store.setRelatedFocusNode(store.getNodeById(4));
    const selfAfter = store.getRelatedNodeEntries().find((entry) => entry.relationKind === 'self')?.node.nodeId;

    expect(selfBefore).toBe(3);
    expect(selfAfter).toBe(4);
    expect(store.relatedFocusNodeId).toBe(4);
    expect(store.relatedFocusBackNodeId).toBe(3);
  });

  it('restores the previous focus anchor with back', () => {
    const store = createAppStore(undefined, {skipPersistence: true});
    store.arb = buildParentChildAst();
    store.setSelectedNode(store.getNodeById(3), 'ast');
    store.setActiveResultMode('related');
    store.setRelatedFocusNode(store.getNodeById(4));

    const restored = store.restoreRelatedFocusBack();

    expect(restored).toBe(true);
    expect(store.relatedFocusNodeId).toBe(3);
    expect(store.canRestoreRelatedFocusBack()).toBe(false);
  });

  it('highlights peeked nodes in the editor without changing selection id', () => {
    const store = createAppStore(undefined, {skipPersistence: true});
    store.arb = buildParentChildAst();
    const highlightRange = vi.fn();
    store.editors.push({
      editorId: store.editorIds.inputCodeEditor,
      highlightRange,
    });

    store.setSelectedNode(store.getNodeById(3), 'ast');
    store.setActiveResultMode('related');
    store.peekRelatedNode(store.getNodeById(4));

    expect(store.selectedNodeId).toBe(3);
    expect(store.relatedPeekNodeId).toBe(4);
    expect(highlightRange).toHaveBeenCalledWith(4, 5);
  });
});
