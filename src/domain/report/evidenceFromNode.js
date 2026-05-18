/**
 * Converts AST node char-offset ranges into evidence location objects.
 *
 * @typedef {{
 *   line: number,
 *   column: number,
 *   endLine: number,
 *   endColumn: number,
 *   charStart: number,
 *   charEnd: number,
 * }} EvidenceLocation
 */

/**
 * Builds a line-start-offset index from source text.
 * Line 1 starts at offset 0; line N+1 starts at (offset of '\n' on line N) + 1.
 *
 * @param {string} source
 * @returns {number[]}
 */
export function buildLineIndex(source) {
  const offsets = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') {
      offsets.push(i + 1);
    }
  }
  return offsets;
}

/**
 * Converts a char offset into { line, column } (both 1-based) using a pre-built line index.
 *
 * @param {number[]} lineIndex
 * @param {number} offset
 * @returns {{ line: number, column: number }}
 */
export function offsetToPosition(lineIndex, offset) {
  let lo = 0;
  let hi = lineIndex.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineIndex[mid] <= offset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return {line: lo + 1, column: offset - lineIndex[lo] + 1};
}

/**
 * Builds an EvidenceLocation from an AST node's range and the source line index.
 *
 * @param {{ range: [number, number] }} node
 * @param {number[]} lineIndex
 * @returns {EvidenceLocation}
 */
export function evidenceFromNode(node, lineIndex) {
  const [charStart, charEnd] = node.range;
  const start = offsetToPosition(lineIndex, charStart);
  const end = offsetToPosition(lineIndex, charEnd);
  return {
    line: start.line,
    column: start.column,
    endLine: end.line,
    endColumn: end.column,
    charStart,
    charEnd,
  };
}
