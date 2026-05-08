// @vitest-environment node

import {describe, expect, it} from 'vitest';
import {
  normalizeParseDiagnostics,
  nextParseAttemptVersion,
  parseSource,
} from '../../src/domain/parse/parseSource.js';

describe('parseSource', () => {
  it('parses valid JavaScript', () => {
    const result = parseSource('const x = 1;\n', {version: 1});
    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
    expect(result.version).toBe(1);
    expect(result.arborist?.ast?.length).toBeGreaterThan(0);
    expect(result.diagnostics).toEqual([]);
  });

  it('fails on invalid JavaScript (no AST nodes)', () => {
    const result = parseSource('const x = (', {version: 2});
    expect(result.ok).toBe(false);
    expect(result.arborist).not.toBeNull();
    expect(result.arborist?.ast?.length ?? 0).toBe(0);
    expect(result.version).toBe(2);
    expect(result.diagnostics.some((d) => d.code === 'parse-no-nodes')).toBe(true);
  });

  it('fails on empty input with null arborist', () => {
    const result = parseSource('', {version: 3});
    expect(result.ok).toBe(false);
    expect(result.arborist).toBeNull();
    expect(result.version).toBe(3);
    expect(result.diagnostics.some((d) => d.code === 'empty-input')).toBe(true);
  });

  it('treats whitespace-only source as empty', () => {
    const result = parseSource('  \n\t  ', {version: 4});
    expect(result.ok).toBe(false);
    expect(result.arborist).toBeNull();
    expect(result.diagnostics.some((d) => d.code === 'empty-input')).toBe(true);
  });

  it('increments version only via caller (nextParseAttemptVersion)', () => {
    let v = 0;
    v = nextParseAttemptVersion(v);
    expect(parseSource('void 0;', {version: v}).version).toBe(1);
    v = nextParseAttemptVersion(v);
    expect(parseSource('void 1;', {version: v}).version).toBe(2);
    v = nextParseAttemptVersion(v);
    expect(parseSource('', {version: v}).version).toBe(3);
  });

  it('coerces non-string source', () => {
    const result = parseSource(/** @type {any} */ (null), {version: 1});
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'empty-input')).toBe(true);
  });

  it('surfaces constructor errors', () => {
    class ThrowingArborist {
      constructor() {
        throw new Error('ctor');
      }
    }

    const result = parseSource('const a = 1;', {
      version: 9,
      ArboristClass: /** @type {any} */ (ThrowingArborist),
    });
    expect(result.ok).toBe(false);
    expect(result.arborist).toBeNull();
    expect(result.error?.message).toBe('ctor');
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});

describe('normalizeParseDiagnostics', () => {
  it('normalizes Error instances', () => {
    const out = normalizeParseDiagnostics([new Error('e1')]);
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('error');
    expect(out[0].code).toBe('exception');
    expect(out[0].message).toBe('e1');
  });

  it('normalizes objects with message', () => {
    const out = normalizeParseDiagnostics([{message: 'm', severity: 'warning', code: 'c'}]);
    expect(out[0]).toMatchObject({severity: 'warning', code: 'c', message: 'm'});
  });

  it('wraps scalar values', () => {
    const out = normalizeParseDiagnostics(['x']);
    expect(out[0].message).toBe('x');
  });
});
