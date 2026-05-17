/**
 * Aggregates all API interaction detector matchers into a single keyed map.
 *
 * Each entry is a file named after the detector id it implements.
 * The exported function is always named `matcher`, making every file uniform and
 * easy to navigate — open any <id>.js, read one function, understand one detector.
 *
 * Matcher function contract:
 *   (node: ASTNode, arb: Arborist) => DetectorMatch | null
 *
 *   - The engine pre-filters nodes to the correct AST type before calling the function.
 *   - Return null when the node does not satisfy the detector's specific conditions.
 *   - Return a DetectorMatch (node + extractions[]) when it does.
 *
 * Adding a new detector:
 *   1. Add the metadata row to detectorRegistry.js.
 *   2. Create matchers/<detector-id>.js exporting a `matcher` function.
 *   3. Add the import and map entry below.
 *   The startup validation at the bottom will catch any id mismatch immediately.
 *
 * Shared utilities live in common.js.
 */

import {matcher as windowInnerWidth} from './window-inner-width.js';
import {matcher as windowOuterWidth} from './window-outer-width.js';
import {matcher as windowInnerHeight} from './window-inner-height.js';
import {matcher as windowOuterHeight} from './window-outer-height.js';
import {matcher as screenWidth} from './screen-width.js';
import {matcher as screenHeight} from './screen-height.js';
import {matcher as screenAvailWidth} from './screen-avail-width.js';
import {matcher as screenAvailHeight} from './screen-avail-height.js';

import {matcher as documentCookieRead} from './document-cookie-read.js';
import {matcher as documentCookieWrite} from './document-cookie-write.js';
import {matcher as documentDomain} from './document-domain.js';
import {matcher as documentReferrer} from './document-referrer.js';
import {matcher as documentReadyState} from './document-ready-state.js';

import {matcher as localStorageGetItem} from './local-storage-getitem.js';
import {matcher as localStorageSetItem} from './local-storage-setitem.js';
import {matcher as localStorageRemoveItem} from './local-storage-removeitem.js';
import {matcher as localStorageClear} from './local-storage-clear.js';
import {matcher as sessionStorageGetItem} from './session-storage-getitem.js';
import {matcher as sessionStorageSetItem} from './session-storage-setitem.js';
import {matcher as sessionStorageRemoveItem} from './session-storage-removeitem.js';

import {matcher as canvasGetContext} from './canvas-get-context.js';
import {matcher as canvasToDataUrl} from './canvas-to-data-url.js';
import {matcher as canvasGetImageData} from './canvas-get-image-data.js';

import {matcher as objectPrototypeWrite} from './object-prototype-write.js';
import {matcher as functionPrototypeWrite} from './function-prototype-write.js';
import {matcher as arrayPrototypeWrite} from './array-prototype-write.js';

import {matcher as navigatorUserAgent} from './navigator-user-agent.js';
import {matcher as navigatorPlatform} from './navigator-platform.js';
import {matcher as navigatorHardwareConcurrency} from './navigator-hardware-concurrency.js';
import {matcher as navigatorLanguages} from './navigator-languages.js';
import {matcher as navigatorPlugins} from './navigator-plugins.js';
import {matcher as navigatorWebdriver} from './navigator-webdriver.js';

import {matcher as fetchCall} from './fetch-call.js';
import {matcher as xhrOpen} from './xhr-open.js';
import {matcher as websocketConstructor} from './websocket-constructor.js';

import {matcher as setTimeout_} from './set-timeout.js';
import {matcher as setInterval_} from './set-interval.js';
import {matcher as performanceNow} from './performance-now.js';

import {matcher as workerConstructor} from './worker-constructor.js';
import {matcher as sharedWorkerConstructor} from './shared-worker-constructor.js';
import {matcher as serviceWorkerRegister} from './service-worker-register.js';

import {matcher as cryptoGetRandomValues} from './crypto-get-random-values.js';
import {matcher as cryptoSubtleEncrypt} from './crypto-subtle-encrypt.js';
import {matcher as cryptoSubtleDigest} from './crypto-subtle-digest.js';

import {matcher as innerHtmlWrite} from './inner-html-write.js';
import {matcher as insertAdjacentHtml} from './insert-adjacent-html.js';
import {matcher as evalCall} from './eval-call.js';
import {matcher as functionConstructor} from './function-constructor.js';

export const apiDetectorMatchers = Object.freeze({
  'window-inner-width': windowInnerWidth,
  'window-outer-width': windowOuterWidth,
  'window-inner-height': windowInnerHeight,
  'window-outer-height': windowOuterHeight,
  'screen-width': screenWidth,
  'screen-height': screenHeight,
  'screen-avail-width': screenAvailWidth,
  'screen-avail-height': screenAvailHeight,

  'document-cookie-read': documentCookieRead,
  'document-cookie-write': documentCookieWrite,
  'document-domain': documentDomain,
  'document-referrer': documentReferrer,
  'document-ready-state': documentReadyState,

  'local-storage-getitem': localStorageGetItem,
  'local-storage-setitem': localStorageSetItem,
  'local-storage-removeitem': localStorageRemoveItem,
  'local-storage-clear': localStorageClear,
  'session-storage-getitem': sessionStorageGetItem,
  'session-storage-setitem': sessionStorageSetItem,
  'session-storage-removeitem': sessionStorageRemoveItem,

  'canvas-get-context': canvasGetContext,
  'canvas-to-data-url': canvasToDataUrl,
  'canvas-get-image-data': canvasGetImageData,

  'object-prototype-write': objectPrototypeWrite,
  'function-prototype-write': functionPrototypeWrite,
  'array-prototype-write': arrayPrototypeWrite,

  'navigator-user-agent': navigatorUserAgent,
  'navigator-platform': navigatorPlatform,
  'navigator-hardware-concurrency': navigatorHardwareConcurrency,
  'navigator-languages': navigatorLanguages,
  'navigator-plugins': navigatorPlugins,
  'navigator-webdriver': navigatorWebdriver,

  'fetch-call': fetchCall,
  'xhr-open': xhrOpen,
  'websocket-constructor': websocketConstructor,

  'set-timeout': setTimeout_,
  'set-interval': setInterval_,
  'performance-now': performanceNow,

  'worker-constructor': workerConstructor,
  'shared-worker-constructor': sharedWorkerConstructor,
  'service-worker-register': serviceWorkerRegister,

  'crypto-get-random-values': cryptoGetRandomValues,
  'crypto-subtle-encrypt': cryptoSubtleEncrypt,
  'crypto-subtle-digest': cryptoSubtleDigest,

  'inner-html-write': innerHtmlWrite,
  'insert-adjacent-html': insertAdjacentHtml,
  'eval-call': evalCall,
  'function-constructor': functionConstructor,
});

// ── startup validation ────────────────────────────────────────────────────────

import {apiDetectorIds} from '../detectorRegistry.js';

const matcherIds = new Set(Object.keys(apiDetectorMatchers));

for (const id of apiDetectorIds) {
  if (!matcherIds.has(id)) {
    throw new Error(
      `API detector "${id}" is registered in detectorRegistry but has no matcher in matchers/index.js`,
    );
  }
}

for (const id of matcherIds) {
  if (!apiDetectorIds.has(id)) {
    throw new Error(
      `Matcher "${id}" in matchers/index.js has no corresponding entry in detectorRegistry`,
    );
  }
}
