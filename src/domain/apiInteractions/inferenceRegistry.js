import {validateApiInferenceRegistry} from './inferenceDefinition.js';
import {apiDetectorIds} from './detectorRegistry.js';

/** @type {import('./inferenceDefinition.js').ApiInferenceRow[]} */
const _registry = [

  // ── anti-debugging ────────────────────────────────────────────────────────
  {
    id: 'devtools-size-probe',
    title: 'DevTools Size Probe',
    categoryGroup: 'behavioral-inference',
    category: 'anti-debugging',
    risk: 'benign',
    riskReason: 'Detects whether DevTools is open by measuring window dimensions. Does not collect or transmit user data.',
    inferenceKind: 'co-occurrence',
    description:
      'Script reads both inner and outer window dimensions (width or height). ' +
      'The difference between outer and inner grows when DevTools is docked, ' +
      'making this a common technique for detecting an open debugger.',
    requires: [
      {
        detectorIds: ['window-inner-width', 'window-inner-height'],
        mode: 'any',
      },
      {
        detectorIds: ['window-outer-width', 'window-outer-height'],
        mode: 'any',
      },
    ],
  },
  {
    id: 'devtools-timing-probe',
    title: 'DevTools Timing Probe',
    categoryGroup: 'behavioral-inference',
    category: 'anti-debugging',
    risk: 'benign',
    riskReason: 'Probes debugger presence via execution timing. Does not collect or transmit user data.',
    inferenceKind: 'co-occurrence',
    description:
      'Script uses high-resolution timing (performance.now or setInterval) alongside ' +
      'conditional logic that may slow down significantly when DevTools is open due to ' +
      'debugger statement evaluation overhead.',
    requires: [
      {
        detectorIds: ['performance-now', 'set-interval'],
        mode: 'any',
      },
    ],
  },
  {
    id: 'automation-detection',
    title: 'Automation / Bot Detection',
    categoryGroup: 'behavioral-inference',
    category: 'anti-debugging',
    risk: 'benign',
    riskReason: 'Identifies automated browser environments. Does not collect or transmit user data.',
    inferenceKind: 'co-occurrence',
    description:
      'Script checks navigator.webdriver (set to true by Selenium/Puppeteer/Playwright) ' +
      'alongside other environment signals. Strong indicator of bot or headless browser detection.',
    requires: [
      {
        detectorIds: ['navigator-webdriver'],
        mode: 'all',
      },
      {
        detectorIds: ['navigator-user-agent', 'navigator-platform', 'navigator-plugins'],
        mode: 'any',
      },
    ],
  },

  // ── fingerprinting ────────────────────────────────────────────────────────
  {
    id: 'canvas-fingerprinting',
    title: 'Canvas Fingerprinting',
    categoryGroup: 'behavioral-inference',
    category: 'fingerprinting',
    risk: 'risky',
    riskReason: 'Privacy: produces a persistent device identifier from GPU rendering output, enabling cross-site user tracking without consent or cookies.',
    inferenceKind: 'co-occurrence',
    description:
      'Script obtains a canvas context and then reads back pixel or data-URL output. ' +
      'Rendering differences across GPU/driver/OS combinations produce a unique fingerprint.',
    requires: [
      {
        detectorIds: ['canvas-get-context'],
        mode: 'all',
      },
      {
        detectorIds: ['canvas-to-data-url', 'canvas-get-image-data'],
        mode: 'any',
      },
    ],
  },
  {
    id: 'navigator-fingerprinting',
    title: 'Navigator Fingerprinting',
    categoryGroup: 'behavioral-inference',
    category: 'fingerprinting',
    risk: 'risky',
    riskReason: 'Privacy: combines multiple browser properties into a unique device fingerprint, enabling user identification without storing any data.',
    inferenceKind: 'frequency',
    description:
      'Script reads three or more navigator properties. Individually innocuous, but ' +
      'collectively these form a behavioural fingerprint of the browser environment.',
    requires: [
      {
        detectorIds: [
          'navigator-user-agent',
          'navigator-platform',
          'navigator-hardware-concurrency',
          'navigator-languages',
          'navigator-plugins',
        ],
        mode: 'any',
        minCount: 3,
      },
    ],
  },
  {
    id: 'screen-fingerprinting',
    title: 'Screen Geometry Fingerprinting',
    categoryGroup: 'behavioral-inference',
    category: 'fingerprinting',
    risk: 'risky',
    riskReason: 'Privacy: records display configuration as a fingerprint signal, contributing to cross-site user identification.',
    inferenceKind: 'co-occurrence',
    description:
      'Script reads multiple screen dimension properties. Combined, they describe the ' +
      'display configuration with enough precision to contribute to a device fingerprint.',
    requires: [
      {
        detectorIds: ['screen-width', 'screen-height', 'screen-avail-width', 'screen-avail-height'],
        mode: 'any',
        minCount: 2,
      },
    ],
  },

  // ── tracking ──────────────────────────────────────────────────────────────
  {
    id: 'cookie-tracking',
    title: 'Cookie-Based Tracking',
    categoryGroup: 'behavioral-inference',
    category: 'tracking',
    risk: 'risky',
    riskReason: 'Privacy: reads and writes persistent cookies, enabling user identification and behavioral tracking across sessions.',
    inferenceKind: 'co-occurrence',
    description:
      'Script both reads and writes document.cookie. Indicates persistent state is being ' +
      'stored and retrieved via cookies, a common mechanism for user tracking or session management.',
    requires: [
      { detectorIds: ['document-cookie-read'], mode: 'all' },
      { detectorIds: ['document-cookie-write'], mode: 'all' },
    ],
  },
  {
    id: 'storage-profiling',
    title: 'Storage Profiling',
    categoryGroup: 'behavioral-inference',
    category: 'tracking',
    risk: 'risky',
    riskReason: 'Privacy: reads stored user data from local or session storage, which may include sensitive profile, preference, or session information.',
    inferenceKind: 'co-occurrence',
    description:
      'Script reads from localStorage or sessionStorage. ' +
      'Indicates persistent user state is being accessed, a common mechanism for user profiling across page loads.',
    requires: [
      {
        detectorIds: ['local-storage-getitem', 'session-storage-getitem'],
        mode: 'any',
      },
    ],
  },

  // ── prototype tampering ───────────────────────────────────────────────────
  {
    id: 'prototype-injection',
    title: 'Native Prototype Injection',
    categoryGroup: 'behavioral-inference',
    category: 'prototype-tampering',
    risk: 'risky',
    riskReason: 'Security: overwrites native prototype properties, potentially intercepting all method calls on built-in types — a vector for data exfiltration hooks and anti-debugging traps.',
    inferenceKind: 'co-occurrence',
    description:
      'Script writes properties onto a native prototype (Object, Function, or Array). ' +
      'This patches built-ins globally — a hallmark of hook injection, anti-debugging traps, ' +
      'and some obfuscation frameworks.',
    requires: [
      {
        detectorIds: ['object-prototype-write', 'function-prototype-write', 'array-prototype-write'],
        mode: 'any',
      },
    ],
  },

  // ── dynamic execution ─────────────────────────────────────────────────────
  {
    id: 'dynamic-code-execution',
    title: 'Dynamic Code Execution',
    categoryGroup: 'behavioral-inference',
    category: 'dynamic-execution',
    risk: 'risky',
    riskReason: 'Security: executes code constructed at runtime, bypassing static analysis — the primary mechanism for delivering obfuscated payloads and injecting malicious logic.',
    inferenceKind: 'co-occurrence',
    description:
      'Script uses eval() or the Function constructor to execute dynamically built code. ' +
      'A primary indicator of obfuscated payloads or runtime code generation.',
    requires: [
      {
        detectorIds: ['eval-call', 'function-constructor'],
        mode: 'any',
      },
    ],
  },
  {
    id: 'remote-code-fetch-exec',
    title: 'Remote Code Fetch + Execute',
    categoryGroup: 'behavioral-inference',
    category: 'dynamic-execution',
    risk: 'risky',
    riskReason: 'Security + Privacy: fetches code or data from a remote server and executes or injects it — a classic loader pattern enabling phishing, credential theft, or malware delivery.',
    inferenceKind: 'co-occurrence',
    description:
      'Script fetches a remote resource and then evaluates code dynamically. ' +
      'High-confidence signal for a loader or dropper pattern.',
    requires: [
      {
        detectorIds: ['fetch-call', 'xhr-open'],
        mode: 'any',
      },
      {
        detectorIds: ['eval-call', 'function-constructor', 'inner-html-write', 'insert-adjacent-html'],
        mode: 'any',
      },
    ],
  },
];

validateApiInferenceRegistry(_registry, apiDetectorIds);

export const apiInferenceRegistry = Object.freeze(_registry.map(Object.freeze));
