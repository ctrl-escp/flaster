import {describe, it, expect} from 'vitest';
import {buildReportModel, resolveReportStatus} from '../../../src/domain/report/index.js';

function createStore(overrides = {}) {
  const structures = overrides.availableKnownStructures ?? [
    {
      id: 'proxy-vars',
      title: 'Proxy Variables',
      category: 'proxying',
      categoryGroup: 'obfuscation',
    },
    {
      id: 'window-inner-width',
      title: 'window.innerWidth',
      category: 'window-geometry',
      categoryGroup: 'api-surface',
    },
  ];

  return {
    arb: {ast: [{nodeId: 'n1', type: 'Literal', value: 1}]},
    apiSurfaceStatus: 'done',
    knownStructureExecutionStatus: {state: 'idle'},
    capabilities: overrides.capabilities ?? [],
    apiDetectorHits: overrides.apiDetectorHits ?? {},
    availableKnownStructures: structures,
    getKnownStructureMatches(structureId) {
      return overrides.matchesById?.[structureId] ?? [];
    },
    ...overrides,
  };
}

describe('report model', () => {
  it('reports idle when no AST is loaded', () => {
    const store = createStore({arb: null});
    expect(resolveReportStatus(store)).toBe('idle');
    expect(buildReportModel(store).sections).toEqual([]);
  });

  it('aggregates obfuscation, API surface, and capability sections', () => {
    const store = createStore({
      matchesById: {
        'proxy-vars': [{structureId: 'proxy-vars', metadata: {matchOrdinal: 0}}],
        'window-inner-width': [{structureId: 'window-inner-width', metadata: {matchOrdinal: 0}}],
      },
      apiDetectorHits: {
        'window-inner-width': [{extractions: {value: {values: ['640']}}}],
      },
      capabilities: [{
        id: 'devtools-size-probe',
        title: 'DevTools Size Probe',
        description: 'Probe',
        risk: 'benign',
        riskReason: 'Benign',
        firedDetectorIds: ['window-inner-width'],
      }],
    });

    const report = buildReportModel(store);

    expect(report.status).toBe('done');
    expect(report.totalFindings).toBe(3);
    expect(report.sections.map((section) => section.id)).toEqual([
      'capabilities',
      'obfuscation',
      'api-surface',
    ]);
  });
});
