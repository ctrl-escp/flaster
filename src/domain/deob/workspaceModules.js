/**
 * Single entry for lazy-loading parse (flAST) plus REstringer and transform helpers.
 * Used by the pipeline runner and other surfaces that need the deobfuscation stack.
 */

/** @type {Promise<DeobWorkspaceModules> | null} */
let workspacePromise = null;

/**
 * @typedef {object} DeobWorkspaceModules
 * @property {typeof import('../parse/parseSource.js').createArborist} createArborist
 * @property {typeof import('../parse/parseSource.js').parseSource} parseSource
 * @property {typeof import('../../integrations/restringer/index.js').runKnownStructureMatcher} runKnownStructureMatcher
 * @property {typeof import('../../integrations/restringer/index.js').collectKnownStructureMatchNodes} collectKnownStructureMatchNodes
 * @property {typeof import('../../integrations/restringer/index.js').runKnownStructureTransformSession} runKnownStructureTransformSession
 * @property {typeof import('../transforms/transformExecutor.js').executeKnownStructureTransformApply} executeKnownStructureTransformApply
 * @property {typeof import('../transforms/customTransformRuntime.js').runCustomTransformExecution} runCustomTransformExecution
 */

/**
 * @returns {Promise<DeobWorkspaceModules>}
 */
export function loadDeobWorkspaceModules() {
  workspacePromise ??= Promise.all([
    import('../parse/parseSource.js'),
    import('../../integrations/restringer/index.js'),
    import('../transforms/transformExecutor.js'),
    import('../transforms/customTransformRuntime.js'),
  ]).then(([parseMod, integrationMod, transformMod, customMod]) => ({
    createArborist: parseMod.createArborist,
    parseSource: parseMod.parseSource,
    runKnownStructureMatcher: integrationMod.runKnownStructureMatcher,
    collectKnownStructureMatchNodes: integrationMod.collectKnownStructureMatchNodes,
    runKnownStructureTransformSession: integrationMod.runKnownStructureTransformSession,
    executeKnownStructureTransformApply: transformMod.executeKnownStructureTransformApply,
    runCustomTransformExecution: customMod.runCustomTransformExecution,
  }));

  return workspacePromise;
}
