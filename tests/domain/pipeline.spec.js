import {Arborist} from 'flast/src/arborist.js';
import {describe, expect, it, vi} from 'vitest';
import {
  createStep,
  finalizePipelineStepForStorage,
  getPipelineSaveWarningForStructure,
  normalizePipelineStepEntry,
  pipelineStepsReferenceStructureId,
} from '../../src/domain/pipeline/pipelineModel.js';
import {
  addStep,
  moveStepAtIndex,
  removeStep,
  setStepEnabledAtIndex,
} from '../../src/domain/pipeline/pipelineMutations.js';
import {replayPipeline} from '../../src/domain/pipeline/pipelineReplay.js';
import {createPipelineStepExecutor} from '../../src/domain/pipeline/pipelineStepRunner.js';

describe('pipelineModel', () => {
  it('createStep is deterministic when now and id are fixed', () => {
    const a = createStep(
      {kind: 'known-structure-transform', structureId: 'x', label: 'Apply X'},
      {now: '2020-01-01T00:00:00.000Z', id: 's1'},
    );
    const b = createStep(
      {kind: 'known-structure-transform', structureId: 'x', label: 'Apply X'},
      {now: '2020-01-01T00:00:00.000Z', id: 's1'},
    );
    expect(a).toEqual(b);
    expect(a.id).toBe('s1');
    expect(a.createdAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('finalize preserves existing id across re-normalization', () => {
    const first = finalizePipelineStepForStorage(
      normalizePipelineStepEntry({kind: 'custom', transformationCode: 'return;'}),
      {id: 'stable', now: 't'},
    );
    const second = finalizePipelineStepForStorage(
      normalizePipelineStepEntry(first),
      {now: 'other'},
    );
    expect(second.id).toBe('stable');
  });

  it('detects pipeline references to a structure id', () => {
    const steps = [
      createStep(
        {
          kind: 'known-structure-transform',
          selectionSource: {kind: 'known-structure', structureId: 'computed-members'},
          params: {structureId: 'computed-members'},
        },
        {id: 'a', now: 't'},
      ),
    ];
    expect(pipelineStepsReferenceStructureId(steps, 'computed-members')).toBe(true);
    expect(pipelineStepsReferenceStructureId(steps, 'other')).toBe(false);
  });

  it('surfaces save warning when pipeline references structure', () => {
    const steps = [
      createStep(
        {
          kind: 'known-structure-transform',
          structureId: 'computed-members',
          selectionSource: {kind: 'known-structure', structureId: 'computed-members'},
        },
        {id: 'a', now: 't'},
      ),
    ];
    const msg = getPipelineSaveWarningForStructure(steps, 'computed-members');
    expect(msg).toContain('pipeline baseline');
  });
});

describe('pipelineMutations', () => {
  it('addStep does not mutate the input array', () => {
    const a = [{id: '1', label: 'x'}];
    const b = addStep(a, {id: '2', label: 'y'});
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(2);
  });

  it('removeStep filters by id', () => {
    const steps = [{id: 'a'}, {id: 'b'}];
    expect(removeStep(steps, 'a')).toEqual([{id: 'b'}]);
  });

  it('moveStepAtIndex swaps order and renumbers sequenceIndex', () => {
    const steps = [
      {id: 'a', sequenceIndex: 1},
      {id: 'b', sequenceIndex: 2},
      {id: 'c', sequenceIndex: 3},
    ];
    const next = moveStepAtIndex(steps, 1, 1);
    expect(next.map((s) => s.id)).toEqual(['a', 'c', 'b']);
    expect(next.map((s) => s.sequenceIndex)).toEqual([1, 2, 3]);
  });

  it('setStepEnabledAtIndex returns same reference on invalid index', () => {
    const steps = [{id: 'a', enabled: true}];
    expect(setStepEnabledAtIndex(steps, -1, false)).toBe(steps);
  });
});

describe('replayPipeline', () => {
  it('skips disabled steps and stays deterministic for append-only executor', async () => {
    const executor = vi.fn((step, source) => ({
      isDone: true,
      changesCount: 1,
      source: `${source}:${step.tag}`,
      structureName: null,
      transformName: '',
      error: null,
    }));

    const out = await replayPipeline({
      baselineSource: 'base',
      steps: [
        {id: '1', enabled: true, tag: 'a'},
        {id: '2', enabled: false, tag: 'skip'},
        {id: '3', enabled: true, tag: 'b'},
      ],
      executor,
    });

    expect(out.ok).toBe(true);
    expect(out.source).toBe('base:a:b');
    expect(executor).toHaveBeenCalledTimes(2);
  });

  it('returns last successful source and step id on failure', async () => {
    const executor = vi.fn((step, source) => {
      if (step.id === 'bad') {
        return {
          isDone: false,
          changesCount: 0,
          source,
          structureName: null,
          transformName: '',
          error: new Error('boom'),
        };
      }

      return {
        isDone: true,
        changesCount: 0,
        source: `${source}>${step.id}`,
        structureName: null,
        transformName: '',
        error: null,
      };
    });

    const out = await replayPipeline({
      baselineSource: '0',
      steps: [{id: 'ok', enabled: true}, {id: 'bad', enabled: true}],
      executor,
    });

    expect(out.ok).toBe(false);
    expect(out.failedStepId).toBe('bad');
    expect(out.lastSuccessfulSource).toBe('0>ok');
    expect(out.source).toBe('0>ok');
  });

  it('replays known-structure steps without Vue', async () => {
    const sampleScript = `
function proxy(a, b) { return target(a, b); }
const alias = original;
const out = proxy(one, two);
console['log'](\`ok\`);
`;
    const executor = createPipelineStepExecutor({});
    const step1 = normalizePipelineStepEntry({
      kind: 'known-structure-transform',
      enabled: true,
      templateType: 'apply-known-transform',
      selectionSource: {kind: 'known-structure', structureId: 'computed-members'},
      params: {structureId: 'computed-members'},
    });
    const step2 = normalizePipelineStepEntry({
      kind: 'known-structure-transform',
      enabled: true,
      templateType: 'apply-known-transform',
      selectionSource: {kind: 'known-structure', structureId: 'proxy-calls'},
      params: {structureId: 'proxy-calls'},
    });

    const out = await replayPipeline({
      baselineSource: sampleScript,
      steps: [step1, step2],
      executor,
    });

    expect(out.ok).toBe(true);
    expect(out.source.length).toBeGreaterThan(0);
    expect(() => new Arborist(out.source)).not.toThrow();
  });
});
