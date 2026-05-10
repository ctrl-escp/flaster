import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';
import {describe, it, expect, vi} from 'vitest';
import {defineComponent, h} from 'vue';
import {mount} from '@vue/test-utils';
import {Arborist} from 'flast/src/arborist.js';
import {
  runKnownStructureMatcher,
  runKnownStructureTransform,
} from '../../src/integrations/restringer/index.js';
import {
  getDefaultSelectedStructureIds,
  runKnownStructureMatchingSession,
} from '../../src/integrations/restringer/matchingEngine.js';
import {composeTransformationScript} from '../../src/domain/export/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');

function readText(relativePath) {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

async function loadStoreFresh() {
  vi.resetModules();
  const mod = await import('../../src/store.js');
  return mod.default;
}

describe('Phase 0 smoke — core flows', () => {
  it('happy-dom + Vue Test Utils mount', () => {
    const Comp = defineComponent({
      name: 'SmokeHost',
      setup: () => () => h('div', {class: 'smoke'}, 'ok'),
    });
    const wrapper = mount(Comp);
    expect(wrapper.get('.smoke').text()).toBe('ok');
  });

  it('parses the starter script successfully', () => {
    const starterSource = readText('src/initialScript.js');
    const arb = new Arborist(starterSource);
    expect(arb.ast?.length).toBeGreaterThan(0);
  });

  it('runs known-structure detection on a bundled sample', async () => {
    const sample = readText('public/sample-scripts/array_replacements.js');
    const arb = new Arborist(sample);
    const session = await runKnownStructureMatchingSession(arb, getDefaultSelectedStructureIds());
    expect(Object.values(session.errors).filter(Boolean).length).toBe(0);
    expect(session.totalMatches).toBeGreaterThan(0);
  });

  it('applies one known safe transformation', () => {
    const sampleScript = `
function proxy(a, b) { return target(a, b); }
const alias = original;
const out = proxy(one, two);
console['log'](\`ok\`);
`;
    const arb = new Arborist(sampleScript);
    const transformMatches = runKnownStructureMatcher(arb, 'computed-members');
    expect(transformMatches.error).toBeFalsy();
    expect(transformMatches.count).toBeGreaterThan(0);
    const transformResult = runKnownStructureTransform(
      arb,
      'computed-members',
      transformMatches.rawMatches[0],
    );
    expect(transformResult.pendingChanges).toBeGreaterThan(0);
  });

  it('replays a two-step pipeline via the store', async () => {
    const sampleScript = `
function proxy(a, b) { return target(a, b); }
const alias = original;
const out = proxy(one, two);
console['log'](\`ok\`);
`;
    const store = await loadStoreFresh();
    store.states.length = 0;
    store.steps = [];
    store.setCurrentScriptSource({baselineContent: sampleScript, label: 'Smoke'});
    await store.loadNewScript(sampleScript);

    const stepComputed = {
      kind: 'known-structure-transform',
      enabled: true,
      templateType: 'apply-known-transform',
      selectionSource: {kind: 'known-structure', structureId: 'computed-members'},
      params: {structureId: 'computed-members'},
    };
    const stepProxy = {
      kind: 'known-structure-transform',
      enabled: true,
      templateType: 'apply-known-transform',
      selectionSource: {kind: 'known-structure', structureId: 'proxy-calls'},
      params: {structureId: 'proxy-calls'},
    };

    const ok = await store.replayPipelineSteps([stepComputed, stepProxy], {
      selectedPipelineStepIndex: 1,
      successMessage: 'Replayed',
    });
    expect(ok).toBe(true);
    expect(store.steps.length).toBe(2);
    expect(() => new Arborist(store.arb.script)).not.toThrow();
  });

  it('generates an export script for a known pipeline and passes node --check', () => {
    const sampleScript = `
function proxy(a, b) { return target(a, b); }
const alias = original;
const out = proxy(one, two);
console['log'](\`ok\`);
`;
    const arb = new Arborist(sampleScript);
    const transformMatches = runKnownStructureMatcher(arb, 'computed-members');
    const transformResult = runKnownStructureTransform(
      arb,
      'computed-members',
      transformMatches.rawMatches[0],
    );
    arb.applyChanges();

    const latestStep = {
      kind: 'known-structure-transform',
      structureId: 'computed-members',
      structureTitle: 'Computed Members',
      moduleName: 'normalizeComputed',
      matcherName: 'normalizeComputedMatch',
      transformName: transformResult.transformName ?? 'normalizeComputed',
      affectedMatchCount: transformMatches.count,
      appliedChanges: transformResult.pendingChanges ?? 0,
      appliedAt: new Date().toISOString(),
      sequenceIndex: 2,
    };

    const generatedScript = composeTransformationScript({
      steps: [
        {
          kind: 'custom',
          filters: [{enabled: true, src: "n.type === 'Identifier'"}],
          transformationCode: 'arb.markNode(n);',
        },
        latestStep,
      ],
      combineFilters(filters) {
        return filters.map((filter) => `(${filter})`).join(' && ');
      },
    });

    expect(generatedScript).toContain("from 'flast'");
    expect(generatedScript).toContain('Generated via flASTer');

    const dir = mkdtempSync(join(tmpdir(), 'flaster-export-'));
    try {
      const file = join(dir, 'flaster.mjs');
      writeFileSync(file, generatedScript, 'utf8');
      const result = spawnSync(process.execPath, ['--check', file], {encoding: 'utf8'});
      expect(result.status, result.stderr).toBe(0);
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }
  });
});
