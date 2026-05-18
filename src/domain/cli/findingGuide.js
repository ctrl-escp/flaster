/**
 * Resolves generic structure documentation (description + illustrative example)
 * for report findings, mirroring the in-app Report panel.
 *
 * @param {object} finding
 * @param {object} store
 * @returns {{ description?: string, codeExample?: string }}
 */
export function resolveFindingGuide(finding, store) {
  if (finding.kind === 'capability') {
    return {
      description: finding.description,
    };
  }

  const structureId = finding.structureId ?? finding.id;
  const structure = store.getKnownStructureById(structureId);
  if (!structure) {
    return {};
  }

  return {
    description: structure.description ?? finding.description,
    codeExample: structure.codeExample ?? '',
  };
}
