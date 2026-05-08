import {createPipelineEpilogue, createPipelinePreamble} from './cliWrapper.js';
import {
  assertNoExportScriptPlaceholders,
  GENERATED_HEADER,
  normalizeExportComposeOptions,
} from './exportModel.js';
import {createImportBlock, createImportPlan} from './importPlan.js';
import {createKnownStructureRuntimeBlock} from './knownStructureRuntimeSnippet.js';
import {createStepBlocks} from './stepEmitter.js';

/**
 * @typedef {{
 *   kind: 'custom',
 *   filters?: Array<{enabled?: boolean, src?: string}>,
 *   transformationCode?: string,
 *   runMode?: 'once' | 'count' | 'until-stable',
 *   maxIterations?: number,
 *   params?: Record<string, unknown>,
 * }} StoredCustomStep
 */

/**
 * @typedef {{
 *   kind: 'known-structure-transform',
 *   structureId: string,
 *   structureTitle?: string,
 *   moduleName?: string,
 *   matcherName?: string,
 *   transformName?: string,
 *   affectedMatchCount?: number,
 *   appliedChanges?: number,
 *   appliedAt?: string,
 *   sequenceIndex?: number,
 * }} StoredKnownStructureTransformStep
 */

/**
 * @typedef {StoredCustomStep | StoredKnownStructureTransformStep} StoredTransformationStep
 */

/**
 * Returns the default filename used when downloading a generated Node script.
 *
 * @returns {string}
 */
export function getGeneratedScriptFilename() {
  return 'flaster.mjs';
}

/**
 * Composes a complete Node script for the stored transformation pipeline.
 *
 * @param {{
 *   steps?: readonly StoredTransformationStep[],
 *   combineFilters?: (filters: string[]) => string,
 *   resolveStructureFilter?: (structureId: string) => string,
 * }} [options={}]
 * @returns {string}
 */
export function composeTransformationScript(options = {}) {
  const {steps, combineFilters, resolveStructureFilter} = normalizeExportComposeOptions(options);
  const importPlan = createImportPlan(steps);
  const runtimeBlocks = [];

  if (importPlan.needsKnownStructureRuntime) {
    runtimeBlocks.push(createKnownStructureRuntimeBlock());
  }

  const stepBlocks = createStepBlocks(steps, combineFilters, resolveStructureFilter);

  const scriptSections = [
    GENERATED_HEADER,
    '',
    createImportBlock(importPlan),
    '',
    ...runtimeBlocks,
    createPipelinePreamble(importPlan),
    ...stepBlocks,
    createPipelineEpilogue(),
  ].filter(Boolean);

  const out = `${scriptSections.join('\n')}\n`;
  assertNoExportScriptPlaceholders(out);
  return out;
}
