/**
 * Browser stub for Node's `worker_threads`.
 *
 * flAST's `applyIteratively` optionally isolates a modifier with `maxRunTimeMs`
 * in a worker thread. That path is Node-only; the SPA never arms it, but Vite
 * still sees the dynamic `import('node:worker_threads')` and would otherwise
 * externalize the builtin (warning + a dummy chunk).
 */

export class Worker {
  constructor() {
    throw new Error(
      'node:worker_threads is not available in the browser. ' +
      'applyIteratively modifier timeouts (maxRunTimeMs) require Node.js.',
    );
  }
}

export const parentPort = null;
export const isMainThread = true;

export default {
  Worker,
  parentPort,
  isMainThread,
};
