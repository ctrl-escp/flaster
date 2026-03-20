import {getKnownStructure} from '../integrations/restringer/index.js';

/**
 * @typedef {{
 *   kind: 'custom',
 *   filters?: Array<{enabled?: boolean, src?: string}>,
 *   transformationCode?: string,
 *   runMode?: 'once' | 'count' | 'until-stable',
 *   maxIterations?: number,
 *   params?: Record<string, unknown>,
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
 *   defaultImport?: string,
 *   namespaceImport?: string,
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
  const steps = Array.isArray(options.steps)
    ? options.steps.filter((step) => step?.enabled !== false)
    : [];
  const combineFilters = typeof options.combineFilters === 'function'
    ? options.combineFilters
    : createFallbackFilterCombiner;
  const resolveStructureFilter = typeof options.resolveStructureFilter === 'function'
    ? options.resolveStructureFilter
    : () => '';
  const importPlan = createImportPlan(steps);
  const runtimeBlocks = [];

  if (importPlan.needsKnownStructureRuntime) {
    runtimeBlocks.push(createKnownStructureRuntimeBlock());
  }

  const stepBlocks = createStepBlocks(steps, combineFilters, resolveStructureFilter);

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
        defaultImport: implementation.defaultImport,
      };

      restringerImports.set(implementation.importPath, importEntry);
      continue;
    }

    if (isStructureSelectionStep(step)) {
      flastSpecifiers.add('Arborist');
      const implementation = maybeResolveKnownStructureImplementation(step);

      if (implementation?.importPath && implementation?.namespaceImport) {
        needsKnownStructureRuntime = true;
        const importEntry = restringerImports.get(implementation.importPath) ?? {
          importPath: implementation.importPath,
          namespaceImport: implementation.namespaceImport,
        };

        restringerImports.set(implementation.importPath, importEntry);
      }
      continue;
    }

    if (step?.selectionSource?.kind === 'known-structure') {
      flastSpecifiers.add('Arborist');
      const implementation = maybeResolveKnownStructureImplementation({
        structureId: step?.selectionSource?.structureId ?? step?.params?.structureId ?? '',
      });

      if (implementation?.importPath && implementation?.namespaceImport) {
        if (stepNeedsKnownStructureRuntime(step)) {
          needsKnownStructureRuntime = true;
        }
        const importEntry = restringerImports.get(implementation.importPath) ?? {
          importPath: implementation.importPath,
          namespaceImport: implementation.namespaceImport,
        };

        restringerImports.set(implementation.importPath, importEntry);
      }
    }

    if (getCustomStepRunMode(step) === 'until-stable') {
      needsCustomRuntime = true;
      flastSpecifiers.add('applyIteratively');
      flastSpecifiers.add('logger');
      flastSpecifiers.add('treeModifier');
    } else {
      flastSpecifiers.add('Arborist');
    }
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
    if (importEntry.defaultImport) {
      lines.push(`import ${importEntry.defaultImport} from '${importEntry.importPath}';`);
      continue;
    }

    if (importEntry.namespaceImport) {
      lines.push(`import * as ${importEntry.namespaceImport} from '${importEntry.importPath}';`);
    }
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
  if (isNoTransformStep(step)) {
    return createNoTransformStepBlock(step, stepNumber, combineFilters);
  }

  const enabledFilters = step?.kind === 'custom'
    ? step.filters?.filter((filter) => filter?.enabled && !!filter?.src) ?? []
    : [];
  const filter = enabledFilters.length
    ? combineFilters(enabledFilters.map((filter) => filter.src))
    : 'true';
  const transformationCode = step?.kind === 'custom' ? step.transformationCode ?? '' : '';
  const runMode = getCustomStepRunMode(step);
  const maxIterations = getCustomStepMaxIterations(step);
  const loopCondition = runMode === 'until-stable'
    ? 'true'
    : `${iterationsVar} < ${maxIterations}`;
  const structureId = step?.selectionSource?.kind === 'known-structure'
    ? step.selectionSource.structureId ?? step?.params?.structureId ?? ''
    : '';
  const implementation = structureId
    ? maybeResolveKnownStructureImplementation({structureId})
    : null;

  if (runMode === 'until-stable') {
    if (implementation?.matcherName && implementation?.namespaceImport) {
      const rawMatchesVar = `rawMatches${stepNumber}`;
      const transformFuncVar = `customTransform${stepNumber}`;

      return `// Step ${stepNumber}: ${step?.label ?? 'Custom transform'}
function ${transformFuncVar}(arb, matches) {${transformationCode}}
let arb${stepNumber} = new Arborist(script);
let appliedChanges${stepNumber} = 0;
let iterations${stepNumber} = 0;

while (iterations${stepNumber} < ${maxIterations}) {
  const ${rawMatchesVar} = ${implementation.namespaceImport}.${implementation.matcherName}(arb${stepNumber});

  ${transformFuncVar}(arb${stepNumber}, ${rawMatchesVar});

  const nextChanges${stepNumber} = arb${stepNumber}.applyChanges();
  if (nextChanges${stepNumber} < 1) {
    break;
  }

  appliedChanges${stepNumber} += nextChanges${stepNumber};
  iterations${stepNumber} += 1;
}

script = arb${stepNumber}.script;

if (appliedChanges${stepNumber} > 0) {
  console.debug(
    \`[+] Step ${stepNumber} applied ${step?.label ?? 'Custom transform'} (\${appliedChanges${stepNumber}} changes)\`,
  );
} else {
  console.debug(\`[!] Step ${stepNumber} did not change the script\`);
}`;
    }

    return `// Step ${stepNumber}: ${step?.label ?? 'Custom transform'}
script = applyIteratively(script, [
  treeModifier(
    (n, arb) => {return ${filter};},
    (n, arb) => {${transformationCode}}
  ),
]);
logger.setLogLevelLog();`;
  }

  const arbVar = `arb${stepNumber}`;
  const changesVar = `appliedChanges${stepNumber}`;
  const nextChangesVar = `nextChanges${stepNumber}`;
  const iterationsVar = `iterations${stepNumber}`;
  const matchFuncVar = `customMatchFunc${stepNumber}`;
  const transformFuncVar = `customTransform${stepNumber}`;
  const rawMatchesVar = `rawMatches${stepNumber}`;

  if (implementation?.matcherName && implementation?.namespaceImport) {
    return `// Step ${stepNumber}: ${step?.label ?? 'Custom transform'}
function ${transformFuncVar}(arb, matches) {${transformationCode}}
let ${arbVar} = new Arborist(script);
let ${changesVar} = 0;
let ${iterationsVar} = 0;

while (${iterationsVar} < ${maxIterations}) {
  const ${rawMatchesVar} = ${implementation.namespaceImport}.${implementation.matcherName}(${arbVar}, () => true);

  ${transformFuncVar}(${arbVar}, ${rawMatchesVar});

  const ${nextChangesVar} = ${arbVar}.applyChanges();
  if (${nextChangesVar} < 1) {
    break;
  }

  ${changesVar} += ${nextChangesVar};
  ${iterationsVar} += 1;
}

script = ${arbVar}.script;

if (${changesVar} > 0) {
  console.debug(
    \`[+] Step ${stepNumber} applied ${step?.label ?? 'Custom transform'} (\${${changesVar}} changes)\`,
  );
} else {
  console.debug(\`[!] Step ${stepNumber} did not change the script\`);
}`;
  }

  return `// Step ${stepNumber}: ${step?.label ?? 'Custom transform'}
const ${matchFuncVar} = (n, arb) => ${filter};
function ${transformFuncVar}(n, arb) {${transformationCode}}
let ${arbVar} = new Arborist(script);
let ${changesVar} = 0;
let ${iterationsVar} = 0;

while (${iterationsVar} < ${maxIterations}) {
  for (const n of (${arbVar}.ast ?? []).filter((n) => ${matchFuncVar}(n, ${arbVar}))) {
    ${transformFuncVar}(n, ${arbVar});
  }

  const ${nextChangesVar} = ${arbVar}.applyChanges();
  if (${nextChangesVar} < 1) {
    break;
  }

  ${changesVar} += ${nextChangesVar};
  ${iterationsVar} += 1;
}

script = ${arbVar}.script;

if (${changesVar} > 0) {
  console.debug(
    \`[+] Step ${stepNumber} applied ${step?.label ?? 'Custom transform'} (\${${changesVar}} changes)\`,
  );
} else {
  console.debug(\`[!] Step ${stepNumber} did not change the script\`);
}`;
}

/**
 * Creates script blocks while preserving the pipeline order.
 *
 * Consecutive custom steps are emitted into the same `applyIteratively([...])`
 * array in top-to-bottom order so the generated Node pipeline mirrors the UI.
 *
 * @param {readonly StoredTransformationStep[]} steps
 * @param {(filters: string[]) => string} combineFilters
 * @param {(structureId: string) => string} resolveStructureFilter
 * @returns {string[]}
 */
