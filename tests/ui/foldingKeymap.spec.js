import {describe, it, expect} from 'vitest';
import {EditorState} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {javascript} from '@codemirror/lang-javascript';
import {foldGutter, foldedRanges} from '@codemirror/language';
import {foldCurrentRecursively, unfoldCurrentRecursively} from '../../src/ui/codemirror/foldingKeymap.js';

function foldedRangeCount(state) {
  let count = 0;
  foldedRanges(state).between(0, state.doc.length, () => {
    count += 1;
  });
  return count;
}

function createEditor(doc) {
  const parent = document.createElement('div');
  document.body.append(parent);
  return new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [javascript(), foldGutter()],
    }),
  });
}

describe('foldingKeymap commands', () => {
  it('collapses and expands the current block recursively', () => {
    const view = createEditor(`function outer() {
  if (true) {
    console.log('x');
  }
}
`);

    expect(foldCurrentRecursively(view)).toBe(true);
    expect(foldedRangeCount(view.state)).toBeGreaterThan(1);

    expect(unfoldCurrentRecursively(view)).toBe(true);
    expect(foldedRangeCount(view.state)).toBe(0);

    view.dom.parentElement.remove();
    view.destroy();
  });
});
