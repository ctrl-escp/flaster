import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {Arborist} from 'flast/src/arborist.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const adapterPath = path.resolve(projectRoot, 'src/integrations/restringer/index.js');
const matchingEnginePath = path.resolve(projectRoot, 'src/integrations/restringer/matchingEngine.js');
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
