import {getKnownStructure} from '../../integrations/restringer/index.js';

/**
 * Resolves the REstringer implementation metadata needed for generated code.
 *
 * @param {{structureId?: string, structureTitle?: string, moduleName?: string, matcherName?: string}} step
 */
export function resolveKnownStructureImplementation(step) {
  const structure = step?.structureId ? getKnownStructure(step.structureId) : null;
  const structureTitle = step?.structureTitle ?? structure?.title ?? step?.structureId ?? 'Unknown Structure';
  const description = structure?.description ?? `Applies ${structureTitle}.`;
  const moduleName = step?.moduleName ?? structure?.implementation?.moduleName ?? null;
  const matcherName = step?.matcherName ?? structure?.implementation?.matcherName ?? null;

  if (!step?.structureId || !moduleName) {
    throw new Error(
      `Cannot compose known structure step without implementation metadata: ${step?.structureId ?? 'unknown'}`,
    );
  }

  return {
    structureId: step.structureId,
    structureTitle,
    description,
    moduleName,
    matcherName,
    defaultImport: moduleName,
    namespaceImport: `${moduleName}Module`,
    importPath: `restringer/src/modules/safe/${moduleName}.js`,
  };
}

export function maybeResolveKnownStructureImplementation(step) {
  try {
    return resolveKnownStructureImplementation(step);
  } catch {
    return null;
  }
}
