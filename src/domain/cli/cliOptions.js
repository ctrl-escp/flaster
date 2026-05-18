import {parseArgs} from 'node:util';
import {getToolVersions} from './toolVersions.js';

/**
 * @typedef {{
 *   input: string | null,
 *   format: 'json' | 'html',
 *   output: string | null,
 *   stdout: boolean,
 *   section: string[],
 *   structures: string[],
 *   onlySection: string[],
 *   excludeSection: string[],
 *   full: boolean,
 *   help: boolean,
 *   version: boolean,
 *   list: boolean,
 * }} CliOptions
 */

export const ANALYSIS_SECTION_IDS = ['obfuscation', 'api-surface'];
const REPORT_SECTION_IDS = ['obfuscation', 'api-surface', 'capabilities'];

const PARSE_ARGS_CONFIG = {
  allowPositionals: true,
  options: {
    format:          {type: 'string',  short: 'f'},
    output:          {type: 'string',  short: 'o'},
    stdout:          {type: 'boolean'},
    section:         {type: 'string',  multiple: true},
    structures:      {type: 'string',  multiple: true},
    'only-section':  {type: 'string',  multiple: true},
    'exclude-section': {type: 'string', multiple: true},
    full:            {type: 'boolean'},
    help:            {type: 'boolean', short: 'h'},
    version:         {type: 'boolean', short: 'v'},
    list:            {type: 'boolean'},
  },
};

/**
 * Expands comma-separated values within a string array.
 * `['a,b', 'c']` → `['a', 'b', 'c']`
 *
 * @param {string[]} values
 * @returns {string[]}
 */
export function expandListArgs(values) {
  if (!Array.isArray(values)) return [];
  return values.flatMap((v) => v.split(',').map((s) => s.trim()).filter(Boolean));
}

/**
 * Parses and normalises raw argv into CliOptions.
 *
 * @param {string[]} argv
 * @returns {CliOptions}
 */
export function parseCliArgs(argv) {
  const {values, positionals} = parseArgs({args: argv, ...PARSE_ARGS_CONFIG});

  const format = values.format ?? 'json';

  return {
    input: positionals[0] ?? null,
    format: format === 'html' ? 'html' : 'json',
    output: values.output ?? null,
    stdout: values.stdout ?? false,
    section: expandListArgs(values.section ?? []),
    structures: expandListArgs(values.structures ?? []),
    onlySection: expandListArgs(values['only-section'] ?? []),
    excludeSection: expandListArgs(values['exclude-section'] ?? []),
    full: values.full ?? false,
    help: values.help ?? false,
    version: values.version ?? false,
    list: values.list ?? false,
  };
}

/**
 * Validates parsed CLI options. Returns null on success, or an error string on failure.
 * Structure id existence is validated later (requires catalog).
 *
 * @param {CliOptions} options
 * @returns {string | null}
 */
export function validateCliOptions(options) {
  const hasAnalysisFlags  = options.section.length > 0 || options.structures.length > 0;
  const hasReportFilters  = options.onlySection.length > 0 || options.excludeSection.length > 0;

  if (hasAnalysisFlags && hasReportFilters) {
    return (
      'Analysis flags (--section, --structures) and report filters (--only-section, --exclude-section) ' +
      'are mutually exclusive. Use one group per invocation.'
    );
  }

  if (options.onlySection.length > 0 && options.excludeSection.length > 0) {
    return '--only-section and --exclude-section are mutually exclusive.';
  }

  if (options.section.length > 0 && options.structures.length > 0) {
    return '--section and --structures are mutually exclusive. Use one per invocation.';
  }

  for (const id of options.section) {
    if (!ANALYSIS_SECTION_IDS.includes(id)) {
      return `Unknown analysis section id "${id}". Valid ids: ${ANALYSIS_SECTION_IDS.join(', ')}.`;
    }
  }

  for (const id of options.onlySection) {
    if (!REPORT_SECTION_IDS.includes(id)) {
      return `Unknown report section id "${id}" in --only-section. Valid ids: ${REPORT_SECTION_IDS.join(', ')}.`;
    }
  }

  for (const id of options.excludeSection) {
    if (!REPORT_SECTION_IDS.includes(id)) {
      return `Unknown report section id "${id}" in --exclude-section. Valid ids: ${REPORT_SECTION_IDS.join(', ')}.`;
    }
  }

  return null;
}

export function printCliHelp() {
  process.stdout.write(`\
Usage: flaster [<input>] [options]

  <input>                    Path to a .js file, or "-" for stdin.
                             If omitted and stdin is piped, reads from stdin.

Analysis scope (pick at most one group; cannot be combined with report filters):
  --section <id>             Run matchers in section: obfuscation, api-surface
                             Repeatable and comma-separated.
  --structures <id>          Run specific obfuscation structure ids only (v1).
                             Repeatable and comma-separated.

Report scope (implies full analysis; cannot be combined with analysis flags):
  --only-section <id>        Emit only listed report sections.
                             Valid ids: obfuscation, api-surface, capabilities.
  --exclude-section <id>     Omit listed report sections.

Output (combinable with any scope):
  -f, --format json|html     Report format. Default: json
  -o, --output <path>        Output file path. Default: <input-dir>/<basename>-flaster-report.<ext>
  --stdout                   Write report to stdout instead of a file.
  --full                     Include descriptions, snippets, and extractions.

  --list                     List analysis sections, report sections, and structure ids.
  -h, --help                 Show this message.
  -v, --version              Show flASTer, flAST, and REstringer versions.

Exit codes:
  0  Parse OK; report written (including zero findings)
  1  User error (bad flags, unknown ids, incompatible flag groups)
  2  Parse failed
  3  Internal error

CI note: findings never affect the exit code. Use totalFindings in the JSON output.

Examples:
  flaster script.js
  flaster script.js --only-section obfuscation
  flaster script.js --section obfuscation --full --stdout
  echo 'window.innerWidth' | flaster - --stdout --format json
  flaster script.js --stdout --format html
  flaster --list
`);
}

export function printCliVersion() {
  const versions = getToolVersions();
  process.stdout.write(
    `flaster ${versions.flaster} (flAST ${versions.flast}, REstringer ${versions.restringer})\n`,
  );
}
