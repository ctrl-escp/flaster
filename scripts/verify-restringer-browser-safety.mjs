import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {Arborist} from 'flast/src/arborist.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const adapterPath = path.resolve(projectRoot, 'src/integrations/restringer/index.js');
const matchingEnginePath = path.resolve(projectRoot, 'src/integrations/restringer/matchingEngine.js');
const scriptGeneratorPath = path.resolve(projectRoot, 'src/composition/scriptGenerator.js');
const storePath = path.resolve(projectRoot, 'src/store.js');
const sourceRoot = path.resolve(projectRoot, 'src');

const disallowedImportPatterns = [
  /from\s+['"]restringer['"]/,
  /from\s+['"]restringer\/index\.js['"]/,
  /from\s+['"]restringer\/src\/restringer\.js['"]/,
  /from\s+['"]restringer\/src\/modules\/index\.js['"]/,
  /from\s+['"]restringer\/src\/modules\/unsafe\//,
  /from\s+['"]restringer\/src\/modules\/utils\/index\.js['"]/,
  /from\s+['"]restringer\/src\/modules\/utils\/evalInVm\.js['"]/,
  /from\s+['"]restringer\/src\/modules\/utils\/normalizeScript\.js['"]/,
  /from\s+['"]restringer\/src\/modules\/utils\/sandbox\.js['"]/,
  /from\s+['"]restringer\/src\/processors\//,
];

const sourceEntries = await readSourceFiles(sourceRoot);
const adapterSource = await readFile(adapterPath, 'utf8');

for (const {filePath, content} of sourceEntries) {
  if (filePath === adapterPath) {
    continue;
  }

  if (/from\s+['"]restringer(?:\/|['"])/.test(content)) {
    throw new Error(`Direct REstringer import found outside adapter: ${path.relative(projectRoot, filePath)}`);
  }
}

for (const pattern of disallowedImportPatterns) {
  if (pattern.test(adapterSource)) {
    throw new Error(`Unsafe adapter import matched ${pattern}`);
  }
}

const adapterModule = await import(pathToFileURL(adapterPath).href);
const matchingEngineModule = await import(pathToFileURL(matchingEnginePath).href);
const scriptGeneratorModule = await import(pathToFileURL(scriptGeneratorPath).href);
const sampleScript = `
function proxy(a, b) { return target(a, b); }
const alias = original;
const out = proxy(one, two);
console['log'](\`ok\`);
if (true) { run(); } else { stop(); }
`;
const sampleArborist = new Arborist(sampleScript);

for (const structure of adapterModule.knownStructures) {
  if (!structure.browserSafe) {
    throw new Error(`Non-browser-safe structure exported: ${structure.id}`);
  }

  if (typeof structure.matcher !== 'function') {
    throw new Error(`Structure is missing a matcher: ${structure.id}`);
  }

  if (typeof structure.searchText !== 'string' || !structure.searchText.length) {
    throw new Error(`Structure is missing search metadata: ${structure.id}`);
  }

  if (!structure.implementation?.moduleName || !structure.implementation?.matcherName) {
    throw new Error(`Structure is missing implementation metadata: ${structure.id}`);
  }
}

for (const [id, matcher] of Object.entries(adapterModule.safeMatchers)) {
  if (typeof matcher !== 'function') {
    throw new Error(`safeMatchers.${id} is not a function`);
  }
}

for (const [id, transform] of Object.entries(adapterModule.safeTransforms)) {
  if (typeof transform !== 'function') {
    throw new Error(`safeTransforms.${id} is not a function`);
  }
}

if (typeof adapterModule.listKnownStructures !== 'function') {
  throw new Error('listKnownStructures helper is not exported');
}

if (typeof adapterModule.getKnownStructure !== 'function') {
  throw new Error('getKnownStructure helper is not exported');
}

if (typeof adapterModule.runKnownStructureMatcher !== 'function') {
  throw new Error('runKnownStructureMatcher helper is not exported');
}

if (typeof adapterModule.runKnownStructureTransform !== 'function') {
  throw new Error('runKnownStructureTransform helper is not exported');
}

if (typeof adapterModule.runKnownStructureTransformSession !== 'function') {
  throw new Error('runKnownStructureTransformSession helper is not exported');
}

if (typeof scriptGeneratorModule.composeTransformationScript !== 'function') {
  throw new Error('composeTransformationScript helper is not exported');
}

if (scriptGeneratorModule.getGeneratedScriptFilename() !== 'flaster.mjs') {
  throw new Error('getGeneratedScriptFilename did not return the expected Stage 6 filename');
}

const listedStructures = adapterModule.listKnownStructures({browserSafe: true});
if (listedStructures.length !== adapterModule.knownStructures.length) {
  throw new Error('listKnownStructures did not return the expected browser-safe structures');
}

const filteredStructures = adapterModule.listKnownStructures({search: 'proxy'});
if (!filteredStructures.length) {
  throw new Error('listKnownStructures search did not find proxy structures');
}

const proxyCalls = adapterModule.getKnownStructure('proxy-calls');
if (!proxyCalls || proxyCalls.title !== 'Proxy Calls') {
  throw new Error('getKnownStructure did not return the expected descriptor');
}

const proxyCallMatches = adapterModule.runKnownStructureMatcher(sampleArborist, 'proxy-calls');
if (proxyCallMatches.error || proxyCallMatches.count < 1) {
  throw new Error('runKnownStructureMatcher did not produce expected proxy call matches');
}

const normalizedMatch = proxyCallMatches.matches[0];
if (normalizedMatch.structureId !== 'proxy-calls' || !normalizedMatch.range) {
  throw new Error('Normalized structure match is missing expected metadata');
}

const computedMembers = adapterModule.runKnownStructureMatcher(sampleArborist, 'computed-members');
if (computedMembers.error || computedMembers.count < 1) {
  throw new Error('runKnownStructureMatcher did not produce expected computed member matches');
}

const transformArborist = new Arborist(sampleScript);
const transformMatches = adapterModule.runKnownStructureMatcher(transformArborist, 'computed-members');
const transformResult = adapterModule.runKnownStructureTransform(
  transformArborist,
  'computed-members',
  transformMatches.rawMatches[0],
);

if (typeof transformResult.pendingChanges !== 'number' || transformResult.pendingChanges < 1) {
  throw new Error('runKnownStructureTransform did not mark any pending changes');
}

const transformSessionArborist = new Arborist(sampleScript);
const transformSession = adapterModule.runKnownStructureTransformSession(
  transformSessionArborist,
  'computed-members',
);

if (transformSession.error || transformSession.targetedMatchCount < 1 || transformSession.pendingChanges < 1) {
  throw new Error('runKnownStructureTransformSession did not preview a browser-safe transform session');
}

const session = matchingEngineModule.runKnownStructureMatchingSession(sampleArborist, [
  'proxy-calls',
  'computed-members',
  'missing-structure',
]);

if (session.structureIds.includes('missing-structure')) {
  throw new Error('runKnownStructureMatchingSession accepted an unknown structure ID');
}

if (!session.matchCounts['proxy-calls'] || !session.matchCounts['computed-members']) {
  throw new Error('runKnownStructureMatchingSession did not collect match counts');
}

if (!session.groupedMatches.byStructureId['proxy-calls']?.length) {
  throw new Error('runKnownStructureMatchingSession did not group matches by structure');
}

const groupedNodeType = session.matches.find((match) => match.type)?.type;
if (!groupedNodeType || !session.groupedMatches.byNodeType[groupedNodeType]?.length) {
  throw new Error('runKnownStructureMatchingSession did not group matches by node type');
}

if (!matchingEngineModule.getDefaultSelectedStructureIds().length) {
  throw new Error('getDefaultSelectedStructureIds did not return any built-in structures');
}

const errorSession = matchingEngineModule.runKnownStructureMatchingSession(sampleArborist, [
  'proxy-calls',
  'proxy-variables',
], {
  candidateFilter() {
    throw new Error('candidate filter failure');
  },
});

if (!(errorSession.errors['proxy-calls'] instanceof Error) ||
  !(errorSession.errors['proxy-variables'] instanceof Error)) {
  throw new Error('runKnownStructureMatchingSession did not isolate per-structure matcher errors');
}

globalThis.window ??= {};
globalThis.window.flast = {Arborist};
const {default: store} = await import(pathToFileURL(storePath).href);

store.arb = new Arborist(sampleScript);
store.runKnownStructureMatching(['proxy-calls', 'computed-members']);

if (store.knownStructureExecutionStatus.state !== 'complete') {
  throw new Error('store.runKnownStructureMatching did not mark the session complete');
}

if (store.knownStructureExecutionStatus.totalStructures !== 2) {
  throw new Error('store.runKnownStructureMatching did not track structure totals');
}

if (!store.latestKnownStructureMatches.length) {
  throw new Error('store.runKnownStructureMatching did not store normalized matches');
}

if (!store.knownStructureMatchesById['proxy-calls']?.length) {
  throw new Error('store.runKnownStructureMatching did not store matches by structure ID');
}

const groupedParentType = store.latestKnownStructureMatches.find((match) => match.parentType)?.parentType;
if (!groupedParentType || !store.knownStructureGroupedMatches.byParentType?.[groupedParentType]?.length) {
  throw new Error('store.runKnownStructureMatching did not store grouped parent-type matches');
}

store.setSelectedKnownStructureIds(['proxy-calls', 'missing-structure']);
if (store.selectedKnownStructureIds.length !== 1 || store.selectedKnownStructureIds[0] !== 'proxy-calls') {
  throw new Error('store.setSelectedKnownStructureIds did not filter unknown structure IDs');
}

store.setActiveKnownStructure('computed-members');
if (store.activeKnownStructureId !== 'computed-members') {
  throw new Error('store.setActiveKnownStructure did not update the active structure');
}

store.runActiveKnownStructureMatching();
if (store.lastKnownStructureRunIds.length !== 1 || store.lastKnownStructureRunIds[0] !== 'computed-members') {
  throw new Error('store.runActiveKnownStructureMatching did not run only the active structure');
}

const selectedMatch = store.getSelectedKnownStructureMatch();
if (!selectedMatch || selectedMatch.structureId !== 'computed-members') {
  throw new Error('store did not expose the selected known structure match');
}

store.selectKnownStructureMatchStep(1);
if (!store.getSelectedKnownStructureMatch()) {
  throw new Error('store.selectKnownStructureMatchStep did not keep a selected match');
}

store.runKnownStructureMatching(['proxy-calls', 'computed-members']);
store.setSelectedKnownStructureMatch('computed-members', 0);
store.setSelectedKnownStructureMatch('proxy-calls', 0);
store.setActiveKnownStructure('computed-members');

if (store.getSelectedKnownStructureMatch()?.structureId !== 'computed-members') {
  throw new Error('store.setActiveKnownStructure did not restore the remembered structure selection');
}

const navigableStructureIds = store.getNavigableKnownStructureIds();
if (!navigableStructureIds.includes('proxy-calls') || !navigableStructureIds.includes('computed-members')) {
  throw new Error('store.getNavigableKnownStructureIds did not return the active comparison set');
}

store.selectKnownStructureStep(1);
if (store.activeKnownStructureId !== 'proxy-calls') {
  throw new Error('store.selectKnownStructureStep did not move to the next structure');
}

const overlappingMatches = store.getKnownStructureOverlaps({
  structureId: 'proxy-calls',
  index: 0,
  range: [0, sampleScript.length],
});
if (!overlappingMatches.length) {
  throw new Error('store.getKnownStructureOverlaps did not report overlapping structure matches');
}

store.setKnownStructureAutoScroll(false);
if (store.scrollKnownStructureSelectionIntoView !== false) {
  throw new Error('store.setKnownStructureAutoScroll did not update the scroll preference');
}

const copiedSeed = store.copyKnownStructureRuleSeed('proxy-calls');
if (!copiedSeed.includes('proxy-calls') || !copiedSeed.includes('Seeded from known structure')) {
  throw new Error('store.copyKnownStructureRuleSeed did not return the expected seed text');
}

store.runKnownStructureMatching(['computed-members']);
store.setInspectedKnownStructure('computed-members');
const transformPreview = store.previewKnownStructureTransform('computed-members');

if (!transformPreview || transformPreview.structureId !== 'computed-members' || transformPreview.pendingChanges < 1) {
  throw new Error('store.previewKnownStructureTransform did not produce a usable preview');
}

if (!store.getKnownStructureTransformPreview('computed-members')) {
  throw new Error('store.getKnownStructureTransformPreview did not return the stored preview');
}

const previousStepCount = store.steps.length;
const applyTransformResult = store.applyKnownStructureTransform('computed-members');

if (!applyTransformResult) {
  throw new Error('store.applyKnownStructureTransform did not apply a previewed safe transform');
}

const latestStep = store.steps.at(-1);
if (store.steps.length !== previousStepCount + 1 ||
  latestStep?.kind !== 'known-structure-transform' ||
  latestStep.structureId !== 'computed-members' ||
  latestStep.moduleName !== 'normalizeComputed' ||
  latestStep.matcherName !== 'normalizeComputedMatch' ||
  !latestStep.appliedChanges ||
  !latestStep.affectedMatchCount) {
  throw new Error('store.applyKnownStructureTransform did not record the expected step metadata');
}

if (store.knownStructureTransformPreview !== null) {
  throw new Error('store.applyKnownStructureTransform did not clear the stored preview');
}

const generatedScript = scriptGeneratorModule.composeTransformationScript({
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

if (!generatedScript.includes("import {applyIteratively, Arborist, logger, treeModifier} from 'flast';") &&
  !generatedScript.includes("import {Arborist, applyIteratively, logger, treeModifier} from 'flast';")) {
  throw new Error('composeTransformationScript did not include the expected flAST imports');
}

if (!generatedScript.includes("from 'restringer/src/modules/safe/normalizeComputed.js';")) {
  throw new Error('composeTransformationScript did not import the expected safe REstringer module');
}

if (!generatedScript.includes('applyKnownStructureTransformStep(script, {')) {
  throw new Error('composeTransformationScript did not emit the built-in transform helper call');
}

if (!generatedScript.includes('Step 2: Built-in known structure transform')) {
  throw new Error('composeTransformationScript did not emit readable built-in step comments');
}

if (!generatedScript.includes('Generated via flASTer')) {
  throw new Error('composeTransformationScript did not include the generated-script header');
}

if (generatedScript.includes('TODO(Stage 6)')) {
  throw new Error('composeTransformationScript still contains the Stage 6 TODO placeholder');
}

store.clearKnownStructureMatches('computed-members');
if (store.knownStructureMatchesById['computed-members']) {
  throw new Error('store.clearKnownStructureMatches did not remove the targeted structure matches');
}

if (store.activeKnownStructureId === 'computed-members') {
  throw new Error('store.clearKnownStructureMatches did not move the active structure away from cleared results');
}

store.clearKnownStructureResults();
if (store.latestKnownStructureMatches.length || store.knownStructureExecutionStatus.state !== 'idle') {
  throw new Error('store.clearKnownStructureResults did not reset known structure state');
}

console.log('REstringer browser safety and matching engine checks passed.');

async function readSourceFiles(rootDir) {
  const entries = await readDirectory(rootDir);
  return entries.filter(({filePath}) => filePath.endsWith('.js') || filePath.endsWith('.vue'));
}

async function readDirectory(currentDir) {
  const {readdir} = await import('node:fs/promises');
  const dirents = await readdir(currentDir, {withFileTypes: true});
  const files = [];

  for (const dirent of dirents) {
    const nextPath = path.join(currentDir, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...await readDirectory(nextPath));
      continue;
    }

    if (dirent.isFile()) {
      files.push({
        filePath: nextPath,
        content: await readFile(nextPath, 'utf8'),
      });
    }
  }

  return files;
}