function createStepBlocks(steps, combineFilters, resolveStructureFilter) {
  const blocks = [];

  steps.forEach((step, index) => {
    if (step?.kind === 'known-structure-transform') {
      blocks.push(createKnownStructureStepBlock(step, index + 1));
      return;
    }

    if (isStructureSelectionStep(step)) {
      blocks.push(createStructureSelectionStepBlock(step, index + 1, resolveStructureFilter));
      return;
    }

    blocks.push(createCustomStepBlock(step, index + 1, combineFilters));
  });
  return blocks;
}

function isStructureSelectionStep(step) {
  return step?.templateType === 'delete-structure-matches' ||
    step?.templateType === 'isolate-structure-matches';
}

function isNoTransformStep(step) {
  return step?.templateType === 'no-transform';
}

function stepNeedsKnownStructureRuntime(step) {
  return step?.kind === 'known-structure-transform' || isStructureSelectionStep(step);
}

function getCustomStepRunMode(step) {
  const runMode = step?.runMode ?? step?.params?.runMode ?? 'until-stable';
  return ['once', 'count', 'until-stable'].includes(runMode) ? runMode : 'until-stable';
}

function getCustomStepMaxIterations(step) {
  const runMode = getCustomStepRunMode(step);
  const requestedValue = Number.parseInt(step?.maxIterations ?? step?.params?.maxIterations ?? 1, 10);

  if (runMode === 'once') {
    return 1;
  }

  if (runMode === 'count') {
    return Math.max(1, Number.isFinite(requestedValue) ? requestedValue : 1);
  }

  return 1;
}

