import {createRequire} from 'node:module';
import {parseSource} from '../../domain/parse/parseSource.js';

const require = createRequire(import.meta.url);
const {version: flasterVersion} = require('../../../package.json');
import {
  buildHydratedKnownStructureCatalog,
  runApiDetectors,
  runInferences,
  syncDetectorHits,
  apiDetectorRegistry,
} from '../../domain/apiSurface/index.js';
import {loadRestringerIntegration} from '../../integrations/restringer/index.js';
import {detectStructures} from '../../integrations/restringer/matchingEngine.js';
import {buildReportModel} from '../../domain/report/reportModel.js';
import {createAnalysisStore} from './createAnalysisStore.js';
import {resolveStructureSelection, CliValidationError} from './resolveStructureSelection.js';
import {resolveReportSections} from './resolveReportSections.js';

/**
 * @typedef {import('./readInput.js').InputResult} InputResult
 * @typedef {import('./cliOptions.js').CliOptions} CliOptions
 */

/**
 * @param {InputResult} input
 * @param {CliOptions} options
 * @returns {Promise<object>}  the report envelope
 */
export async function runAnalysis(input, options) {
  const {source, inputLabel, inputKind, inputPath} = input;

  // Step 1 — parse
  const parseResult = parseSource(source);
  if (!parseResult.ok) {
    const msg = parseResult.diagnostics.map((d) => d.message).join('; ');
    throw new ParseFailedError(msg, parseResult.diagnostics);
  }
  const {arborist} = parseResult;

  // Step 2 — catalog
  const restringer = await loadRestringerIntegration();
  const catalog = buildHydratedKnownStructureCatalog(restringer.knownStructures);

  // Step 3 — headless store
  const store = createAnalysisStore({availableKnownStructures: catalog});
  store.arb = arborist;

  // Step 4 — resolve which analysis to run (may throw CliValidationError for bad --structures ids)
  let selection;
  try {
    selection = resolveStructureSelection(options, catalog);
  } catch (err) {
    if (err instanceof CliValidationError) {
      throw err;
    }
    throw err;
  }

  const {obfuscationIds, includeApiSurface, includeCapabilities, skippedNonNoEvalCount} = selection;

  // Step 5 — stderr no-eval warning
  if (skippedNonNoEvalCount > 0) {
    process.stderr.write(
      `flaster: only no-eval structures are executed; ${skippedNonNoEvalCount} catalog ` +
      `entr${skippedNonNoEvalCount === 1 ? 'y' : 'ies'} require iframe-sandbox or node-only and were not run.\n`,
    );
  }

  // Step 6 — obfuscation matching
  if (obfuscationIds.length > 0) {
    const session = await detectStructures({
      source,
      arborist,
      structureIds: obfuscationIds,
      catalog,
    });

    // Merge session results into store
    store.latestKnownStructureMatches = session.matches;
    store.knownStructureMatchesById   = Object.fromEntries(
      session.runs.map((run) => [run.structureId, run.matches]),
    );
    store.knownStructureMatchCounts   = session.matchCounts;
    store.knownStructureExecutionErrors = session.errors;
    store.knownStructureExecutionStatus = {
      state: 'idle',
      totalMatches: session.matches.length,
      lastRunAt: new Date().toISOString(),
    };
  }

  // Step 7 — api-surface matching
  if (includeApiSurface) {
    const detectorResults = runApiDetectors(arborist);

    const hits = {};
    for (const row of apiDetectorRegistry) {
      const matches = detectorResults.get(row.id);
      if (matches?.length) hits[row.id] = matches;
    }
    store.apiDetectorHits = hits;
    store.capabilities = includeCapabilities ? runInferences(detectorResults) : [];
    store.apiSurfaceStatus = 'done';

    syncDetectorHits(store);
  }

  // Step 8 — build report model
  const rawReport = buildReportModel(store);

  // Step 9 — apply report section filters
  const filteredSections = resolveReportSections(rawReport.sections, options);
  const report = {
    ...rawReport,
    sections: filteredSections,
    totalFindings: filteredSections.reduce((sum, s) => sum + s.findings.length, 0),
  };

  // Step 10 — build meta envelope
  const analyzedSections = [
    ...(obfuscationIds.length > 0 ? ['obfuscation'] : []),
    ...(includeApiSurface ? ['api-surface'] : []),
  ];

  return {
    meta: {
      flasterVersion,
      input: {
        kind: inputKind,
        path: inputPath,
        label: inputLabel,
      },
      analyzedAt: new Date().toISOString(),
      parse: {
        ok: parseResult.ok,
        diagnostics: parseResult.diagnostics,
      },
      analysis: {
        sections: analyzedSections,
        structureIds: obfuscationIds,
        skippedNonNoEvalCount,
      },
      report: {
        onlySections: options.onlySection.length > 0 ? options.onlySection : null,
        excludeSections: options.excludeSection.length > 0 ? options.excludeSection : null,
        fullDetail: options.full,
      },
    },
    status: 'done',
    totalFindings: report.totalFindings,
    sections: report.sections,
    _store: store,
  };
}

export class ParseFailedError extends Error {
  constructor(message, diagnostics) {
    super(message);
    this.name = 'ParseFailedError';
    this.diagnostics = diagnostics;
  }
}
