import {describe, it, expect} from 'vitest';
import {enrichReportFindings, EVIDENCE_SNIPPET_MAX} from '../../../src/domain/cli/enrichReportFindings.js';

function makeNode(src, range = [0, src.length]) {
  return {src, range, type: 'Identifier'};
}

function makeStore(matchesById) {
  return {
    getKnownStructureMatches(id) {
      return matchesById[id] ?? [];
    },
    getKnownStructureById(id) {
      return {
        id,
        description: `Description for ${id}`,
        codeExample: `// example for ${id}`,
      };
    },
  };
}

describe('enrichReportFindings', () => {
  it('always attaches a truncated source excerpt on evidence rows', () => {
    const longSrc = 'x'.repeat(150);
    const sections = [{
      id: 'obfuscation',
      findings: [{
        id: 'test-structure',
        kind: 'structure',
        structureId: 'test-structure',
        title: 'Test',
        matchCount: 1,
      }],
    }];
    const store = makeStore({
      'test-structure': [{relevantNode: makeNode(longSrc)}],
    });

    enrichReportFindings(sections, store, longSrc, false);

    const snippet = sections[0].findings[0].evidence[0].snippet;
    expect(snippet.length).toBeLessThanOrEqual(EVIDENCE_SNIPPET_MAX + 1);
    expect(snippet.endsWith('…')).toBe(true);
  });

  it('adds snippetFull when --full is set', () => {
    const src = 'const answer = 42;';
    const sections = [{
      id: 'obfuscation',
      findings: [{
        id: 'test-structure',
        kind: 'structure',
        structureId: 'test-structure',
        title: 'Test',
        matchCount: 1,
      }],
    }];
    const store = makeStore({
      'test-structure': [{relevantNode: makeNode(src)}],
    });

    enrichReportFindings(sections, store, src, {full: true});

    const row = sections[0].findings[0].evidence[0];
    expect(row.snippet).toBe(src);
    expect(row.snippetFull).toBeUndefined();
  });

  it('attaches codeExample for HTML guide mode', () => {
    const sections = [{
      id: 'obfuscation',
      findings: [{
        id: 'test-structure',
        kind: 'structure',
        structureId: 'test-structure',
        title: 'Test',
        matchCount: 1,
      }],
    }];
    const store = makeStore({
      'test-structure': [{relevantNode: makeNode('a')}],
    });

    enrichReportFindings(sections, store, 'a', {includeFindingGuide: true});

    const finding = sections[0].findings[0];
    expect(finding.description).toContain('test-structure');
    expect(finding.codeExample).toContain('test-structure');
  });

  it('strips guide fields in summary JSON mode', () => {
    const sections = [{
      id: 'obfuscation',
      findings: [{
        id: 'test-structure',
        kind: 'structure',
        structureId: 'test-structure',
        title: 'Test',
        description: 'from collector',
        matchCount: 1,
      }],
    }];
    const store = makeStore({
      'test-structure': [{relevantNode: makeNode('a')}],
    });

    enrichReportFindings(sections, store, 'a', false);

    expect(sections[0].findings[0].description).toBeUndefined();
    expect(sections[0].findings[0].codeExample).toBeUndefined();
  });
});
