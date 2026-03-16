import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

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

for (const structure of adapterModule.knownStructures) {
  if (!structure.browserSafe) {
    throw new Error(`Non-browser-safe structure exported: ${structure.id}`);
  }

  if (typeof structure.matcher !== 'function') {
    throw new Error(`Structure is missing a matcher: ${structure.id}`);
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
