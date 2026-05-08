/**
 * @typedef {{ id: string, title: string, category: string, executionMode: string, description: string }} KnownStructureDescriptorLike
 */

export const WORKSPACE_TEMPLATE_CATALOG = Object.freeze([
  {
    type: 'apply-known-transform',
    title: 'Use default REstringer transformation',
    description: 'Apply the safe transform exposed by the active structure when one is available.',
    kind: 'transform',
  },
  {
    type: 'advanced-js-step',
    title: 'Write your own transformation function body',
    description: 'Open the transformation editor and write a custom Arborist function body for the active structure.',
    kind: 'transform',
  },
  {
    type: 'delete-structure-matches',
    title: 'Delete all matches',
    description: 'Delete every node matched by the active structure.',
    kind: 'transform',
  },
  {
    type: 'isolate-structure-matches',
    title: 'Keep only matches',
    description: 'Keep matched nodes inside a single block and remove everything outside them.',
    kind: 'transform',
  },
  {
    type: 'no-transform',
    title: 'No Transform',
    description: 'Export a match-only scaffold with an empty transform function you can edit later.',
    kind: 'transform',
  },
]);

export function createWorkspaceTemplateDrafts() {
  return {
    'apply-known-transform': {},
    'rename-identifiers': {
      nextName: 'renamedIdentifier',
      useSelectedName: true,
    },
    'replace-literals': {
      nextValue: '',
      valueType: 'string',
    },
    'remove-dead-wrapper': {},
    'inline-call-result': {},
    'custom-node-selection': {
      mode: 'selected-node-type',
    },
    'match-structure': {},
    'delete-structure-matches': {
      runMode: 'until-stable',
      maxIterations: 3,
    },
    'advanced-js-step': {
      runMode: 'until-stable',
      maxIterations: 3,
    },
  };
}

/**
 * @param {KnownStructureDescriptorLike} structure
 * @returns {string}
 */
export function createKnownStructureRuleSeed(structure) {
  return `// Seeded from known structure: ${structure.title} (${structure.id})
// Category: ${structure.category}
// Execution: ${structure.executionMode}
// Description: ${structure.description}
//
// Replace this placeholder with a custom flAST filter predicate.
n.type === '${structure.category === 'calls' ? 'CallExpression' : 'Identifier'}'`;
}
