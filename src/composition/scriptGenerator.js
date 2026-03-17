import {getKnownStructure} from '../integrations/restringer/index.js';

/**
 * @typedef {{
 *   kind: 'custom',
 *   filters?: Array<{enabled?: boolean, src?: string}>,
 *   transformationCode?: string,
 * }} StoredCustomStep
 */

/**
 * @typedef {{
 *   kind: 'known-structure-transform',
 *   structureId: string,
 *   structureTitle?: string,
 *   moduleName?: string,
 *   matcherName?: string,
 *   transformName?: string,
 *   affectedMatchCount?: number,
 *   appliedChanges?: number,
 *   appliedAt?: string,
 *   sequenceIndex?: number,
 * }} StoredKnownStructureTransformStep
 */

/**
 * @typedef {StoredCustomStep | StoredKnownStructureTransformStep} StoredTransformationStep
 */

/**
 * @typedef {{
 *   importPath: string,
 *   specifiers: Set<string>,
 * }} GeneratedImportEntry
 */

const GENERATED_HEADER = '// Generated via flASTer (https://ctrl-escp.github.io/flaster)';

/**
 * Returns the default filename used when downloading a generated Node script.
 *
 * The composed script now targets Node ESM explicitly because both flAST and
 * REstringer ship as ESM packages.
 *
 * @returns {string}
 */
export function getGeneratedScriptFilename() {
  return 'flaster.mjs';
}

/**
 * Composes a complete Node script for the stored transformation pipeline.
 *
 * @param {{
 *   steps?: readonly StoredTransformationStep[],
 *   combineFilters?: (filters: string[]) => string,
 * }} [options={}]
 * @returns {string}
 */
export function composeTransformationScript(options = {}) {
  const steps = Array.isArray(options.steps) ? options.steps : [];
  const combineFilters = typeof options.combineFilters === 'function'
    ? options.combineFilters
    : createFallbackFilterCombiner;
  const importPlan = createImportPlan(steps);
  const runtimeBlocks = [];

  if (importPlan.needsKnownStructureRuntime) {
    runtimeBlocks.push(createKnownStructureRuntimeBlock());
  }

  const stepBlocks = steps.map((step, index) => {
    if (step?.kind === 'known-structure-transform') {
      return createKnownStructureStepBlock(step, index + 1);
    }

    return createCustomStepBlock(step, index + 1, combineFilters);
  });

  const scriptSections = [
    GENERATED_HEADER,
    '',
    createImportBlock(importPlan),
    '',
    ...runtimeBlocks,
    createPipelinePreamble(importPlan),
    ...stepBlocks,
    createPipelineEpilogue(),
  ].filter(Boolean);

  return `${scriptSections.join('\n')}\n`;
}

/**
 * Creates the import plan needed by the current pipeline.
 *
 * @param {readonly StoredTransformationStep[]} steps
 * @returns {{
 *   needsCustomRuntime: boolean,
 *   needsKnownStructureRuntime: boolean,
 *   flastSpecifiers: Set<string>,
 *   restringerImports: Map<string, GeneratedImportEntry>,
 * }}
 */
function createImportPlan(steps) {
  const flastSpecifiers = new Set();
  const restringerImports = new Map();
  let needsCustomRuntime = false;
  let needsKnownStructureRuntime = false;

  for (const step of steps) {
    if (step?.kind === 'known-structure-transform') {
      needsKnownStructureRuntime = true;
      flastSpecifiers.add('Arborist');

      const implementation = resolveKnownStructureImplementation(step);
      const importEntry = restringerImports.get(implementation.importPath) ?? {
        importPath: implementation.importPath,
        specifiers: new Set(),
      };

      importEntry.specifiers.add(implementation.matcherName);
      importEntry.specifiers.add(implementation.transformName);
      restringerImports.set(implementation.importPath, importEntry);
      continue;
    }

    needsCustomRuntime = true;
    flastSpecifiers.add('applyIteratively');
    flastSpecifiers.add('logger');
    flastSpecifiers.add('treeModifier');
  }

  return {
    needsCustomRuntime,
    needsKnownStructureRuntime,
    flastSpecifiers,
    restringerImports,
  };
}

