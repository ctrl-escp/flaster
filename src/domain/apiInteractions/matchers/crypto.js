/**
 * Matchers for the Web Crypto API.
 */

import {matcher as cryptoGetRandomValues} from './crypto-get-random-values.js';
import {matcher as cryptoSubtleEncrypt} from './crypto-subtle-encrypt.js';
import {matcher as cryptoSubtleDigest} from './crypto-subtle-digest.js';

export const cryptoMatchers = Object.freeze({
  'crypto-get-random-values': cryptoGetRandomValues,
  'crypto-subtle-encrypt': cryptoSubtleEncrypt,
  'crypto-subtle-digest': cryptoSubtleDigest,
});
