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
  {
    structureName: 'empty-statements',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/empty-statements.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'dead-node-declarations',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/dead-node-declarations.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'redundant-block-statements',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/redundant-block-statements.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'logical-expressions-as-if',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/logical-expressions-as-if.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'call-unwrapped-identifier',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/call-unwrapped-identifier.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'eval-string-literals',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/eval-string-literals.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'iife-literal-shells',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/iife-literal-shells.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'fixed-value-after-declaration',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/fixed-value-after-declaration.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'new-function-string-body',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/new-function-string-body.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'sequence-expression-split',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/sequence-expression-split.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'function-constructor-literals',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/function-constructor-literals.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'array-index-member-resolution',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/array-index-member-resolution.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'member-direct-literal-assignment',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/member-direct-literal-assignment.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'if-redundant-logical',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/if-redundant-logical.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'chained-declarators',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/chained-declarators.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'if-empty-branch-prune',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/if-empty-branch-prune.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'function-apply-shells',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/function-apply-shells.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'simple-op-wrapper-calls',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/simple-op-wrapper-calls.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'inline-operator-objects',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/inline-operator-objects.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'redundant-not-operators',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/redundant-not-operators.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'definite-member-expressions',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/definite-member-expressions.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'deterministic-ternaries',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/deterministic-ternaries.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'deterministic-while-statements',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/deterministic-while-statements.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'minimal-alphabet',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/minimal-alphabet.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'nested-binary-expressions',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/nested-binary-expressions.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
  {
    structureName: 'pure-literal-method-calls',
    fixtures: [
      {
        path: 'tests/fixtures/structure-sources/pure-literal-method-calls.js',
        expectsMatches: true,
        expectedMinMatches: 1,
      },
    ],
  },
]);
