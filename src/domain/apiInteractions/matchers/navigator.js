/**
 * Matchers for navigator property accesses.
 *
 * All detectors here target MemberExpression nodes pre-filtered by the engine.
 * Every property in this file is a read — none have write variants.
 *
 * navigator properties are commonly accessed for:
 *   - Browser / OS fingerprinting (userAgent, platform, hardwareConcurrency, languages, plugins)
 *   - Automation / bot detection (webdriver)
 *   - Locale detection (language, languages)
 *
 * No value extraction is performed: these are runtime strings or objects whose
 * static values are never known at analysis time.
 */

/**
 * Returns a match when a MemberExpression reads `navigator.<propertyName>`.
 *
 * @param {import('flast/src/types.js').ASTNode} node
 * @param {string} propertyName
 * @returns {{ node: import('flast/src/types.js').ASTNode, extractedValue: null } | null}
 */
function matchNavigatorProp(node, propertyName) {
  if (node.object?.name !== 'navigator' || node.property?.name !== propertyName) return null;
  return {node, extractedValue: null};
}

export const navigatorMatchers = {
  /**
   * Reads the browser's user-agent string.
   * Historically used for browser sniffing; now mainly used in bot detection and
   * fingerprinting. Should be compared with navigator.platform and other signals.
   */
  'navigator-user-agent'(node) {
    return matchNavigatorProp(node, 'userAgent');
  },

  /**
   * Reads the operating system / CPU platform string (e.g. 'Win32', 'MacIntel').
   * Deprecated in favour of navigator.userAgentData but still widely used in
   * fingerprinting scripts.
   */
  'navigator-platform'(node) {
    return matchNavigatorProp(node, 'platform');
  },

  /**
   * Reads the number of logical CPU cores available to the browser.
   * A low-entropy fingerprinting signal; the value is capped by browsers to limit
   * cross-site tracking but still contributes to a fingerprint bucket.
   */
  'navigator-hardware-concurrency'(node) {
    return matchNavigatorProp(node, 'hardwareConcurrency');
  },

  /**
   * Reads the ordered list of the user's preferred languages (e.g. ['en-US', 'en']).
   * Used for locale detection and as a fingerprinting signal.
   */
  'navigator-languages'(node) {
    return matchNavigatorProp(node, 'languages');
  },

  /**
   * Reads the list of installed browser plugins.
   * Returns an empty PluginArray in modern headless environments, making a non-empty
   * list a signal that the browser is not a bot. Historically used in fingerprinting.
   */
  'navigator-plugins'(node) {
    return matchNavigatorProp(node, 'plugins');
  },

  /**
   * Reads navigator.webdriver — set to true by WebDriver-controlled browsers
   * (Selenium, Puppeteer, Playwright). A direct bot/automation detection signal.
   * Scripts checking this property are explicitly looking for automated environments.
   */
  'navigator-webdriver'(node) {
    return matchNavigatorProp(node, 'webdriver');
  },
};
