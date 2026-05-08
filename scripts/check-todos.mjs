/**
 * Fails if production `src/` contains stray TODO/FIXME/HACK markers.
 *
 * Allowlisted paths are documented in `docs/cleanup-log.md` (Phase 11).
 */
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(projectRoot, 'src');

/** @type {readonly string[]} — repo-relative POSIX paths */
const ALLOWLIST_RELATIVE = [
  // Regex sources for generated-script placeholder checks (not actionable markers).
  'domain/export/exportModel.js',
];

const markerPattern = /\b(TODO|FIXME|HACK)\b/;

async function* walkFiles(dir) {
  const entries = await readdir(dir, {withFileTypes: true});
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(full);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.vue'))) {
      yield full;
    }
  }
}

function isAllowlisted(absPath) {
  const rel = path.relative(srcRoot, absPath).split(path.sep).join('/');
  return ALLOWLIST_RELATIVE.includes(rel);
}

const hits = [];

for await (const filePath of walkFiles(srcRoot)) {
  if (isAllowlisted(filePath)) {
    continue;
  }

  const content = await readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (markerPattern.test(line)) {
      hits.push({file: path.relative(projectRoot, filePath), line: index + 1, text: line.trimEnd().slice(0, 200)});
    }
  });
}

if (hits.length) {
  const detail = hits.map((h) => `  ${h.file}:${h.line}: ${h.text}`).join('\n');
  throw new Error(`TODO/FIXME/HACK markers in src/ (allowlist in scripts/check-todos.mjs):\n${detail}`);
}

console.log('TODO/FIXME/HACK source scan passed.');
