/**
 * Matchers for timing APIs (setTimeout, setInterval, performance.now).
 */

import {matcher as setTimeout_} from './set-timeout.js';
import {matcher as setInterval_} from './set-interval.js';
import {matcher as performanceNow} from './performance-now.js';

export const timingMatchers = Object.freeze({
  'set-timeout': setTimeout_,
  'set-interval': setInterval_,
  'performance-now': performanceNow,
});
