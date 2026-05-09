import {describe, it, expect} from 'vitest';
import {Arborist} from 'flast/src/arborist.js';
import {
  compileNodePredicate,
  normalizeCustomTransformRunSettings,
  runCustomTransformExecution,
} from '../../src/domain/transforms/customTransformRuntime.js';

describe('customTransformRuntime', () => {
  it('compileNodePredicate matches expression-style filters', () => {
    const pred = compileNodePredicate('n.type === \'Identifier\' && n.name === \'x\'');
    const arb = new Arborist('const x = 1;');
    const id = arb.ast.find((node) => node.type === 'Identifier' && node.name === 'x');
    expect(pred(id)).toBe(true);
  });

  it('normalizeCustomTransformRunSettings honors metadata over draft', () => {
    const s = normalizeCustomTransformRunSettings(
      {runMode: 'once', maxIterations: 5},
      {runMode: 'until-stable', maxIterations: 99},
    );
    expect(s.runMode).toBe('once');
    expect(s.maxIterations).toBe(1);
  });

  it('runs a per-node custom transform that applies edits', () => {
    const arb = new Arborist('const x = 1;');
    const result = runCustomTransformExecution(arb, {
      body: 'arb.markNode(n);',
      structureId: null,
      candidateFilters: [{enabled: true, src: "n.type === 'VariableDeclaration'"}],
      runSettings: normalizeCustomTransformRunSettings({runMode: 'once'}, {}),
    });

    expect(result.isDone).toBe(true);
    expect(result.error).toBeNull();
    expect(result.changesCount).toBeGreaterThan(0);
    expect(result.structureName).toBeNull();
    expect(result.transformName).toBe('custom');
    expect(result.source).not.toBe('const x = 1;');
  });

  it('returns completed zero-change run when the body makes no edits', () => {
    const arb = new Arborist('const x = 1;');
    const before = arb.script;
    const result = runCustomTransformExecution(arb, {
      body: '// no-op',
      structureId: null,
      candidateFilters: [],
      runSettings: normalizeCustomTransformRunSettings({runMode: 'once'}, {}),
    });

    expect(result.isDone).toBe(true);
    expect(result.changesCount).toBe(0);
    expect(result.source).toBe(before);
  });

  it('returns failure without treating thrown user errors as success', () => {
    const arb = new Arborist('const x = 1;');
    const before = arb.script;
    const result = runCustomTransformExecution(arb, {
      body: 'throw new Error("user transform");',
      structureId: null,
      candidateFilters: [],
      runSettings: normalizeCustomTransformRunSettings({runMode: 'once'}, {}),
    });

    expect(result.isDone).toBe(false);
    expect(result.changesCount).toBe(0);
    expect(result.error?.message).toContain('user transform');
    expect(result.source).toBe(before);
  });

  it('rejects malformed transform bodies', () => {
    const arb = new Arborist('const x = 1;');
    const result = runCustomTransformExecution(arb, {
      body: 'function (((invalid',
      structureId: null,
      candidateFilters: [],
      runSettings: normalizeCustomTransformRunSettings({runMode: 'once'}, {}),
    });

    expect(result.isDone).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.changesCount).toBe(0);
  });
});
