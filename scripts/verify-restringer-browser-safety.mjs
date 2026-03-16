import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {Arborist} from 'flast/src/arborist.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const adapterPath = path.resolve(projectRoot, 'src/integrations/restringer/index.js');
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

console.log('REstringer browser safety checks passed.');

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
