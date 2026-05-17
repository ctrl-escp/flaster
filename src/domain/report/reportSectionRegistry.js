import {
  collectApiSurfaceFindings,
  collectCapabilityFindings,
  collectStructureFindingsForGroup,
} from './reportCollectors.js';

/**
 * @typedef {{
 *   store: object,
 *   status: import('./reportCollectors.js').ReportStatus,
 * }} ReportCollectContext
 */

/**
 * @typedef {import('./reportFilters.js').ReportFilterId} ReportFilterId
 */

/**
 * @typedef {{
 *   id: string,
 *   filterId: ReportFilterId,
 *   title: string,
 *   helperCopy: string,
 *   collect: (context: ReportCollectContext) => import('./reportCollectors.js').ReportFinding[],
 * }} ReportSectionDefinition
 */

/** @type {ReportSectionDefinition[]} */
export const reportSectionRegistry = [
  {
    id: 'capabilities',
    filterId: 'api-surface',
    title: 'Capabilities',
    helperCopy: 'Higher-level patterns inferred from API surface detector co-occurrence.',
    collect({store, status}) {
      if (status !== 'done' || store.apiSurfaceStatus !== 'done') {
        return [];
      }
      return collectCapabilityFindings(store);
    },
  },
  {
    id: 'obfuscation',
    filterId: 'obfuscation',
    title: 'Obfuscation',
    helperCopy: 'Known obfuscation structures matched in the loaded script.',
    collect({store, status}) {
      if (status !== 'done') {
        return [];
      }
      return collectStructureFindingsForGroup(store, 'obfuscation');
    },
  },
  {
    id: 'api-surface',
    filterId: 'api-surface',
    title: 'Detectors',
    helperCopy: 'Browser and runtime API usage detected in the AST.',
    collect({store, status}) {
      if (status !== 'done' || store.apiSurfaceStatus !== 'done') {
        return [];
      }
      return collectApiSurfaceFindings(store);
    },
  },
];
