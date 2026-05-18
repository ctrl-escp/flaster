import {describe, it, expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runAnalysis} from '../../../src/domain/cli/runAnalysis.js';
import {enrichReportFindings} from '../../../src/domain/cli/enrichReportFindings.js';

const SAMPLE_PATH = resolve('public/sample-scripts/array_replacements.js');

async function loadInput() {
  const source = await readFile(SAMPLE_PATH, 'utf8');
  return {
    source,
    inputLabel: SAMPLE_PATH,
    defaultOutputDir: resolve('public/sample-scripts'),
    inputKind: 'file',
    inputPath: SAMPLE_PATH,
  };
}

function noFlags() {
  return {section: [], structures: [], onlySection: [], excludeSection: [], full: false};
}

describe('runAnalysis integration', () => {
  it('returns a valid report envelope for a real script', async () => {
    const input = await loadInput();
    const envelope = await runAnalysis(input, noFlags());

    expect(envelope.status).toBe('done');
    expect(envelope.meta.parse.ok).toBe(true);
    expect(typeof envelope.totalFindings).toBe('number');
    expect(Array.isArray(envelope.sections)).toBe(true);
  });

  it('finds obfuscation matches in array_replacements.js', async () => {
    const input = await loadInput();
    const envelope = await runAnalysis(input, noFlags());

    const obfSection = envelope.sections.find((s) => s.id === 'obfuscation');
    expect(obfSection).toBeDefined();
    expect(obfSection.findings.length).toBeGreaterThan(0);
  });

  it('evidence rows have line/column after enrichment', async () => {
    const input = await loadInput();
    const envelope = await runAnalysis(input, noFlags());
    const {_store, ...reportEnvelope} = envelope;
    enrichReportFindings(reportEnvelope.sections, _store, input.source, false);

    const obfSection = reportEnvelope.sections.find((s) => s.id === 'obfuscation');
    const finding = obfSection?.findings[0];
    expect(finding?.evidence).toBeDefined();
    if (finding?.evidence?.length) {
      const ev = finding.evidence[0];
      expect(typeof ev.line).toBe('number');
      expect(typeof ev.column).toBe('number');
      expect(typeof ev.charStart).toBe('number');
    }
  });

  it('--section obfuscation excludes api-surface section', async () => {
    const input = await loadInput();
    const opts = {...noFlags(), section: ['obfuscation']};
    const envelope = await runAnalysis(input, opts);

    const apiSection = envelope.sections.find((s) => s.id === 'api-surface');
    expect(apiSection).toBeUndefined();
  });

  it('--only-section obfuscation filters report but runs full analysis', async () => {
    const input = await loadInput();
    const opts = {...noFlags(), onlySection: ['obfuscation']};
    const envelope = await runAnalysis(input, opts);

    expect(envelope.sections.every((s) => s.id === 'obfuscation')).toBe(true);
    expect(envelope.meta.analysis.sections).toContain('api-surface');
  });
});