function createNoTransformStepBlock(step, stepNumber, combineFilters) {
  const structureId = step?.selectionSource?.kind === 'known-structure'
    ? step.selectionSource.structureId ?? step?.params?.structureId ?? ''
    : step?.params?.structureId ?? '';
  const implementation = structureId
    ? maybeResolveKnownStructureImplementation({structureId})
    : null;
  const enabledFilters = step?.kind === 'custom'
    ? step.filters?.filter((filter) => filter?.enabled && !!filter?.src) ?? []
    : [];
  const filter = enabledFilters.length
    ? combineFilters(enabledFilters.map((filterEntry) => filterEntry.src))
    : 'true';
  const arbVar = `arb${stepNumber}`;
  const rawMatchesVar = `rawMatches${stepNumber}`;
  const matchFuncVar = `customMatchFunc${stepNumber}`;
  const transformFuncVar = `customTransform${stepNumber}`;
  const nextChangesVar = `appliedChanges${stepNumber}`;

  if (implementation?.matcherName && implementation?.namespaceImport) {
    return `// Step ${stepNumber}: ${step?.label ?? 'No Transform'}
function ${transformFuncVar}(arb, matches) {
  // Intentionally empty. Edit this after export.
  return arb;
}
let ${arbVar} = new Arborist(script);
const ${rawMatchesVar} = ${implementation.namespaceImport}.${implementation.matcherName}(${arbVar}, () => true);

${transformFuncVar}(${arbVar}, ${rawMatchesVar});

const ${nextChangesVar} = ${arbVar}.applyChanges();
script = ${arbVar}.script;

console.debug(
  \`[i] Step ${stepNumber} matched \${${rawMatchesVar}.length} group\${${rawMatchesVar}.length === 1 ? '' : 's'} for ${step?.label ?? 'No Transform'}\`,
);

if (${nextChangesVar} > 0) {
  console.debug(
    \`[+] Step ${stepNumber} applied \${${nextChangesVar}} change\${${nextChangesVar} === 1 ? '' : 's'}\`,
  );
} else {
  console.debug(\`[!] Step ${stepNumber} did not change the script\`);
}`;
  }

  return `// Step ${stepNumber}: ${step?.label ?? 'No Transform'}
const ${matchFuncVar} = (arb) => (arb.ast ?? []).filter((n) => ${filter});
function ${transformFuncVar}(arb, matches) {
  // Intentionally empty. Edit this after export.
  return arb;
}
let ${arbVar} = new Arborist(script);
const ${rawMatchesVar} = ${matchFuncVar}(${arbVar});

${transformFuncVar}(${arbVar}, ${rawMatchesVar});

const ${nextChangesVar} = ${arbVar}.applyChanges();
script = ${arbVar}.script;

console.debug(
  \`[i] Step ${stepNumber} matched \${${rawMatchesVar}.length} node\${${rawMatchesVar}.length === 1 ? '' : 's'} for ${step?.label ?? 'No Transform'}\`,
);

if (${nextChangesVar} > 0) {
  console.debug(
    \`[+] Step ${stepNumber} applied \${${nextChangesVar}} change\${${nextChangesVar} === 1 ? '' : 's'}\`,
  );
} else {
  console.debug(\`[!] Step ${stepNumber} did not change the script\`);
}`;
}

