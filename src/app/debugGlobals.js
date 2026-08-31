import flastPackage from 'flast/package.json' with {type: 'json'};
import {watchEffect} from 'vue';
import store from '../store.js';

function shouldInstallDebugGlobals() {
  return import.meta.env.DEV || import.meta.env.VITE_DEBUG_GLOBALS === 'true';
}

/**
 * Attaches browser-only debug handles used for manual console inspection.
 * Called once from the app entry; no-op in non-browser or when debug is disabled.
 */
export async function installDebugGlobals() {
  if (typeof window === 'undefined' || !shouldInstallDebugGlobals()) {
    return;
  }

  const [flastNs, {createConsoleCatalog}] = await Promise.all([
    import('flast/src/index.js'),
    import('./consoleCatalog.js'),
  ]);

  window.flast = {
    ...flastNs,
    version: flastPackage.version,
    async applyArboristToUI(arborist) {
      return store.applyArboristToWorkspace(arborist);
    },
  };

  window.catalog = await createConsoleCatalog(store);

  window.store = store;

  watchEffect(() => {
    window.arborist = store.arb ?? null;
    window.selectedNode = store.getSelectedNode();
  });
}
