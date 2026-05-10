import {knownStructureRegistry} from './catalog.js';
import {
  createAvailabilityNote,
  createSearchText,
  getExecutionMode,
} from './capabilities.js';

/**
 * Catalog entries for the UI before the heavy REstringer bundle is loaded.
 * Matchers and transforms are absent until {@link loadRestringerIntegration} hydrates the store.
 */
export const liteKnownStructures = Object.freeze(
  knownStructureRegistry.map((definition) => {
    const executionMode = getExecutionMode(definition);

    return Object.freeze({
      id: definition.id,
      title: definition.title,
      categoryGroup: definition.categoryGroup ?? 'obfuscation',
      category: definition.category,
      description: definition.description,
      codeExample: definition.codeExample ?? '',
      searchText: createSearchText(definition),
      noEval: definition.noEval ?? executionMode === 'no-eval',
      executionMode,
      matcher: null,
      transform: null,
      matcherAvailable: false,
      transformAvailable: false,
      transformEnabled: false,
      support: Object.freeze({
        safeMatch: false,
        safeTransform: false,
        sandboxMatch: executionMode === 'iframe-sandbox',
        sandboxTransform: executionMode === 'iframe-sandbox',
        nodeMatch: executionMode === 'node-only',
        nodeTransform: executionMode === 'node-only',
        note: createAvailabilityNote(definition),
      }),
      implementation: Object.freeze({
        moduleName: definition.moduleName,
        matcherName: definition.matcherName,
        transformName: definition.transformName,
      }),
    });
  }),
);
