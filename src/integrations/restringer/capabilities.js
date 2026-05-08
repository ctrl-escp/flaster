/**
 * @typedef {'no-eval' | 'iframe-sandbox' | 'node-only'} KnownStructureExecutionMode
 */

/**
 * @param {{
 *   title: string,
 *   categoryGroup?: string,
 *   category: string,
 *   description: string,
 * }} definition
 * @returns {string}
 */
export function createSearchText(definition) {
  return [
    definition.title,
    definition.categoryGroup ?? '',
    definition.category,
    definition.description,
  ].join(' ').toLowerCase();
}

/**
 * @param {{executionMode?: KnownStructureExecutionMode, noEval?: boolean}} definition
 * @returns {KnownStructureExecutionMode}
 */
export function getExecutionMode(definition) {
  if (definition.executionMode) {
    return definition.executionMode;
  }

  return definition.noEval ? 'no-eval' : 'node-only';
}

/**
 * @param {{executionMode?: KnownStructureExecutionMode, noEval?: boolean}} definition
 * @returns {boolean}
 */
export function isRunnable(definition) {
  return getExecutionMode(definition) === 'no-eval';
}

/**
 * @param {{
 *   title: string,
 *   executionMode?: KnownStructureExecutionMode,
 *   noEval?: boolean,
 * }} definition
 * @returns {string}
 */
export function createAvailabilityNote(definition) {
  const executionMode = getExecutionMode(definition);

  if (executionMode === 'no-eval') {
    return 'Runnable in the current browser session.';
  }

  if (executionMode === 'iframe-sandbox') {
    return `${definition.title} will require a future iframe-backed sandbox runner.`;
  }

  if (executionMode === 'node-only') {
    return `${definition.title} is intended for a future Node-only execution path.`;
  }

  return `${definition.title} is not runnable in the current environment.`;
}
