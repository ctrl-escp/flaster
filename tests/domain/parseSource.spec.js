import {describe, it, expect} from 'vitest';
import {
  nextParseRunId,
  normalizeParseDiagnostics,
  parseSource,
} from '../../src/domain/parse/parseSource.js';

describe('parseSource', () => {
  it('returns ok with parseRunId echoed for valid JS', () => {
    const result = parseSource('const x = 1;\n', {parseRunId: 1});
    expect(result.ok).toBe(true);
    expect(result.parseRunId).toBe(1);
    expect(result.arborist?.ast?.length).toBeGreaterThan(0);
  });

  it('returns diagnostics with same parseRunId on parse failure', () => {
    const result = parseSource('const x = (', {parseRunId: 2});
    expect(result.ok).toBe(false);
    expect(result.parseRunId).toBe(2);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('handles empty input without throwing', () => {
    const result = parseSource('', {parseRunId: 3});
    expect(result.ok).toBe(false);
    expect(result.parseRunId).toBe(3);
    expect(result.diagnostics.some((d) => d.code === 'empty-input')).toBe(true);
  });

  it('treats whitespace-only input as empty', () => {
    const result = parseSource('  \n\t  ', {parseRunId: 4});
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'empty-input')).toBe(true);
  });

  it('increments parseRunId only via caller (nextParseRunId)', () => {
    let v = 0;
    v = nextParseRunId(v);
    expect(parseSource('void 0;', {parseRunId: v}).parseRunId).toBe(1);
    v = nextParseRunId(v);
    expect(parseSource('void 1;', {parseRunId: v}).parseRunId).toBe(2);
    v = nextParseRunId(v);
    expect(parseSource('', {parseRunId: v}).parseRunId).toBe(3);
  });

  it('coerces non-string source', () => {
    const result = parseSource(/** @type {any} */ (null), {parseRunId: 1});
    expect(result.ok).toBe(false);
    expect(result.source).toBe('');
    expect(result.diagnostics.some((d) => d.code === 'empty-input')).toBe(true);
  });

  it('normalizes diagnostics from mixed inputs', () => {
    const diagnostics = normalizeParseDiagnostics([
      new Error('boom'),
      {message: 'warn-me', severity: 'warning', code: 'w1'},
      'plain',
    ]);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[1].severity).toBe('warning');
    expect(diagnostics[2].message).toBe('plain');
  });

  it('accepts custom Arborist class', async () => {
    const {Arborist} = await import('flast/src/arborist.js');
    const result = parseSource('const a = 1;', {
      parseRunId: 9,
      ArboristClass: Arborist,
    });
    expect(result.ok).toBe(true);
  });

  it('parses with compact scopes and without retained tokens', () => {
    const result = parseSource('const x = 1;\n', {parseRunId: 1});
    expect(result.ok).toBe(true);
    const root = result.arborist.ast[0];
    expect(!root.tokens || root.tokens.length === 0).toBe(true);
    expect(root.typeMap?.Identifier?.length).toBeGreaterThan(0);
    const ident = root.typeMap.Identifier.find((node) => node.name === 'x');
    expect(ident).toBeTruthy();
    expect(root.allScopes).toBeTruthy();
  });
});
