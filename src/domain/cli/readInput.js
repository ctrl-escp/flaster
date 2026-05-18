import {readFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {cwd} from 'node:process';

/**
 * @typedef {{
 *   source: string,
 *   inputLabel: string,
 *   defaultOutputDir: string,
 *   inputKind: 'file' | 'stdin',
 *   inputPath: string | null,
 * }} InputResult
 */

/**
 * @param {string | null} inputArg  value of positional arg (path, '-', or null)
 * @returns {Promise<InputResult>}
 */
export async function readInput(inputArg) {
  const useStdin = inputArg === '-' || (inputArg === null && !process.stdin.isTTY);

  if (useStdin) {
    const source = await readStdin();
    return {
      source,
      inputLabel: 'stdin',
      defaultOutputDir: cwd(),
      inputKind: 'stdin',
      inputPath: null,
    };
  }

  if (!inputArg) {
    throw new CliInputError('No input provided. Pass a file path or pipe source via stdin.');
  }

  const absolutePath = resolve(cwd(), inputArg);
  const source = await readFile(absolutePath, 'utf8');

  return {
    source,
    inputLabel: absolutePath,
    defaultOutputDir: dirname(absolutePath),
    inputKind: 'file',
    inputPath: absolutePath,
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export class CliInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CliInputError';
  }
}