function createStructureSelectionStepBlock(step, stepNumber, resolveStructureFilter) {
  const structureId = step?.params?.structureId ?? step?.selectionSource?.structureId ?? '';
  const structureTitle = step?.label?.replace(/^(Delete|Isolate|Keep only)\s+/u, '').replace(/\s+matches$/u, '') ||
    step?.structureTitle ||
    step?.selectionSource?.structureId ||
    'Selected structure';
  const implementation = maybeResolveKnownStructureImplementation({
    structureId,
    structureTitle,
  });
  const filterSrc = structureId ? stripLeadingComments(resolveStructureFilter(structureId)) : '';

  const arbVar = `arb${stepNumber}`;
  const matchesVar = `matches${stepNumber}`;
  const rawMatchesVar = `rawMatches${stepNumber}`;
  const appliedChangesVar = `appliedChanges${stepNumber}`;
  const nextChangesVar = `nextChanges${stepNumber}`;
  const iterationsVar = `iterations${stepNumber}`;
  const outermostMatchesVar = `outermostMatches${stepNumber}`;
  const matcherVar = implementation?.matcherName && implementation?.namespaceImport
    ? `${implementation.namespaceImport}.${implementation.matcherName}`
    : '';
  const runMode = getCustomStepRunMode(step);
  const maxIterations = getCustomStepMaxIterations(step);
  const loopCondition = runMode === 'until-stable'
    ? 'true'
    : `${iterationsVar} < ${maxIterations}`;

  if (step.templateType === 'delete-structure-matches') {
    if (!matcherVar) {
      if (!filterSrc) {
        throw new Error(`Cannot export structure step without a structure rule: ${structureId || 'unknown'}`);
      }

      return `// Step ${stepNumber}: ${step?.label ?? `Delete ${structureTitle} matches`}
const customMatchFunc${stepNumber} = (arb) => (arb.ast ?? []).filter((n) => ${filterSrc});
let ${arbVar} = new Arborist(script);
let ${appliedChangesVar} = 0;
let ${iterationsVar} = 0;

while (${loopCondition}) {
  const ${matchesVar} = customMatchFunc${stepNumber}(${arbVar});
  if (!${matchesVar}.length) {
    break;
  }

  for (const n of ${matchesVar}) {
    ${arbVar}.markNode(n);
  }

  const ${nextChangesVar} = ${arbVar}.applyChanges();
  if (${nextChangesVar} < 1) {
    break;
  }

  ${appliedChangesVar} += ${matchesVar}.length;
  ${iterationsVar} += 1;
}

script = ${arbVar}.script;

if (${appliedChangesVar} > 0) {
  console.debug(
    \`[+] Step ${stepNumber} deleted \${${appliedChangesVar}} ${structureTitle} matches\`,
  );
} else {
  console.debug(\`[!] Step ${stepNumber} did not change the script\`);
}`;
    }

    return `// Step ${stepNumber}: ${step?.label ?? `Delete ${structureTitle} matches`}
let ${arbVar} = new Arborist(script);
let ${appliedChangesVar} = 0;
let ${iterationsVar} = 0;

while (${loopCondition}) {
  const ${rawMatchesVar} = ${matcherVar}(${arbVar});
  const ${matchesVar} = collectKnownStructureMatchNodes(${rawMatchesVar});
  if (!${matchesVar}.length) {
    break;
  }

  for (const n of ${matchesVar}) {
    ${arbVar}.markNode(n);
  }

  const ${nextChangesVar} = ${arbVar}.applyChanges();
  if (${nextChangesVar} < 1) {
    break;
  }

  ${appliedChangesVar} += ${matchesVar}.length;
  ${iterationsVar} += 1;
}

script = ${arbVar}.script;

if (${appliedChangesVar} > 0) {
  console.debug(
    \`[+] Step ${stepNumber} deleted \${${appliedChangesVar}} ${structureTitle} matches\`,
  );
} else {
  console.debug(\`[!] Step ${stepNumber} did not change the script\`);
}`;
  }

  if (!matcherVar) {
    if (!filterSrc) {
      throw new Error(`Cannot export structure step without a structure rule: ${structureId || 'unknown'}`);
    }

    return `// Step ${stepNumber}: ${step?.label ?? `Keep only ${structureTitle} matches`}
/**
 * Rewrites the program so only the matched nodes remain inside one block.
 *
 * @param {Arborist} arb
 * @param {Array<unknown>} [matches=[]]
 * @returns {Arborist}
 */
function hasMatchedAncestor(node, matchedNodes) {
  let current = node?.parentNode ?? null;

  while (current) {
    if (matchedNodes.has(current)) {
      return true;
    }

    current = current.parentNode ?? null;
  }

  return false;
}

function getOutermostMatchedNodes(matches = []) {
  const matchedNodes = new Set(matches.filter(Boolean));

  return matches.filter((node) => node && !hasMatchedAncestor(node, matchedNodes));
}

const customMatchFunc${stepNumber} = (arb) => (arb.ast ?? []).filter((n) => ${filterSrc});
let ${arbVar} = new Arborist(script);
const ${matchesVar} = customMatchFunc${stepNumber}(${arbVar});
const ${outermostMatchesVar} = getOutermostMatchedNodes(${matchesVar})
  .filter(Boolean);

${arbVar}.markNode(${arbVar}.ast[0], {
  type: 'Program',
  sourceType: ${arbVar}.ast[0].sourceType,
  body: [{
    type: 'BlockStatement',
    body: ${outermostMatchesVar},
  }],
});

const ${appliedChangesVar} = ${arbVar}.applyChanges();
script = ${arbVar}.script;

if (${appliedChangesVar} > 0) {
  console.debug(
    \`[+] Step ${stepNumber} kept only \${${outermostMatchesVar}.length} ${structureTitle} matches\`,
  );
} else {
  console.debug(\`[!] Step ${stepNumber} did not change the script\`);
}`;
  }

  return `// Step ${stepNumber}: ${step?.label ?? `Keep only ${structureTitle} matches`}
/**
 * Rewrites the program so only the matched nodes remain inside one block.
 *
 * @param {Arborist} arb
 * @param {Array<unknown>} [matches=[]]
 * @returns {Arborist}
 */
function hasMatchedAncestor(node, matchedNodes) {
  let current = node?.parentNode ?? null;

  while (current) {
    if (matchedNodes.has(current)) {
      return true;
    }

    current = current.parentNode ?? null;
  }

  return false;
}

function getOutermostMatchedNodes(matches = []) {
  const matchedNodes = new Set(matches.filter(Boolean));

  return matches.filter((node) => node && !hasMatchedAncestor(node, matchedNodes));
}

let ${arbVar} = new Arborist(script);
const ${rawMatchesVar} = ${matcherVar}(${arbVar});
const ${matchesVar} = collectKnownStructureMatchNodes(${rawMatchesVar});
const ${outermostMatchesVar} = getOutermostMatchedNodes(${matchesVar})
  .filter(Boolean);

${arbVar}.markNode(${arbVar}.ast[0], {
  type: 'Program',
  sourceType: ${arbVar}.ast[0].sourceType,
  body: [{
    type: 'BlockStatement',
    body: ${outermostMatchesVar},
  }],
});

const ${appliedChangesVar} = ${arbVar}.applyChanges();
script = ${arbVar}.script;

if (${appliedChangesVar} > 0) {
  console.debug(
    \`[+] Step ${stepNumber} kept only \${${outermostMatchesVar}.length} ${structureTitle} matches\`,
  );
} else {
  console.debug(\`[!] Step ${stepNumber} did not change the script\`);
}`;
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
  const stepResultVar = `stepResult${stepNumber}`;

  return `// Step ${stepNumber}: ${structureTitle}
// ${implementation.description}
const ${stepResultVar} = applyKnownStructureTransformStep(script, ${implementation.defaultImport});

script = ${stepResultVar}.script;

if (${stepResultVar}.appliedChanges > 0) {
  console.debug(
    \`[+] Step ${stepNumber} applied ${structureTitle} (\${${stepResultVar}.appliedChanges} changes)\`,
  );
} else {
  console.debug(\`[!] Step ${stepNumber} did not change the script\`);
}`;
}

