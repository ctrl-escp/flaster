/**
 * Test-only fixture manifest: file paths and expectations per built-in structure.
 * Runtime catalog rows must never embed fixture paths or test policy — keep that here.
 *
 * @typedef {{ path: string, expectsMatches?: boolean, expectedMinMatches?: number }} StructureFixtureFile
 * @typedef {{
 *   structureName: string,
 *   fixtures?: StructureFixtureFile[],
 *   fixtureCoverageExemption?: { reason: string },
 * }} StructureFixtureManifestEntry
 */

/** @type {Readonly<StructureFixtureManifestEntry[]>} */
export const STRUCTURE_FIXTURE_MANIFEST = Object.freeze([
  {
    structureName: 'proxy-calls',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/proxy-calls.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'proxy-variables',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/proxy-variables.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'proxy-references',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/proxy-references.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'wrapped-value-shells',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/wrapped-value-shells.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'iife-wrappers',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/iife-wrappers.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'template-literal-strings',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/template-literal-strings.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'fixed-assigned-values',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/fixed-assigned-values.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'deterministic-if-statements',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/deterministic-if-statements.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'sequence-rearrangement',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/sequence-rearrangement.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'switch-rearrangement',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/switch-rearrangement.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'computed-members',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/computed-members.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'simplify-calls',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/simplify-calls.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
]);
