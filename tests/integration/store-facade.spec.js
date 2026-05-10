import {describe, it, expect, vi, afterEach} from 'vitest';
import {toRaw} from 'vue';
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

  it('covers parse → match → transform → pipeline replay → export', async () => {
    vi.stubGlobal('confirm', () => true);

    const store = createAppStore();
    store.states.length = 0;
    store.steps = [];
    store.setCurrentScriptSource({
      baselineContent: computedMembersSample,
      label: 'Facade integration',
    });
    await store.loadNewScript(computedMembersSample);

    expect(store.arb.ast?.length ?? 0).toBeGreaterThan(0);

    store.setSelectedKnownStructureIds(['computed-members']);
    store.setActiveKnownStructure('computed-members');
    await store.runKnownStructureMatching(['computed-members']);
    expect(store.getKnownStructureMatches('computed-members').length).toBeGreaterThan(0);

    await store.previewKnownStructureTransform('computed-members');
    const applied = await store.applyKnownStructureTransform('computed-members');
    expect(applied).toBe(true);
    expect(store.steps.length).toBeGreaterThanOrEqual(1);

    const replayed = await store.replayPipelineSteps([...store.steps], {
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

  it('does not activate or inspect a structure after matching when none was active', async () => {
    const store = createAppStore();
    store.setCurrentScriptSource({
      baselineContent: computedMembersSample,
      label: 'No prior active structure',
    });
    await store.loadNewScript(computedMembersSample);

    expect(store.getKnownStructureMatches('computed-members').length).toBeGreaterThan(0);
    store.setActiveKnownStructure(null);
    expect(store.activeKnownStructureId).toBeNull();

    await store.runKnownStructureMatching(['computed-members']);
    expect(store.getKnownStructureMatches('computed-members').length).toBeGreaterThan(0);
    expect(store.activeKnownStructureId).toBeNull();
    expect(store.inspectedKnownStructureId).toBeNull();
  });

  it('applyArboristToWorkspace updates editor text and store arb without clearing via resetParsedState', async () => {
    const store = createAppStore();
    let docText = 'const x = 1;\n';
    const inputEditorId = store.editorIds.inputCodeEditor;
    const inputEditor = {
      editorId: inputEditorId,
      state: {
        doc: {
          get length() {
            return docText.length;
          },
          toString() {
            return docText;
          },
        },
      },
      dispatch({changes}) {
        let text = docText;
        for (const ch of changes) {
          if (Number.isInteger(ch.from)) {
            const end = Number.isInteger(ch.to) ? ch.to : ch.from;
            text = `${text.slice(0, ch.from)}${ch.insert ?? ''}${text.slice(end)}`;
          }
        }
        docText = text;
      },
      highlightRange: vi.fn(),
      isParsed: false,
    };
    store.editors.push(inputEditor);
    store.markParsedToolbarIcon = vi.fn();

    const arb = new Arborist('const x = 1;\n');
    const ok = await store.applyArboristToWorkspace(arb);

    expect(ok).toBe(true);
    expect(toRaw(store.arb)).toBe(arb);
    expect(docText).toBe('const x = 1;\n');
    expect(store.isCurrentInputParsed()).toBe(true);
    expect(store.markParsedToolbarIcon).toHaveBeenCalled();
  });
});
