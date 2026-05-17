/**
 * Builds illustrative code snippets for API surface detectors from registry metadata.
 */

/** @type {Set<string>} */
const GLOBAL_RECEIVERS = new Set([
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'screen',
  'crypto',
  'performance',
]);

/**
 * @type {Record<string, { setup?: string; receiver: string }>}
 */
const RECEIVER_BINDINGS = {
  HTMLCanvasElement: {
    setup: "const canvas = document.createElement('canvas');",
    receiver: 'canvas',
  },
  CanvasRenderingContext2D: {
    setup: [
      "const canvas = document.createElement('canvas');",
      "const ctx = canvas.getContext('2d');",
    ].join('\n'),
    receiver: 'ctx',
  },
  XMLHttpRequest: {
    setup: 'const xhr = new XMLHttpRequest();',
    receiver: 'xhr',
  },
  Element: {
    setup: "const element = document.getElementById('app');",
    receiver: 'element',
  },
  SubtleCrypto: {
    receiver: 'crypto.subtle',
  },
  ServiceWorkerContainer: {
    receiver: 'navigator.serviceWorker',
  },
};

/** @type {Record<string, string>} */
const METHOD_CALL_ARGS = {
  getItem: "('key')",
  setItem: "('key', 'value')",
  removeItem: "('key')",
  clear: '()',
  fetch: "('https://example.com/api')",
  open: "('GET', 'https://example.com/api')",
  getContext: "('2d')",
  toDataURL: '()',
  getImageData: '(0, 0, 1, 1)',
  encrypt: '(algorithm, key, data)',
  digest: "('SHA-256', data)",
  getRandomValues: '(new Uint8Array(16))',
  now: '()',
  setTimeout: '(() => {}, 1000)',
  setInterval: '(() => {}, 1000)',
  eval: "('1 + 1')",
  insertAdjacentHTML: "('beforeend', '<p>hi</p>')",
  register: "('/sw.js')",
};

/** @type {Record<string, string>} */
const CONSTRUCTOR_ARGS = {
  WebSocket: "'wss://example.com/socket'",
  Worker: "'/worker.js'",
  SharedWorker: "'/shared-worker.js'",
  Function: "'return 1'",
};

/**
 * @param {import('./detectorDefinition.js').ApiDetectorRow} row
 * @returns {string}
 */
function receiverFor(row) {
  if (GLOBAL_RECEIVERS.has(row.apiObject)) return row.apiObject;
  return RECEIVER_BINDINGS[row.apiObject]?.receiver ?? row.apiObject;
}

/**
 * @param {import('./detectorDefinition.js').ApiDetectorRow} row
 * @returns {string[]}
 */
function setupLinesFor(row) {
  const setup = RECEIVER_BINDINGS[row.apiObject]?.setup;
  return setup ? setup.split('\n') : [];
}

/**
 * @param {import('./detectorDefinition.js').ApiDetectorRow} row
 * @returns {string}
 */
function buildUsageLine(row) {
  const receiver = receiverFor(row);

  switch (row.apiKind) {
    case 'property-read':
      return `const value = ${receiver}.${row.apiName};`;

    case 'property-write':
      if (row.apiName === 'prototype') {
        return `${row.apiObject}.prototype.customHook = function () {};`;
      }
      if (row.apiName === 'innerHTML') {
        return `${receiver}.innerHTML = '<p>content</p>';`;
      }
      if (row.apiName === 'cookie') {
        return "document.cookie = 'sessionId=abc; Path=/; Secure';";
      }
      return `${receiver}.${row.apiName} = value;`;

    case 'method-call': {
      const args = METHOD_CALL_ARGS[row.apiName] ?? '()';
      if (row.apiObject === 'window') {
        return `${row.apiName}${args};`;
      }
      return `${receiver}.${row.apiName}${args};`;
    }

    case 'constructor': {
      const args = CONSTRUCTOR_ARGS[row.apiObject] ?? '()';
      return `const instance = new ${row.apiObject}(${args});`;
    }

    default:
      return `${receiver}.${row.apiName};`;
  }
}

/**
 * @param {import('./detectorDefinition.js').ApiDetectorRow} row
 * @returns {string}
 */
export function buildApiDetectorCodeExample(row) {
  const lines = [...setupLinesFor(row), buildUsageLine(row)];
  return lines.join('\n');
}
