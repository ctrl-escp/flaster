/**
 * Matchers for dynamic DOM and code injection APIs.
 */

import {matcher as innerHtmlWrite} from './inner-html-write.js';
import {matcher as insertAdjacentHtml} from './insert-adjacent-html.js';
import {matcher as evalCall} from './eval-call.js';
import {matcher as functionConstructor} from './function-constructor.js';

export const domInjectionMatchers = Object.freeze({
  'inner-html-write': innerHtmlWrite,
  'insert-adjacent-html': insertAdjacentHtml,
  'eval-call': evalCall,
  'function-constructor': functionConstructor,
});
