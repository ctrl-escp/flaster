export const TRANSFORM_EDITOR_INITIAL_VALUE = `// Known structure mode:
//   The body runs once per pass with \`matches\`, the raw array returned by the matcher.
//   Example: for (const match of matches) { ... }
//
// Filter mode:
//   The body runs once per matched node with \`n\`.
//   Example: arb.markNode(n);
`;

/**
 * @param {{ title: string } | null | undefined} activeStructure
 * @param {number} activeFilterCount
 */
export function transformEditorContextMessage(activeStructure, activeFilterCount) {
  if (activeStructure) {
    return `Runs against the raw match array returned by ${activeStructure.title}`;
  }

  if (activeFilterCount > 0) {
    return `Runs against nodes that match ${activeFilterCount} active filters`;
  }

  return 'Runs against the current result set when no filters are active';
}

/**
 * @param {{
 *   activeStructure: { id: string; title: string } | null | undefined;
 *   runSettings: { runMode?: string; maxIterations?: string | number };
 *   structureFilterSeed: string;
 * }} params
 */
export function buildApplyCustomTransformationOptions({
  activeStructure,
  runSettings,
  structureFilterSeed,
}) {
  const structureFilter = structureFilterSeed;

  return {
    label: 'Advanced JS transform',
    templateType: 'advanced-js-step',
    previewSummary: activeStructure
      ? `Custom transform for ${activeStructure.title}`
      : 'Raw JS transformation using the active filter selection',
    selectionSource: activeStructure
      ? {
          kind: 'known-structure',
          structureId: activeStructure.id,
        }
      : {
          kind: 'advanced-js',
        },
    filters: structureFilter ? [{src: structureFilter, enabled: true}] : undefined,
    runMode: runSettings.runMode,
    maxIterations: Number.parseInt(String(runSettings.maxIterations ?? ''), 10) || 1,
  };
}
