import {describe, it, expect, vi, afterEach} from 'vitest';
import {Arborist} from 'flast/src/arborist.js';
import {createAppStore} from '../../src/app/createAppStore.js';
import {composeTransformationScript} from '../../src/domain/export/index.js';

const computedMembersSample = `
function proxy(a, b) { return target(a, b); }
const alias = original;
const out = proxy(one, two);
console['log'](\`ok\`);
`;

describe('store facade integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('covers parse → match → transform → pipeline replay → export', () => {
    vi.stubGlobal('confirm', () => true);

    const store = createAppStore();
    store.states.length = 0;
    store.steps = [];
    store.setCurrentScriptSource({
      baselineContent: computedMembersSample,
      label: 'Facade integration',
    });
    store.loadNewScript(computedMembersSample);

    expect(store.arb.ast?.length ?? 0).toBeGreaterThan(0);

    store.setSelectedKnownStructureIds(['computed-members']);
    store.setActiveKnownStructure('computed-members');
    store.runKnownStructureMatching(['computed-members']);
    expect(store.getKnownStructureMatches('computed-members').length).toBeGreaterThan(0);

    store.previewKnownStructureTransform('computed-members');
    const applied = store.applyKnownStructureTransform('computed-members');
    expect(applied).toBe(true);
    expect(store.steps.length).toBeGreaterThanOrEqual(1);

    const replayed = store.replayPipelineSteps([...store.steps], {
      selectedPipelineStepIndex: store.steps.length - 1,
      successMessage: 'Replay ok',
    });
    expect(replayed).toBe(true);
    expect(() => new Arborist(store.arb.script)).not.toThrow();

    const generatedScript = composeTransformationScript({
      steps: store.steps,
      combineFilters: store.combineFilters,
      resolveStructureFilter: store.copyKnownStructureRuleSeed.bind(store),
    });

    expect(generatedScript).toContain("from 'flast'");
    expect(generatedScript).toContain('Generated via flASTer');
  });

  it('selects a matched structure after matching when none was active (Transform UI stays usable)', () => {
    const store = createAppStore();
    store.setCurrentScriptSource({
      baselineContent: computedMembersSample,
      label: 'No prior active structure',
    });
    store.loadNewScript(computedMembersSample);

    expect(store.getKnownStructureMatches('computed-members').length).toBeGreaterThan(0);
    store.setActiveKnownStructure(null);
    expect(store.activeKnownStructureId).toBeNull();

    store.runKnownStructureMatching(['computed-members']);
    expect(store.getKnownStructureMatches('computed-members').length).toBeGreaterThan(0);
    expect(store.activeKnownStructureId).toBe('computed-members');
    expect(store.inspectedKnownStructureId).toBe('computed-members');
  });
});
