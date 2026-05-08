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
 * @property {import('flast/src/arborist.js').Arborist | null} arborist
 * @property {Error | null} error
 * @property {number} version
 * @property {ParseDiagnostic[]} diagnostics
 */

/**
 * @param {unknown} raw
 * @returns {ParseDiagnostic[]}
 */
export function normalizeParseDiagnostics(raw) {
  const out = /** @type {ParseDiagnostic[]} */ ([]);
  if (raw == null) {
    return out;
  }

  const list = Array.isArray(raw) ? raw : [raw];

  for (const item of list) {
    if (item == null) {
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
 * Monotonic parse-attempt counter helper (caller stores the last value).
 *
 * @param {number} current
 * @returns {number}
 */
export function nextParseAttemptVersion(current) {
  return current + 1;
}

/**
 * @param {string} script
 * @returns {import('flast/src/arborist.js').Arborist}
 */
export function createArborist(script) {
  return new Arborist(script);
}

/**
 * Parse JavaScript source into a flAST Arborist. `version` should increase on
 * every attempt (including failed parses) so consumers can invalidate stale UI.
 *
 * @param {string} source
 * @param {{ version?: number, ArboristClass?: typeof Arborist }} [options]
 * @returns {ParseResult}
 */
export function parseSource(source, options = {}) {
  const version = typeof options.version === 'number' ? options.version : 0;
  const ArboristCtor = options.ArboristClass ?? Arborist;
  const str = typeof source === 'string' ? source : String(source ?? '');

  if (!str.trim().length) {
    return {
      ok: false,
      source: str,
      arborist: null,
      error: null,
      version,
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
        version,
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
      version,
      diagnostics: [],
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return {
      ok: false,
      source: str,
      arborist: null,
      error,
      version,
      diagnostics: normalizeParseDiagnostics([error]),
    };
  }
}
