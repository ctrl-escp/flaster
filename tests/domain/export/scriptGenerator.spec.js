import {mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {tmpdir} from 'node:os';
import {describe, it, expect} from 'vitest';
import {Arborist} from 'flast/src/arborist.js';
import {
  assertNoBrowserOnlyGlobalsInExport,
  assertNoExportScriptPlaceholders,
  composeTransformationScript,
} from '../../../src/domain/export/index.js';
import {executeKnownStructureTransformApply} from '../../../src/domain/transforms/transformExecutor.js';
import {
  runKnownStructureMatcher,
  runKnownStructureTransform,
} from '../../../src/integrations/restringer/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');

const COMPUTED_MEMBERS_FIXTURE = `
function proxy(a, b) { return target(a, b); }
const alias = original;
const out = proxy(one, two);
console['log'](\`ok\`);
`;

function buildComputedMembersStep(overrides = {}) {
  const arb = new Arborist(COMPUTED_MEMBERS_FIXTURE);
  const transformMatches = runKnownStructureMatcher(arb, 'computed-members');
  const transformResult = runKnownStructureTransform(
    arb,
    'computed-members',
    transformMatches.rawMatches[0],
  );
  arb.applyChanges();

  return {
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
    ...overrides,
  };
}

describe('domain/export scriptGenerator', () => {
  it('includes expected imports and header for a known-structure pipeline', () => {
    const script = composeTransformationScript({
      steps: [buildComputedMembersStep()],
    });

    expect(script).toContain("import fs from 'node:fs';");
    expect(script).toContain("from 'flast'");
    expect(script).not.toContain('treeModifier');
    expect(script).toContain('compactScopes: true');
    expect(script).toContain('retainTokens: false');
    expect(script).toContain("from 'restringer/src/modules/safe/normalizeComputed.js'");
    expect(script).toContain('Generated via flASTer');
    expect(script).toContain('applyKnownStructureTransformStep(script, normalizeComputed)');
  });

  it('rejects TODO-style placeholders in emitted output', () => {
    expect(() => assertNoExportScriptPlaceholders('export const x = 1;\n// TODO fixme')).toThrow(/TODO marker/);
    expect(() => assertNoExportScriptPlaceholders('// only staged\n// TODO(Stage 99) broken')).toThrow(
      /staged TODO placeholder/,
    );
  });

  it('omits disabled steps from emitted pipeline', () => {
    const enabled = buildComputedMembersStep({enabled: true});
    const disabled = buildComputedMembersStep({enabled: false, sequenceIndex: 1});

    const script = composeTransformationScript({
      steps: [disabled, enabled],
    });

    const stepHeaders = [...script.matchAll(/^\/\/ Step \d+:/gm)];
    expect(stepHeaders).toHaveLength(1);
    expect(stepHeaders[0][0]).toBe('// Step 1:');
  });

  it('does not emit browser-only globals', () => {
    const script = composeTransformationScript({
      steps: [buildComputedMembersStep()],
    });
    expect(() => assertNoBrowserOnlyGlobalsInExport(script)).not.toThrow();
  });

  it('generates ESM that passes node --check', () => {
    const script = composeTransformationScript({
      steps: [buildComputedMembersStep()],
    });

    const dir = mkdtempSync(join(tmpdir(), 'flaster-export-spec-'));
    try {
      const file = join(dir, 'flaster.mjs');
      writeFileSync(file, script, 'utf8');
      const result = spawnSync(process.execPath, ['--check', file], {encoding: 'utf8'});
      expect(result.status, result.stderr).toBe(0);
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }
  });

  it('matches runtime transform output for computed-members (export parity)', async () => {
    const arb = new Arborist(COMPUTED_MEMBERS_FIXTURE);
    const runtime = await executeKnownStructureTransformApply(arb, 'computed-members');
    expect(runtime.isDone).toBe(true);
    expect(runtime.error).toBeNull();
    const expectedSource = runtime.source;

    const generatedScript = composeTransformationScript({
      steps: [buildComputedMembersStep()],
    });

    const cacheBase = join(repoRoot, 'node_modules', '.cache', 'flaster-parity-tests');
    mkdirSync(cacheBase, {recursive: true});
    const dir = mkdtempSync(join(cacheBase, 'run-'));
    try {
      const genPath = join(dir, 'flaster.mjs');
      const inputPath = join(dir, 'input.js');
      writeFileSync(genPath, generatedScript, 'utf8');
      writeFileSync(inputPath, COMPUTED_MEMBERS_FIXTURE, 'utf8');

      const run = spawnSync(process.execPath, [genPath, inputPath], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      expect(run.status, run.stderr + run.stdout).toBe(0);

      const outPath = `${inputPath}-flastered.js`;
      const produced = readFileSync(outPath, 'utf8');
      expect(produced).toBe(expectedSource);
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }
  });
});
