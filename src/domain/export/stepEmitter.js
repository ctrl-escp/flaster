import {stripLeadingComments} from './exportModel.js';
import {
  getCustomStepMaxIterations,
  getCustomStepRunMode,
  isNoTransformStep,
  isStructureSelectionStep,
} from './pipelineStepKinds.js';
import {
  maybeResolveKnownStructureImplementation,
  resolveKnownStructureImplementation,
} from './resolution.js';

/**
 * Creates script blocks while preserving the pipeline order.
 *
 * @param {readonly unknown[]} steps
 * @param {(filters: string[]) => string} combineFilters
 * @param {(structureId: string) => string} resolveStructureFilter
 * @returns {string[]}
 */
export function createStepBlocks(steps, combineFilters, resolveStructureFilter) {
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

/**
 * @param {unknown} step
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
 * @param {unknown} step
 * @param {number} stepNumber
 * @param {(filters: string[]) => string} combineFilters
 * @returns {string}
 */
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

/**
 * @param {unknown} step
 * @param {number} stepNumber
 * @param {(structureId: string) => string} resolveStructureFilter
 * @returns {string}
 */
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
 * @param {unknown} step
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
