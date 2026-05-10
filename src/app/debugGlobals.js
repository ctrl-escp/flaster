import flastPackage from 'flast/package.json' with {type: 'json'};
import {watchEffect} from 'vue';
import {createConsoleCatalog} from './consoleCatalog.js';
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

  const [flastNs, integrationMod] = await Promise.all([
    import('flast/src/index.js'),
    import('../integrations/restringer/index.js'),
  ]);

  const restringerSafe = integrationMod.default;

  window.flast = {
    ...flastNs,
    version: flastPackage.version,
    async applyArboristToUI(arborist) {
      return store.applyArboristToWorkspace(arborist);
    },
  };

  const catalog = createConsoleCatalog(store, restringerSafe);
  window.catalog = catalog;

  window.store = store;

  watchEffect(() => {
    window.arborist = store.arb ?? null;
    window.selectedNode = store.getSelectedNode();
  });
}
