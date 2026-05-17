/**
 * Aggregates API interaction detector matchers from category modules.
 *
 * Each category file groups related detectors and re-exports their matcher functions.
 * Per-detector implementations live in `<detector-id>.js` files.
 *
 * Adding a new detector:
 *   1. Add the metadata row to detectorRegistry.js.
 *   2. Create matchers/<detector-id>.js exporting a `matcher` function.
 *   3. Register it in the appropriate category module.
 *   Startup validation below ensures registry ↔ matcher parity.
 */

import {apiDetectorIds} from '../detectorRegistry.js';
import {canvasMatchers} from './canvas.js';
import {cryptoMatchers} from './crypto.js';
import {documentPropsMatchers} from './documentProps.js';
import {domInjectionMatchers} from './domInjection.js';
import {navigatorMatchers} from './navigator.js';
import {networkMatchers} from './network.js';
import {prototypeMatchers} from './prototype.js';
import {storageMatchers} from './storage.js';
import {timingMatchers} from './timing.js';
import {windowGeometryMatchers} from './windowGeometry.js';
import {workersMatchers} from './workers.js';

export const apiDetectorMatchers = Object.freeze({
  ...windowGeometryMatchers,
  ...documentPropsMatchers,
  ...storageMatchers,
  ...canvasMatchers,
  ...prototypeMatchers,
  ...navigatorMatchers,
  ...networkMatchers,
  ...timingMatchers,
  ...workersMatchers,
  ...cryptoMatchers,
  ...domInjectionMatchers,
});

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
