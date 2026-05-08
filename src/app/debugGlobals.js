import * as flast from 'flast/src/index.js';
import flastPackage from 'flast/package.json' with {type: 'json'};
import restringerSafe from '../integrations/restringer/index.js';
import store from '../store.js';

function shouldInstallDebugGlobals() {
  return import.meta.env.DEV || import.meta.env.VITE_DEBUG_GLOBALS === 'true';
}

/**
 * Attaches browser-only debug handles used for manual console inspection.
 * Called once from the app entry; no-op in non-browser or when debug is disabled.
 */
export function installDebugGlobals() {
  if (typeof window === 'undefined' || !shouldInstallDebugGlobals()) {
    return;
  }

  window.flast = {...flast, version: flastPackage.version};
  window.restringer = restringerSafe;
  window.selectedNode = null;
  window.store = store;
}
