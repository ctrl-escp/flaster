/**
 * Matchers for network request APIs (fetch, XHR, WebSocket).
 */

import {matcher as fetchCall} from './fetch-call.js';
import {matcher as xhrOpen} from './xhr-open.js';
import {matcher as websocketConstructor} from './websocket-constructor.js';

export const networkMatchers = Object.freeze({
  'fetch-call': fetchCall,
  'xhr-open': xhrOpen,
  'websocket-constructor': websocketConstructor,
});
