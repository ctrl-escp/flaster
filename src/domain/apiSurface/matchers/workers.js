/**
 * Matchers for Web Worker APIs.
 */

import {matcher as workerConstructor} from './worker-constructor.js';
import {matcher as sharedWorkerConstructor} from './shared-worker-constructor.js';
import {matcher as serviceWorkerRegister} from './service-worker-register.js';

export const workersMatchers = Object.freeze({
  'worker-constructor': workerConstructor,
  'shared-worker-constructor': sharedWorkerConstructor,
  'service-worker-register': serviceWorkerRegister,
});