/**
 * Resolves the REstringer implementation metadata needed for generated code.
 *
 * @param {StoredKnownStructureTransformStep} step
 * @returns {{
 *   structureId: string,
 *   structureTitle: string,
 *   description: string,
 *   moduleName: string,
 *   defaultImport: string,
 *   importPath: string,
 * }}
 */
function resolveKnownStructureImplementation(step) {
  const structure = step?.structureId ? getKnownStructure(step.structureId) : null;
  const structureTitle = step?.structureTitle ?? structure?.title ?? step?.structureId ?? 'Unknown Structure';
  const description = structure?.description ?? `Applies ${structureTitle}.`;
  const moduleName = step?.moduleName ?? structure?.implementation?.moduleName ?? null;
  const matcherName = step?.matcherName ?? structure?.implementation?.matcherName ?? null;

  if (!step?.structureId || !moduleName) {
    throw new Error(
      `Cannot compose known structure step without implementation metadata: ${step?.structureId ?? 'unknown'}`,
    );
  }

  return {
    structureId: step.structureId,
    structureTitle,
    description,
    moduleName,
    matcherName,
    defaultImport: moduleName,
    namespaceImport: `${moduleName}Module`,
    importPath: `restringer/src/modules/safe/${moduleName}.js`,
  };
}