/**
 * Creates the import section for the generated Node script.
 *
 * @param {ReturnType<typeof createImportPlan>} importPlan
 * @returns {string}
 */
function createImportBlock(importPlan) {
  const lines = ["import fs from 'node:fs';"];

  if (importPlan.flastSpecifiers.size) {
    lines.push(
      `import {${sortStrings([...importPlan.flastSpecifiers]).join(', ')}} from 'flast';`,
    );
  }

  for (const importEntry of [...importPlan.restringerImports.values()].sort((left, right) =>
    left.importPath.localeCompare(right.importPath),
  )) {
    lines.push(
      `import {${sortStrings([...importEntry.specifiers]).join(', ')}} from '${importEntry.importPath}';`,
    );
  }

  return lines.join('\n');
}

/**
 * Creates the initial pipeline setup for the generated script.
 *
 * @param {ReturnType<typeof createImportPlan>} importPlan
 * @returns {string}
 */
function createPipelinePreamble(importPlan) {
  const lines = [
    "const inputFilename = process.argv[2];",
    '',
    'if (!inputFilename) {',
    "  throw new Error('Pass an input filename as the first argument');",
    '}',
    '',
    "const originalCode = fs.readFileSync(inputFilename, 'utf8');",
    'let script = originalCode;',
  ];

  if (importPlan.needsCustomRuntime) {
    lines.push('', 'logger.setLogLevelNone();');
  }

  return lines.join('\n');
}

/**
 * Creates the final script output handling block.
 *
 * @returns {string}
 */
function createPipelineEpilogue() {
  return `if (script !== originalCode) {
  console.debug('[+] Transformation successful');
  console.log(script);
  fs.writeFileSync(\`\${inputFilename}-flastered.js\`, script, 'utf8');
} else {
  console.log('[-] Nothing transformed :/');
}`;
}

/**
 * Creates the code block for one custom filter + transform step.
 *
 * @param {StoredTransformationStep} step
 * @param {number} stepNumber
 * @param {(filters: string[]) => string} combineFilters
 * @returns {string}
 */
function createCustomStepBlock(step, stepNumber, combineFilters) {
  const enabledFilters = step?.kind === 'custom'
    ? step.filters?.filter((filter) => filter?.enabled && !!filter?.src) ?? []
    : [];
  const filter = enabledFilters.length
    ? combineFilters(enabledFilters.map((filter) => filter.src))
    : 'true';
  const transformationCode = step?.kind === 'custom' ? step.transformationCode ?? '' : '';

  return `/**
 * Step ${stepNumber}: Custom filter + transform
 */
script = applyIteratively(script, [
  treeModifier(
    (n, arb) => {return ${filter};},
    (n, arb) => {${transformationCode}}
  ),
]);
logger.setLogLevelLog();`;
}

/**
 * Creates the code block for one built-in known-structure transform step.
 *
 * @param {StoredKnownStructureTransformStep} step
 * @param {number} stepNumber
 * @returns {string}
 */
