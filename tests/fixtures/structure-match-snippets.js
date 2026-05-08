/**
 * Per-structure match fixtures for tests: derived from `structure-fixtures.js` so paths
 * stay the single source of truth.
 *
 * @typedef {{ source: string } | { fixtureMissingReason: string }} StructureFixtureEntry
 */

import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {STRUCTURE_FIXTURE_MANIFEST} from './structure-fixtures.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function buildFixtureEntries() {
  /** @type {Record<string, StructureFixtureEntry>} */
  const out = {};

  for (const block of STRUCTURE_FIXTURE_MANIFEST) {
    if (block.fixtureCoverageExemption) {
      out[block.structureName] = Object.freeze({
        fixtureMissingReason: block.fixtureCoverageExemption.reason,
      });
      continue;
    }

    const fixtures = block.fixtures ?? [];
    if (!fixtures.length) {
      throw new Error(`structure-fixtures: "${block.structureName}" has no fixtures and no exemption`);
    }

    const first = fixtures[0];
    if (!first?.path) {
      throw new Error(`structure-fixtures: "${block.structureName}" first fixture must set path`);
    }

    const absolutePath = path.join(projectRoot, first.path);
    const source = readFileSync(absolutePath, 'utf8');
    out[block.structureName] = Object.freeze({source});
  }

  return Object.freeze(out);
}

/** @type {Readonly<Record<string, StructureFixtureEntry>>} */
export const STRUCTURE_FIXTURE_ENTRIES = buildFixtureEntries();
