import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const srcRoot = path.resolve(projectRoot, 'src');
const integrationRoot = path.resolve(srcRoot, 'integrations/restringer');
const matchingEngineEntry = path.normalize(path.join(integrationRoot, 'matchingEngine.js'));
const matchingEngineConsumerAllowlist = new Set([
  path.normalize(path.resolve(srcRoot, 'store.js')),
  path.normalize(path.resolve(srcRoot, 'app/createAppStore.js')),
  path.normalize(path.resolve(srcRoot, 'app/store/storeBlueprint.js')),
]);

/**
 * Layering checks for `src/`:
 *
 * 1. Application/UI code must not import REstringer integration internals
 *    (anything under `integrations/restringer/` other than `index.js` or the
 *    allowlisted `matchingEngine.js`) without going through the public adapter
 *    (`index.js`). The app store facade may import `matchingEngine.js` for
 *    `detectStructures`, `createKnownStructureState`, and session grouping.
 *
 * 2. Root-level `src/*.vue` is limited to the app shell (`App.vue`) and an
 *    explicit allowlist so feature SFCs stay under `src/components/`.
 */
const importPattern =
  /(?:import|export)\s+[^;]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/gs;

/** App shell only at src/*.vue; add names here only for intentional exceptions. */
const ROOT_SRC_VUE_ALLOWLIST = new Set(['App.vue']);

async function assertRootSrcVuePolicy() {
  const entries = await readdir(srcRoot, {withFileTypes: true});
  const offenders = [];

  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith('.vue')) {
      continue;
    }

    if (ROOT_SRC_VUE_ALLOWLIST.has(ent.name)) {
      continue;
    }

    offenders.push(ent.name);
  }

  if (offenders.length) {
    throw new Error(
      `Disallowed root-level Vue in src/ (feature components belong under src/components/; ` +
        `allowlist in scripts/check-boundaries.mjs only if intentional): ${offenders.sort().join(', ')}`,
    );
  }
}

function isIntegrationFile(filePath) {
  const normalized = path.normalize(filePath);
  return normalized === integrationRoot || normalized.startsWith(`${integrationRoot}${path.sep}`);
}

function resolveIntegrationTarget(specifier, fromFile) {
  if (specifier.startsWith('@/')) {
    return path.normalize(path.join(srcRoot, specifier.slice(2)));
  }

  if (specifier.startsWith('.')) {
    return path.normalize(path.join(path.dirname(fromFile), specifier));
  }

  return null;
}

function isForbiddenIntegrationDeepImport(targetPath) {
  if (!targetPath.startsWith(integrationRoot)) {
    return false;
  }

  if (targetPath === path.join(integrationRoot, 'index.js')) {
    return false;
  }

  return true;
}

async function readSourceFiles(rootDir) {
  const {readdir} = await import('node:fs/promises');
  const files = [];

  async function walk(currentDir) {
    const dirents = await readdir(currentDir, {withFileTypes: true});
    for (const dirent of dirents) {
      const nextPath = path.join(currentDir, dirent.name);
      if (dirent.isDirectory()) {
        await walk(nextPath);
      } else if (dirent.isFile() && (nextPath.endsWith('.js') || nextPath.endsWith('.vue'))) {
        files.push(nextPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

await assertRootSrcVuePolicy();

const sourceFiles = await readSourceFiles(srcRoot);

for (const filePath of sourceFiles) {
  if (isIntegrationFile(filePath)) {
    continue;
  }

  const content = await readFile(filePath, 'utf8');
  importPattern.lastIndex = 0;
  let match;

  while ((match = importPattern.exec(content)) !== null) {
    const specifier = match[1] ?? match[2];
    if (!specifier) {
      continue;
    }

    const target = resolveIntegrationTarget(specifier, filePath);
    if (!target || !isForbiddenIntegrationDeepImport(target)) {
      continue;
    }

    if (matchingEngineConsumerAllowlist.has(path.normalize(filePath)) && target === matchingEngineEntry) {
      continue;
    }

    throw new Error(
      `Forbidden REstringer integration import (use integrations/restringer/index.js or narrow allowlist): ` +
        `${path.relative(projectRoot, filePath)} → ${specifier}`,
    );
  }
}

console.log('Source boundary checks passed.');
