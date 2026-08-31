import {reportSectionRegistry} from '../report/reportSectionRegistry.js';
import {apiDetectorRegistry} from '../apiSurface/detectorRegistry.js';
import {buildHydratedKnownStructureCatalog} from '../apiSurface/index.js';
import {loadRestringerIntegration} from '../../integrations/restringer/integrationLoader.js';
import {ANALYSIS_SECTION_IDS} from './cliOptions.js';

const ANALYSIS_SECTION_HELP = {
  obfuscation: 'REstringer structure matchers (use --structures for individual ids)',
  'api-surface': 'All API surface detectors and capability inferences',
};

/**
 * Prints analysis sections, report sections, and catalog structure ids to stdout.
 */
export async function printCliList() {
  const restringer = await loadRestringerIntegration();
  const structures = buildHydratedKnownStructureCatalog(restringer.knownStructures);

  process.stdout.write('Analysis sections (--section):\n');
  for (const id of ANALYSIS_SECTION_IDS) {
    process.stdout.write(`  ${id.padEnd(14)} ${ANALYSIS_SECTION_HELP[id] ?? ''}\n`);
  }

  process.stdout.write('\nReport sections (--only-section / --exclude-section):\n');
  for (const section of reportSectionRegistry) {
    process.stdout.write(`  ${section.id.padEnd(14)} ${section.title} — ${section.helperCopy}\n`);
  }

  const obfuscation = structures.filter(
    (s) => s.categoryGroup === 'obfuscation',
  );
  const runnable = obfuscation.filter(
    (s) => s.executionMode === 'no-eval' && s.matcherAvailable !== false,
  );
  const skipped = obfuscation.length - runnable.length;

  process.stdout.write('\nObfuscation structures (--structures, no-eval runnable in v1):\n');
  for (const structure of runnable.sort((a, b) => a.id.localeCompare(b.id))) {
    const category = structure.category ? ` [${structure.category}]` : '';
    process.stdout.write(`  ${structure.id.padEnd(28)} ${structure.title}${category}\n`);
  }

  if (skipped > 0) {
    process.stdout.write(
      `\n  (${skipped} obfuscation structure${skipped === 1 ? '' : 's'} require iframe-sandbox or ` +
      'node-only and cannot be run via CLI in v1.)\n',
    );
  }

  process.stdout.write('\nAPI surface detectors (use --section api-surface, not --structures in v1):\n');
  for (const row of apiDetectorRegistry) {
    const category = row.category ? ` [${row.category}]` : '';
    process.stdout.write(`  ${row.id.padEnd(28)} ${row.title}${category}\n`);
  }
}
