/** @import {Arborist} from '../../flastTypes.js' */
import {sortStrings} from './exportModel.js';
import {
  getCustomStepRunMode,
  isStructureSelectionStep,
  stepNeedsKnownStructureRuntime,
} from './pipelineStepKinds.js';
import {
  maybeResolveKnownStructureImplementation,
  resolveKnownStructureImplementation,
} from './resolution.js';

/**
 * @typedef {{
 *   importPath: string,
 *   defaultImport?: string,
 *   namespaceImport?: string,
 * }} GeneratedImportEntry
 */

/**
 * Creates the import plan needed by the current pipeline.
 *
 * @param {readonly unknown[]} steps
 * @returns {{
 *   needsCustomRuntime: boolean,
 *   needsKnownStructureRuntime: boolean,
 *   flastSpecifiers: Set<string>,
 *   restringerImports: Map<string, GeneratedImportEntry>,
 * }}
 */
export function createImportPlan(steps) {
  const flastSpecifiers = new Set();
  const restringerImports = new Map();
  let needsCustomRuntime = false;
  let needsKnownStructureRuntime = false;

  for (const step of steps) {
    if (step?.kind === 'known-structure-transform') {
      needsKnownStructureRuntime = true;
      flastSpecifiers.add('Arborist');

      const implementation = resolveKnownStructureImplementation(step);
      const importEntry = restringerImports.get(implementation.importPath) ?? {
        importPath: implementation.importPath,
        defaultImport: implementation.defaultImport,
      };

      restringerImports.set(implementation.importPath, importEntry);
      continue;
    }

    if (isStructureSelectionStep(step)) {
      flastSpecifiers.add('Arborist');
      const implementation = maybeResolveKnownStructureImplementation(step);

      if (implementation?.importPath && implementation?.namespaceImport) {
        needsKnownStructureRuntime = true;
        const importEntry = restringerImports.get(implementation.importPath) ?? {
          importPath: implementation.importPath,
          namespaceImport: implementation.namespaceImport,
        };

        restringerImports.set(implementation.importPath, importEntry);
      }
      continue;
    }

    if (step?.selectionSource?.kind === 'known-structure') {
      flastSpecifiers.add('Arborist');
      const implementation = maybeResolveKnownStructureImplementation({
        structureId: step?.selectionSource?.structureId ?? step?.params?.structureId ?? '',
      });

      if (implementation?.importPath && implementation?.namespaceImport) {
        if (stepNeedsKnownStructureRuntime(step)) {
          needsKnownStructureRuntime = true;
        }
        const importEntry = restringerImports.get(implementation.importPath) ?? {
          importPath: implementation.importPath,
          namespaceImport: implementation.namespaceImport,
        };

        restringerImports.set(implementation.importPath, importEntry);
      }
    }

    if (getCustomStepRunMode(step) === 'until-stable') {
      needsCustomRuntime = true;
      flastSpecifiers.add('applyIteratively');
      flastSpecifiers.add('logger');
      flastSpecifiers.add('treeModifier');
    } else {
      flastSpecifiers.add('Arborist');
    }
  }

  return {
    needsCustomRuntime,
    needsKnownStructureRuntime,
    flastSpecifiers,
    restringerImports,
  };
}

/**
 * @param {ReturnType<typeof createImportPlan>} importPlan
 * @returns {string}
 */
export function createImportBlock(importPlan) {
  const lines = ["import fs from 'node:fs';"];

  if (importPlan.flastSpecifiers.size) {
    lines.push(
      `import {${sortStrings([...importPlan.flastSpecifiers]).join(', ')}} from 'flast';`,
    );
  }

  for (const importEntry of [...importPlan.restringerImports.values()].sort((left, right) =>
    left.importPath.localeCompare(right.importPath),
  )) {
    if (importEntry.defaultImport) {
      lines.push(`import ${importEntry.defaultImport} from '${importEntry.importPath}';`);
      continue;
    }

    if (importEntry.namespaceImport) {
      lines.push(`import * as ${importEntry.namespaceImport} from '${importEntry.importPath}';`);
    }
  }

  return lines.join('\n');
}
