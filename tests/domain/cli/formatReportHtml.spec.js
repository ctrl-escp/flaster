import {describe, it, expect} from 'vitest';
import {formatReportHtml} from '../../../src/domain/cli/formatReportHtml.js';

function makeEnvelope(overrides = {}) {
  return {
    meta: {
      flasterVersion: '1.0.2',
      flastVersion: '2.0.0',
      restringerVersion: '2.2.0',
      input: {kind: 'file', path: '/tmp/sample.js', label: '/tmp/sample.js'},
      analyzedAt: '2026-01-01T00:00:00.000Z',
      parse: {ok: true, diagnostics: []},
      analysis: {sections: ['obfuscation', 'api-surface'], structureIds: [], skippedNonNoEvalCount: 0},
      report: {onlySections: null, excludeSections: null, fullDetail: false},
    },
    status: 'done',
    totalFindings: 0,
    sections: [],
    ...overrides,
  };
}

function makeStructureFinding(overrides = {}) {
  return {
    id: 'array-replacements',
    kind: 'structure',
    structureId: 'array-replacements',
    title: 'Array Replacements',
    category: 'arrays',
    matchCount: 2,
    evidence: [
      {line: 1, column: 5, endLine: 1, endColumn: 20, charStart: 4, charEnd: 19},
      {line: 3, column: 1, endLine: 3, endColumn: 10, charStart: 30, charEnd: 39},
    ],
    ...overrides,
  };
}

function makeCapabilityFinding(overrides = {}) {
  return {
    id: 'devtools-probe',
    kind: 'capability',
    title: 'DevTools Size Probe',
    description: 'Probes screen dimensions.',
    risk: 'medium',
    riskReason: 'May fingerprint user environment.',
    firedDetectorIds: ['window-inner-width', 'screen-width'],
    matchCount: 3,
    evidence: [
      {line: 5, column: 3, endLine: 5, endColumn: 18, charStart: 50, charEnd: 65},
    ],
    ...overrides,
  };
}

describe('formatReportHtml', () => {
  it('returns a complete HTML5 document', () => {
    const html = formatReportHtml(makeEnvelope());
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
  });

  it('includes the input label in the title and meta', () => {
    const html = formatReportHtml(makeEnvelope());
    expect(html).toContain('/tmp/sample.js');
  });

  it('shows "No findings" when sections is empty', () => {
    const html = formatReportHtml(makeEnvelope({totalFindings: 0, sections: []}));
    expect(html).toContain('No findings');
  });

  it('does not reference external stylesheets or scripts', () => {
    const html = formatReportHtml(makeEnvelope());
    expect(html).not.toMatch(/href=["'][^"']*\.css["']/);
    expect(html).not.toMatch(/src=["'][^"']*\.js["']/);
    expect(html).not.toMatch(/<link[^>]*rel=["']stylesheet["']/);
  });

  it('includes inline <style>', () => {
    const html = formatReportHtml(makeEnvelope());
    expect(html).toContain('<style>');
    expect(html).toContain('</style>');
  });

  it('renders a structure finding with title and match count', () => {
    const finding = makeStructureFinding();
    const envelope = makeEnvelope({
      totalFindings: 2,
      sections: [{id: 'obfuscation', filterId: 'obfuscation', title: 'Obfuscation', helperCopy: '', findings: [finding]}],
    });
    const html = formatReportHtml(envelope);
    expect(html).toContain('Array Replacements');
    expect(html).toContain('2 matches');
  });

  it('renders evidence locations for a structure finding', () => {
    const finding = makeStructureFinding();
    const envelope = makeEnvelope({
      totalFindings: 1,
      sections: [{id: 'obfuscation', filterId: 'obfuscation', title: 'Obfuscation', helperCopy: '', findings: [finding]}],
    });
    const html = formatReportHtml(envelope);
    expect(html).toContain('1:5');
    expect(html).toContain('3:1');
  });

  it('renders a capability finding with risk badge and fired detectors', () => {
    const finding = makeCapabilityFinding();
    const envelope = makeEnvelope({
      totalFindings: 1,
      sections: [{id: 'capabilities', filterId: 'api-surface', title: 'Capabilities', helperCopy: '', findings: [finding]}],
    });
    const html = formatReportHtml(envelope);
    expect(html).toContain('DevTools Size Probe');
    expect(html).toContain('medium');
    expect(html).toContain('window-inner-width');
    expect(html).toContain('screen-width');
  });

  it('escapes HTML special characters in finding titles', () => {
    const finding = makeStructureFinding({title: '<script>alert("xss")</script>'});
    const envelope = makeEnvelope({
      totalFindings: 1,
      sections: [{id: 'obfuscation', filterId: 'obfuscation', title: 'Obfuscation', helperCopy: '', findings: [finding]}],
    });
    const html = formatReportHtml(envelope);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders report sections as collapsed details elements', () => {
    const finding = makeStructureFinding();
    const envelope = makeEnvelope({
      totalFindings: 1,
      sections: [{id: 'obfuscation', filterId: 'obfuscation', title: 'Obfuscation', helperCopy: 'Helper', findings: [finding]}],
    });
    const html = formatReportHtml(envelope);
    expect(html).toContain('<details class="report-section"');
    expect(html).not.toMatch(/<details class="report-section"[^>]* open/);
  });

  it('renders structure guide and illustrative example when present', () => {
    const finding = makeStructureFinding({
      description: 'Matches large array literals used for indirection.',
      codeExample: 'const table = [1, 2, 3];',
    });
    const envelope = makeEnvelope({
      totalFindings: 1,
      sections: [{id: 'obfuscation', filterId: 'obfuscation', title: 'Obfuscation', helperCopy: '', findings: [finding]}],
    });
    const html = formatReportHtml(envelope);
    expect(html).toContain('What this is');
    expect(html).toContain('Illustrative example');
    expect(html).toContain('Matches large array literals');
    expect(html).toContain('const table = [1, 2, 3];');
  });

  it('renders snippets in evidence rows when present', () => {
    const finding = makeStructureFinding({
      evidence: [{
        line: 1, column: 5, endLine: 1, endColumn: 20, charStart: 4, charEnd: 19,
        snippet: 'var x = [1, 2, 3];',
      }],
    });
    const envelope = makeEnvelope({
      totalFindings: 1,
      sections: [{id: 'obfuscation', filterId: 'obfuscation', title: 'Obfuscation', helperCopy: '', findings: [finding]}],
    });
    const html = formatReportHtml(envelope);
    expect(html).toContain('var x = [1, 2, 3];');
  });

  it('renders extractions when present', () => {
    const finding = makeStructureFinding({
      extractions: [{role: 'delay-ms', values: ['7000']}],
    });
    const envelope = makeEnvelope({
      totalFindings: 1,
      sections: [{id: 'api-surface', filterId: 'api-surface', title: 'Detectors', helperCopy: '', findings: [finding]}],
    });
    const html = formatReportHtml(envelope);
    expect(html).toContain('delay-ms');
    expect(html).toContain('7000');
  });

  it('includes tool versions in the meta block', () => {
    const html = formatReportHtml(makeEnvelope());
    expect(html).toContain('1.0.2');
    expect(html).toContain('2.0.0');
    expect(html).toContain('2.2.0');
  });
});
