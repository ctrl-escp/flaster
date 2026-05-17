/**
 * Matchers for native prototype property assignments.
 */

import {matcher as objectPrototypeWrite} from './object-prototype-write.js';
import {matcher as functionPrototypeWrite} from './function-prototype-write.js';
import {matcher as arrayPrototypeWrite} from './array-prototype-write.js';

export const prototypeMatchers = Object.freeze({
  'object-prototype-write': objectPrototypeWrite,
  'function-prototype-write': functionPrototypeWrite,
  'array-prototype-write': arrayPrototypeWrite,
});