function maybeResolveKnownStructureImplementation(step) {
  try {
    return resolveKnownStructureImplementation(step);
  } catch {
    return null;
  }
}

/**
 * Creates the reusable helper used by generated built-in transform steps.
 *
 * @returns {string}
 */
function createKnownStructureRuntimeBlock() {
  return `function isKnownStructureNodeLike(value) {
  return !!value &&
    typeof value === 'object' &&
    typeof value.type === 'string' &&
    Array.isArray(value.range);
}

function findNodeInKnownStructureMatch(match, seen = new Set()) {
  if (!match || typeof match !== 'object' || seen.has(match)) {
    return null;
  }

  if (isKnownStructureNodeLike(match)) {
    return match;
  }

  seen.add(match);

  const preferredKeys = [
    'node',
    'targetNode',
    'funcNode',
    'referenceNode',
    'declarationNode',
    'candidateNode',
    'expressionNode',
    'statementNode',
    'callNode',
    'calleeNode',
    'parentNode',
    'declaratorNode',
    'proxyIdentifier',
  ];

  for (const key of preferredKeys) {
    const candidate = findNodeInKnownStructureMatch(match[key], seen);
    if (candidate) {
      return candidate;
    }
  }

  if (Array.isArray(match)) {
    for (const entry of match) {
      const candidate = findNodeInKnownStructureMatch(entry, seen);
      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  for (const value of Object.values(match)) {
    const candidate = findNodeInKnownStructureMatch(value, seen);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function collectKnownStructureMatchNodes(matches = []) {
  return matches
    .map((match) => findNodeInKnownStructureMatch(match))
    .filter(Boolean);
}

function applyKnownStructureTransformStep(inputScript, runStep) {
  const arb = new Arborist(inputScript);
  runStep(arb, () => true);
  const appliedChanges = arb.applyChanges();

  return {
    script: arb.script,
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
 * Removes leading comment-only lines from a seeded filter snippet so exported
 * code uses only the executable predicate text.
 *
 * @param {string} source
 * @returns {string}
 */
function stripLeadingComments(source) {
  return String(source || '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.length && !trimmed.startsWith('//');
    })
    .join('\n')
    .trim();
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
