import {createApiInteractionsSection} from './sections/apiInteractions.js';
import {createFiltersSection} from './sections/filters.js';
import {createKnownStructuresSection} from './sections/knownStructures.js';
import {createPersistenceSection} from './sections/persistence.js';
import {createPipelineSection} from './sections/pipeline.js';
import {createScriptHistorySection} from './sections/scriptHistory.js';
import {createShellSection} from './sections/shell.js';
import {createTemplateApplySection} from './sections/templateApply.js';
import {createWorkspaceExploreSection} from './sections/workspaceExplore.js';

/**
 * @typedef {import('@codemirror/view').EditorView} EditorView
 */

/**
 * @typedef {ReturnType<import('../../integrations/restringer/matchingEngine.js').createKnownStructureState>['availableKnownStructures'][number]} KnownStructureDescriptor
 */

/**
 * @typedef {ReturnType<import('../../integrations/restringer/matchingEngine.js').createKnownStructureState>['latestKnownStructureMatches'][number]} KnownStructureMatch
 */

/**
 * @typedef {{
 *   structureId: string,
 *   index: number,
 * } | null} KnownStructureMatchSelection
 */

/**
 * @typedef {Record<string, number>} KnownStructureSelectionIndexMap
 */

/**
 * @typedef {{
 *   structureId: string,
 *   structureTitle: string,
 *   transformName: string,
 *   executionMode: string,
 *   targetedMatchCount: number,
 *   pendingChanges: number,
 *   selectedMatchCount: number,
 *   previewedAt: string,
 *   hasChanges: boolean,
 *   error: Error | null,
 * } | null} KnownStructureTransformPreview
 */

/**
 * @typedef {{
 *   kind: 'custom',
 *   filters: unknown[],
 *   transformationCode: string,
 * }} StoredCustomStep
 */

/**
 * @typedef {{
 *   kind: 'known-structure-transform',
 *   structureId: string,
 *   structureTitle: string,
 *   moduleName: string,
 *   matcherName: string,
 *   transformName: string,
 *   affectedMatchCount: number,
 *   appliedChanges: number,
 *   appliedAt: string,
 *   sequenceIndex: number,
 * }} StoredKnownStructureTransformStep
 */

/**
 * @typedef {StoredCustomStep | StoredKnownStructureTransformStep} StoredTransformationStep
 */

/**
 * Reactive store blueprint (plain object). Wrap with `reactive()` in `createAppStore`.
 * Composed from thematic `sections/*` factories that each return a fragment merged into one store.
 *
 * @param {ReturnType<import('../../integrations/restringer/matchingEngine.js').createKnownStructureState>} knownStructureState
 */
export function createStoreBlueprint(knownStructureState) {
  return {
    ...createShellSection(),
    ...createScriptHistorySection(),
    ...createWorkspaceExploreSection(),
    ...createFiltersSection(),
    ...createKnownStructuresSection(knownStructureState),
    ...createPipelineSection(),
    ...createTemplateApplySection(),
    ...createPersistenceSection(),
    ...createApiInteractionsSection(),
  };
}