function createKnownStructureStepBlock(step, stepNumber) {
  const implementation = resolveKnownStructureImplementation(step);
  const structureTitle = step.structureTitle ?? implementation.structureTitle;

  return `/**
 * Step ${stepNumber}: Built-in known structure transform
 * Origin: ${structureTitle} (${implementation.structureId})
 * REstringer: ${implementation.moduleName}.${implementation.transformName}
 */
{
  const stepResult = applyKnownStructureTransformStep(script, {
    structureId: ${JSON.stringify(implementation.structureId)},
    structureTitle: ${JSON.stringify(structureTitle)},
    moduleName: ${JSON.stringify(implementation.moduleName)},
    matcherName: ${JSON.stringify(implementation.matcherName)},
    transformName: ${JSON.stringify(implementation.transformName)},
    runMatch: ${implementation.matcherName},
    runTransform: ${implementation.transformName},
  });

  script = stepResult.script;

  if (stepResult.appliedChanges > 0) {
    console.debug(
      \`[+] Step ${stepNumber} applied ${structureTitle} (\${stepResult.appliedChanges} changes across \${stepResult.matchCount} matches)\`,
    );
  } else {
    console.debug(
      \`[!] Step ${stepNumber} matched \${stepResult.matchCount} nodes but did not change the script\`,
    );
  }
}`;
}

/**
 * Resolves the REstringer implementation metadata needed for generated code.
 *
 * @param {StoredKnownStructureTransformStep} step
 * @returns {{
 *   structureId: string,
 *   structureTitle: string,
 *   moduleName: string,
 *   matcherName: string,
 *   transformName: string,
 *   importPath: string,
 * }}
 */
function resolveKnownStructureImplementation(step) {
  const structure = step?.structureId ? getKnownStructure(step.structureId) : null;
  const structureTitle = step?.structureTitle ?? structure?.title ?? step?.structureId ?? 'Unknown Structure';
  const moduleName = step?.moduleName ?? structure?.implementation?.moduleName ?? null;
  const matcherName = step?.matcherName ?? structure?.implementation?.matcherName ?? null;
  const transformName = step?.transformName ?? structure?.implementation?.transformName ?? null;

  if (!step?.structureId || !moduleName || !matcherName || !transformName) {
    throw new Error(
      `Cannot compose known structure step without implementation metadata: ${step?.structureId ?? 'unknown'}`,
    );
  }

  return {
    structureId: step.structureId,
    structureTitle,
    moduleName,
    matcherName,
    transformName,
    importPath: `restringer/src/modules/safe/${moduleName}.js`,
  };
}

/**
 * Creates the reusable helper used by generated built-in transform steps.
 *
 * @returns {string}
 */
function createKnownStructureRuntimeBlock() {
  return `/**
 * @typedef {{
 *   structureId: string,
 *   structureTitle: string,
 *   moduleName: string,
 *   matcherName: string,
 *   transformName: string,
 *   runMatch: (arb: Arborist, candidateFilter: (node: unknown) => boolean) => unknown[],
 *   runTransform: (arb: Arborist, match: unknown) => unknown,
 * }} KnownStructureTransformRuntimeStep
 */

/**
 * Applies one browser-safe REstringer transform step to the provided script.
 *
 * The matcher is rerun against a fresh Arborist instance so the generated
 * script reproduces the same "match first, then mutate" flow that flASTer uses
 * in the browser.
 *
 * @param {string} inputScript
 * @param {KnownStructureTransformRuntimeStep} step
 * @returns {{script: string, matchCount: number, appliedChanges: number}}
 */
function applyKnownStructureTransformStep(inputScript, step) {
  const arb = new Arborist(inputScript);
  const matches = step.runMatch(arb, () => true) ?? [];

  for (const match of matches) {
    step.runTransform(arb, match);
  }

  const appliedChanges = arb.applyChanges();

  return {
    script: arb.script,
    matchCount: matches.length,
    appliedChanges,
  };
}`;
}

/**
 * Creates the fallback filter combiner used when no store helper is provided.
 *
 * @param {string[]} filters
 * @returns {string}
 */
function createFallbackFilterCombiner(filters) {
  if (!filters.length) {
    return 'true';
  }

  let filterSrc = `(${filters[0]})\n`;

  for (const filter of filters.slice(1)) {
    filterSrc += ` && (${filter})\n`;
  }

  return filterSrc;
}

/**
 * Returns a sorted copy of the provided strings.
 *
 * @param {string[]} values
 * @returns {string[]}
 */
function sortStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}
