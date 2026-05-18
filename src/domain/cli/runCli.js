import {join, basename, extname} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {
  parseCliArgs,
  validateCliOptions,
  printCliHelp,
  printCliVersion,
} from './cliOptions.js';
import {readInput, CliInputError} from './readInput.js';
import {runAnalysis, ParseFailedError} from './runAnalysis.js';
import {enrichReportFindings} from './enrichReportFindings.js';
import {formatReportJson} from './formatReportJson.js';
import {CliValidationError} from './resolveStructureSelection.js';

/**
 * Main CLI entry point.
 *
 * @param {string[]} argv  process.argv.slice(2)
 */
export async function runCli(argv) {
  // Step 1 — parse flags
  let options;
  try {
    options = parseCliArgs(argv);
  } catch (err) {
    exitError(`flaster: ${err.message}\nRun flaster --help for usage.`);
    return;
  }

  // Step 2 — --help / --version (before validation)
  if (options.help) {
    printCliHelp();
    process.exit(0);
    return;
  }

  if (options.version) {
    printCliVersion();
    process.exit(0);
    return;
  }

  // Step 3 — validate flag groups (exit 1 before any I/O)
  const validationError = validateCliOptions(options);
  if (validationError) {
    exitError(`flaster: ${validationError}`);
    return;
  }

  // Step 4 — read input
  let input;
  try {
    input = await readInput(options.input);
  } catch (err) {
    if (err instanceof CliInputError) {
      exitError(`flaster: ${err.message}`);
      return;
    }

    const msg = err?.code === 'ENOENT'
      ? `File not found: ${options.input}`
      : `Failed to read input: ${err.message}`;
    exitError(`flaster: ${msg}`);
    return;
  }

  // Step 5 — run analysis + report pipeline
  let envelope;
  try {
    envelope = await runAnalysis(input, options);
  } catch (err) {
    if (err instanceof CliValidationError) {
      exitError(`flaster: ${err.message}`);
      return;
    }

    if (err instanceof ParseFailedError) {
      process.stderr.write(`flaster: parse failed — ${err.message}\n`);
      process.exit(2);
      return;
    }

    process.stderr.write(`flaster: internal error — ${err.message}\n${err.stack ?? ''}\n`);
    process.exit(3);
    return;
  }

  // Step 6 — enrich findings (evidence locations + --full fields)
  const {_store, ...reportEnvelope} = envelope;
  enrichReportFindings(reportEnvelope.sections, _store, input.source, options.full);

  // Step 7 — format
  const formatted = formatReportJson(reportEnvelope);

  // Step 8 — write output
  if (options.stdout) {
    process.stdout.write(formatted + '\n');
    process.exit(0);
    return;
  }

  const outputPath = options.output ?? defaultOutputPath(input, options.format);
  try {
    await writeFile(outputPath, formatted + '\n', 'utf8');
    process.stderr.write(`flaster: report written to ${outputPath}\n`);
  } catch (err) {
    process.stderr.write(`flaster: failed to write output — ${err.message}\n`);
    process.exit(3);
    return;
  }

  process.exit(0);
}

/**
 * @param {import('./readInput.js').InputResult} input
 * @param {'json' | 'html'} format
 * @returns {string}
 */
function defaultOutputPath(input, format) {
  if (input.inputKind === 'stdin') {
    return join(input.defaultOutputDir, `stdin-flaster-report.${format}`);
  }

  const base = basename(input.inputPath, extname(input.inputPath));
  return join(input.defaultOutputDir, `${base}-flaster-report.${format}`);
}

/**
 * @param {string} message
 */
function exitError(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
