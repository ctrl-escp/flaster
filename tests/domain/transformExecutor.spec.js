import {describe, it, expect} from 'vitest';
import {Arborist} from 'flast/src/arborist.js';
import {executeKnownStructureTransformApply} from '../../src/domain/transforms/transformExecutor.js';
import {runKnownStructureMatcher} from '../../src/integrations/restringer/index.js';

describe('transformExecutor', () => {
  it('completes a built-in safe transform with changesCount > 0', () => {
    const sampleScript = `
function proxy(a, b) { return target(a, b); }
const alias = original;
const out = proxy(one, two);
console['log'](\`ok\`);
`;
    const arb = new Arborist(sampleScript);
    const result = executeKnownStructureTransformApply(arb, 'computed-members');

    expect(result.isDone).toBe(true);
    expect(result.error).toBeNull();
    expect(result.changesCount).toBeGreaterThan(0);
    expect(result.transformName.length).toBeGreaterThan(0);
    expect(result.structureName).toBe('computed-members');
    expect(typeof result.source).toBe('string');
    expect(result.source.length).toBeGreaterThan(0);
  });

  it('returns a completed no-op when the matcher finds nothing to change', () => {
    const arb = new Arborist('const only = 42;');
    const matchRun = runKnownStructureMatcher(arb, 'computed-members');
    expect(matchRun.error).toBeFalsy();
    expect(matchRun.count).toBe(0);

    const result = executeKnownStructureTransformApply(arb, 'computed-members');
    expect(result.isDone).toBe(true);
    expect(result.error).toBeNull();
    expect(result.changesCount).toBe(0);
    expect(result.source).toBe(arb.script);
  });

  it('returns structured failure for unknown structure ids without applying edits', () => {
    const script = 'const x = 1;';
    const arb = new Arborist(script);
    const before = arb.script;

    const result = executeKnownStructureTransformApply(arb, 'not-a-real-structure-id');

    expect(result.isDone).toBe(false);
    expect(result.changesCount).toBe(0);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.source).toBe(before);
  });
});
