import {describe, it, expect} from 'vitest';
import {
  expandListArgs,
  parseCliArgs,
  validateCliOptions,
} from '../../../src/domain/cli/cliOptions.js';

describe('expandListArgs', () => {
  it('returns empty array for empty input', () => {
    expect(expandListArgs([])).toEqual([]);
  });

  it('leaves single values unchanged', () => {
    expect(expandListArgs(['obfuscation'])).toEqual(['obfuscation']);
  });

  it('splits comma-separated values', () => {
    expect(expandListArgs(['obfuscation,api-surface'])).toEqual(['obfuscation', 'api-surface']);
  });

  it('combines repeated flags and comma lists', () => {
    expect(expandListArgs(['obfuscation,api-surface', 'capabilities'])).toEqual([
      'obfuscation',
      'api-surface',
      'capabilities',
    ]);
  });

  it('trims whitespace around commas', () => {
    expect(expandListArgs(['a , b'])).toEqual(['a', 'b']);
  });

  it('filters empty segments', () => {
    expect(expandListArgs([',a,,b,'])).toEqual(['a', 'b']);
  });
});

describe('parseCliArgs', () => {
  it('defaults to json format', () => {
    const opts = parseCliArgs(['file.js']);
    expect(opts.format).toBe('json');
  });

  it('accepts --format html', () => {
    const opts = parseCliArgs(['--format', 'html']);
    expect(opts.format).toBe('html');
  });

  it('parses positional input', () => {
    const opts = parseCliArgs(['file.js', '--stdout']);
    expect(opts.input).toBe('file.js');
    expect(opts.stdout).toBe(true);
  });

  it('expands comma-separated --section', () => {
    const opts = parseCliArgs(['--section', 'obfuscation,api-surface']);
    expect(opts.section).toEqual(['obfuscation', 'api-surface']);
  });

  it('accumulates repeated --only-section', () => {
    const opts = parseCliArgs(['--only-section', 'obfuscation', '--only-section', 'capabilities']);
    expect(opts.onlySection).toEqual(['obfuscation', 'capabilities']);
  });

  it('sets full flag', () => {
    expect(parseCliArgs(['--full']).full).toBe(true);
  });
});

describe('validateCliOptions', () => {
  function opts(overrides = {}) {
    return {
      section: [],
      structures: [],
      onlySection: [],
      excludeSection: [],
      ...overrides,
    };
  }

  it('returns null for valid options', () => {
    expect(validateCliOptions(opts())).toBeNull();
  });

  it('rejects --only-section + --exclude-section', () => {
    expect(validateCliOptions(opts({onlySection: ['obfuscation'], excludeSection: ['capabilities']}))).toMatch(
      /mutually exclusive/,
    );
  });

  it('rejects --section + --only-section', () => {
    expect(validateCliOptions(opts({section: ['obfuscation'], onlySection: ['capabilities']}))).toMatch(
      /mutually exclusive/,
    );
  });

  it('rejects --structures + --section', () => {
    expect(validateCliOptions(opts({structures: ['proxy-vars'], section: ['obfuscation']}))).toMatch(
      /mutually exclusive/,
    );
  });

  it('rejects unknown analysis section id', () => {
    expect(validateCliOptions(opts({section: ['unknown-id']}))).toMatch(/Unknown analysis section/);
  });

  it('rejects unknown --only-section id', () => {
    expect(validateCliOptions(opts({onlySection: ['bad-id']}))).toMatch(/Unknown report section/);
  });

  it('rejects unknown --exclude-section id', () => {
    expect(validateCliOptions(opts({excludeSection: ['bad-id']}))).toMatch(/Unknown report section/);
  });
});
