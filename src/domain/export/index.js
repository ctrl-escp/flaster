/**
 * Narrow public surface for Node script export (no Vue/store).
 */
export {composeTransformationScript, getGeneratedScriptFilename} from './scriptGenerator.js';
export {
  assertNoBrowserOnlyGlobalsInExport,
  assertNoExportScriptPlaceholders,
  BROWSER_GLOBAL_MARKERS,
} from './exportModel.js';
