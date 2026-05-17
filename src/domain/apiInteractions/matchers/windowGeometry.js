/**
 * Matchers for window and screen geometry properties.
 *
 * All detectors here target MemberExpression nodes pre-filtered by the engine.
 * Implementations live in per-detector files; this module groups them for navigation.
 */

import {matcher as windowInnerWidth} from './window-inner-width.js';
import {matcher as windowOuterWidth} from './window-outer-width.js';
import {matcher as windowInnerHeight} from './window-inner-height.js';
import {matcher as windowOuterHeight} from './window-outer-height.js';
import {matcher as screenWidth} from './screen-width.js';
import {matcher as screenHeight} from './screen-height.js';
import {matcher as screenAvailWidth} from './screen-avail-width.js';
import {matcher as screenAvailHeight} from './screen-avail-height.js';

export const windowGeometryMatchers = Object.freeze({
  'window-inner-width': windowInnerWidth,
  'window-outer-width': windowOuterWidth,
  'window-inner-height': windowInnerHeight,
  'window-outer-height': windowOuterHeight,
  'screen-width': screenWidth,
  'screen-height': screenHeight,
  'screen-avail-width': screenAvailWidth,
  'screen-avail-height': screenAvailHeight,
});
