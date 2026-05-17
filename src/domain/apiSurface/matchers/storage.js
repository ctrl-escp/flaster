/**
 * Matchers for localStorage and sessionStorage accesses.
 */

import {matcher as localStorageGetItem} from './local-storage-getitem.js';
import {matcher as localStorageSetItem} from './local-storage-setitem.js';
import {matcher as localStorageRemoveItem} from './local-storage-removeitem.js';
import {matcher as localStorageClear} from './local-storage-clear.js';
import {matcher as sessionStorageGetItem} from './session-storage-getitem.js';
import {matcher as sessionStorageSetItem} from './session-storage-setitem.js';
import {matcher as sessionStorageRemoveItem} from './session-storage-removeitem.js';

export const storageMatchers = Object.freeze({
  'local-storage-getitem': localStorageGetItem,
  'local-storage-setitem': localStorageSetItem,
  'local-storage-removeitem': localStorageRemoveItem,
  'local-storage-clear': localStorageClear,
  'session-storage-getitem': sessionStorageGetItem,
  'session-storage-setitem': sessionStorageSetItem,
  'session-storage-removeitem': sessionStorageRemoveItem,
});
