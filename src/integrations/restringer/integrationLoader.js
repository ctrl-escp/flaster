/** @type {Promise<typeof import('./index.js')> | null} */
let integrationPromise = null;

/**
 * Lazy-loads the full REstringer integration (safe modules, matchers, transforms).
 * Cached after the first successful load.
 *
 * @returns {Promise<typeof import('./index.js')>}
 */
export function loadRestringerIntegration() {
  integrationPromise ??= import('./index.js');
  return integrationPromise;
}
