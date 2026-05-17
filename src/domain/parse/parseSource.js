/** @import {Arborist} from '../../flastTypes.js' */
import {Arborist} from 'flast/src/arborist.js';

/**
 * @typedef {object} ParseDiagnostic
 * @property {'error' | 'warning' | 'info'} [severity]
 * @property {string} [code]
 * @property {string} message
 */

/**
 * @typedef {object} ParseResult
 * @property {boolean} ok
 * @property {string} source
 * @property {Arborist | null} arborist
 * @property {Error | null} error
 * @property {number} parseRunId
 * @property {ParseDiagnostic[]} diagnostics
 */

/**
 * @param {unknown} raw
 * @returns {ParseDiagnostic[]}
 */
export function normalizeParseDiagnostics(raw) {
  const out = /** @type {ParseDiagnostic[]} */ ([]);
  if (raw === null || raw === undefined) {
    return out;
  }

  const list = Array.isArray(raw) ? raw : [raw];

  for (const item of list) {
    if (item === null || item === undefined) {
      continue;
    }

    if (item instanceof Error) {
      out.push({severity: 'error', code: 'exception', message: item.message});
      continue;
    }

    if (typeof item === 'object' && typeof item.message === 'string') {
      const rec = /** @type {Record<string, unknown>} */ (item);
      const sev = rec.severity;
      const code = rec.code;
      out.push({
        severity: sev === 'warning' || sev === 'info' || sev === 'error' ? sev : 'error',
        code: typeof code === 'string' ? code : 'diagnostic',
        message: item.message,
      });
      continue;
    }

    out.push({severity: 'error', code: 'diagnostic', message: String(item)});
  }

  return out;
}

/**
 * Increments the caller-owned parse-run counter (every parse attempt, including failures).
 *
 * @param {number} current
 * @returns {number}
 */
export function nextParseRunId(current) {
  return current + 1;
}

/**
 * @param {string} script
 * @returns {Arborist}
 */
export function createArborist(script) {
  return new Arborist(script);
}

/**
 * Parse JavaScript source into a flAST Arborist. `parseRunId` should increase on
 * every attempt (including failed parses) so consumers can invalidate stale UI.
 *
 * @param {string} source
 * @param {{ parseRunId?: number, ArboristClass?: typeof Arborist }} [options]
 * @returns {ParseResult}
 */
export function parseSource(source, options = {}) {
  const parseRunId = typeof options.parseRunId === 'number' ? options.parseRunId : 0;
  const ArboristCtor = options.ArboristClass ?? Arborist;
  const str = typeof source === 'string' ? source : String(source ?? '');

  if (!str.trim().length) {
    return {
      ok: false,
      source: str,
      arborist: null,
      error: null,
      parseRunId,
      diagnostics: [{severity: 'info', code: 'empty-input', message: 'No source text to parse'}],
    };
  }

  try {
    const arborist = new ArboristCtor(str);

    if (!arborist.ast?.length) {
      return {
        ok: false,
        source: str,
        arborist,
        error: null,
        parseRunId,
        diagnostics: [
          {
            severity: 'error',
            code: 'parse-no-nodes',
            message: 'Parser produced no AST nodes',
          },
        ],
      };
    }

    return {
      ok: true,
      source: str,
      arborist,
      error: null,
      parseRunId,
      diagnostics: [],
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return {
      ok: false,
      source: str,
      arborist: null,
      error,
      parseRunId,
      diagnostics: normalizeParseDiagnostics([error]),
    };
  }
}
