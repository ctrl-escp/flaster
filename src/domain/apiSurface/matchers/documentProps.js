/**
 * Matchers for document property accesses (cookie, domain, referrer, readyState).
 */

import {matcher as documentCookieRead} from './document-cookie-read.js';
import {matcher as documentCookieWrite} from './document-cookie-write.js';
import {matcher as documentDomain} from './document-domain.js';
import {matcher as documentReferrer} from './document-referrer.js';
import {matcher as documentReadyState} from './document-ready-state.js';

export const documentPropsMatchers = Object.freeze({
  'document-cookie-read': documentCookieRead,
  'document-cookie-write': documentCookieWrite,
  'document-domain': documentDomain,
  'document-referrer': documentReferrer,
  'document-ready-state': documentReadyState,
});
