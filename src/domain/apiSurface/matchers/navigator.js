/**
 * Matchers for navigator property accesses (fingerprinting, automation detection).
 */

import {matcher as navigatorUserAgent} from './navigator-user-agent.js';
import {matcher as navigatorPlatform} from './navigator-platform.js';
import {matcher as navigatorHardwareConcurrency} from './navigator-hardware-concurrency.js';
import {matcher as navigatorLanguages} from './navigator-languages.js';
import {matcher as navigatorPlugins} from './navigator-plugins.js';
import {matcher as navigatorWebdriver} from './navigator-webdriver.js';

export const navigatorMatchers = Object.freeze({
  'navigator-user-agent': navigatorUserAgent,
  'navigator-platform': navigatorPlatform,
  'navigator-hardware-concurrency': navigatorHardwareConcurrency,
  'navigator-languages': navigatorLanguages,
  'navigator-plugins': navigatorPlugins,
  'navigator-webdriver': navigatorWebdriver,
});
