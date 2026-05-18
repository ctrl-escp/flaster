import {describe, it, expect} from 'vitest';
import {buildLineIndex, offsetToPosition, evidenceFromNode} from '../../../src/domain/report/evidenceFromNode.js';

describe('buildLineIndex', () => {
  it('single-line source starts at 0', () => {
    expect(buildLineIndex('hello')).toEqual([0]);
  });

  it('two-line source', () => {
    expect(buildLineIndex('a\nb')).toEqual([0, 2]);
  });

  it('trailing newline adds an entry', () => {
    expect(buildLineIndex('a\n')).toEqual([0, 2]);
  });
});

describe('offsetToPosition', () => {
  const src = 'abc\ndef\nghi';
  const idx = buildLineIndex(src);

  it('start of file', () => {
    expect(offsetToPosition(idx, 0)).toEqual({line: 1, column: 1});
  });

  it('middle of first line', () => {
    expect(offsetToPosition(idx, 2)).toEqual({line: 1, column: 3});
  });

  it('start of second line', () => {
    expect(offsetToPosition(idx, 4)).toEqual({line: 2, column: 1});
  });

  it('middle of second line', () => {
    expect(offsetToPosition(idx, 6)).toEqual({line: 2, column: 3});
  });

  it('start of third line', () => {
    expect(offsetToPosition(idx, 8)).toEqual({line: 3, column: 1});
  });
});

describe('evidenceFromNode', () => {
  const src = 'let x = 1;\nconst y = 2;';
  const lineIndex = buildLineIndex(src);

  it('produces correct location for a range on line 1', () => {
    const node = {range: [4, 5]};
    const loc = evidenceFromNode(node, lineIndex);
    expect(loc).toEqual({
      line: 1, column: 5,
      endLine: 1, endColumn: 6,
      charStart: 4, charEnd: 5,
    });
  });

  it('produces correct location spanning two lines', () => {
    const node = {range: [8, 14]};
    const loc = evidenceFromNode(node, lineIndex);
    expect(loc.line).toBe(1);
    expect(loc.endLine).toBe(2);
    expect(loc.charStart).toBe(8);
    expect(loc.charEnd).toBe(14);
  });
});
