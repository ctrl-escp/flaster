import {describe, it, expect} from 'vitest';
import {Arborist} from '../../../node_modules/flast/src/arborist.js';
import {runApiDetectors} from '../../../src/domain/apiInteractions/matchingEngine.js';
import {runInferences} from '../../../src/domain/apiInteractions/inferenceEngine.js';

function detect(script) {
  const arb = new Arborist(script);
  return runApiDetectors(arb);
}

function hits(results, id) {
  return results.get(id)?.length ?? 0;
}

function extracted(results, id, role) {
  return results.get(id)?.[0]?.extractions?.[role]?.values ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. document.cookie — write
// ─────────────────────────────────────────────────────────────────────────────

describe('document-cookie-write', () => {
  it('matches dot notation assignment', () => {
    const r = detect('document.cookie = \'session=abc; Path=/\';');
    expect(hits(r, 'document-cookie-write')).toBe(1);
    expect(extracted(r, 'document-cookie-write', 'cookie-name')).toEqual(['session']);
  });

  it('matches bracket string-literal access', () => {
    const r = detect('document[\'cookie\'] = \'session=abc\';');
    expect(hits(r, 'document-cookie-write')).toBe(1);
    expect(extracted(r, 'document-cookie-write', 'cookie-name')).toEqual(['session']);
  });

  it('matches bracket variable access', () => {
    const r = detect('var x = \'cookie\'; document[x] = \'session=abc\';');
    expect(hits(r, 'document-cookie-write')).toBe(1);
    expect(extracted(r, 'document-cookie-write', 'cookie-name')).toEqual(['session']);
  });

  it('matches via window.document', () => {
    const r = detect('window.document.cookie = \'session=abc\';');
    expect(hits(r, 'document-cookie-write')).toBe(1);
    expect(extracted(r, 'document-cookie-write', 'cookie-name')).toEqual(['session']);
  });

  it('matches when document property is a variable assigned after declaration', () => {
    const r = detect('var n; n = \'cookie\'; document[n] = \'session=abc\';');
    expect(hits(r, 'document-cookie-write')).toBe(1);
    expect(extracted(r, 'document-cookie-write', 'cookie-name')).toEqual(['session']);
  });

  it('matches when object is window[n] where n is assigned document', () => {
    const r = detect('var n; n = \'document\'; window[n][\'cookie\'] = \'session=abc\';');
    expect(hits(r, 'document-cookie-write')).toBe(1);
    expect(extracted(r, 'document-cookie-write', 'cookie-name')).toEqual(['session']);
  });

  it('matches when both object and property are variables assigned after declaration', () => {
    const r = detect('var m; m = \'document\'; var n; n = \'cookie\'; window[m][n] = \'session=abc\';');
    expect(hits(r, 'document-cookie-write')).toBe(1);
    expect(extracted(r, 'document-cookie-write', 'cookie-name')).toEqual(['session']);
  });

  it('does NOT match when document is aliased to a variable', () => {
    const r = detect('var d = document; d.cookie = \'session=abc\';');
    expect(hits(r, 'document-cookie-write')).toBe(0);
  });

  it('extracts cookie name from a var initializer', () => {
    const r = detect('var v = \'session=abc\'; document.cookie = v;');
    expect(hits(r, 'document-cookie-write')).toBe(1);
    expect(extracted(r, 'document-cookie-write', 'cookie-name')).toEqual(['session']);
  });

  it('extracts cookie name from a reassigned variable', () => {
    const r = detect('var v; v = \'token=xyz\'; document.cookie = v;');
    expect(hits(r, 'document-cookie-write')).toBe(1);
    expect(extracted(r, 'document-cookie-write', 'cookie-name')).toEqual(['token']);
  });

  it('matches but yields no cookie-name extraction when value is unknown', () => {
    const r = detect('document.cookie = someUnknownVar;');
    expect(hits(r, 'document-cookie-write')).toBe(1);
    expect(extracted(r, 'document-cookie-write', 'cookie-name')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. document.cookie — read
// ─────────────────────────────────────────────────────────────────────────────

describe('document-cookie-read', () => {
  it('matches dot notation read', () => {
    const r = detect('var c = document.cookie;');
    expect(hits(r, 'document-cookie-read')).toBe(1);
  });

  it('matches bracket string-literal read', () => {
    const r = detect('var c = document[\'cookie\'];');
    expect(hits(r, 'document-cookie-read')).toBe(1);
  });

  it('matches bracket variable read', () => {
    const r = detect('var x = \'cookie\'; var c = document[x];');
    expect(hits(r, 'document-cookie-read')).toBe(1);
  });

  it('matches via window.document', () => {
    const r = detect('var c = window.document.cookie;');
    expect(hits(r, 'document-cookie-read')).toBe(1);
  });

  it('matches via iframe contentDocument', () => {
    const r = detect('var c = iframeEl.contentDocument.cookie;');
    expect(hits(r, 'document-cookie-read')).toBe(1);
  });

  it('write produces 0 read matches and 1 write match — dot notation', () => {
    const r = detect('document.cookie = \'k=v\';');
    expect(hits(r, 'document-cookie-read')).toBe(0);
    expect(hits(r, 'document-cookie-write')).toBe(1);
  });

  it('write produces 0 read matches and 1 write match — bracket notation', () => {
    const r = detect('document[\'cookie\'] = \'k=v\';');
    expect(hits(r, 'document-cookie-read')).toBe(0);
    expect(hits(r, 'document-cookie-write')).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Storage — localStorage and sessionStorage
// ─────────────────────────────────────────────────────────────────────────────

describe('storage detectors', () => {
  describe('local-storage-setitem', () => {
    it('matches setItem and extracts key', () => {
      const r = detect('localStorage.setItem(\'user\', \'ben\');');
      expect(hits(r, 'local-storage-setitem')).toBe(1);
      expect(extracted(r, 'local-storage-setitem', 'key')).toEqual(['user']);
    });
  });

  describe('local-storage-getitem', () => {
    it('matches getItem and extracts key from string literal', () => {
      const r = detect('localStorage.getItem(\'user\');');
      expect(hits(r, 'local-storage-getitem')).toBe(1);
      expect(extracted(r, 'local-storage-getitem', 'key')).toEqual(['user']);
    });

    it('extracts key from a var initializer', () => {
      const r = detect('var k = \'prefs\'; localStorage.getItem(k);');
      expect(extracted(r, 'local-storage-getitem', 'key')).toEqual(['prefs']);
    });

    it('extracts key from a reassigned variable', () => {
      const r = detect('var k; k = \'cart\'; localStorage.getItem(k);');
      expect(extracted(r, 'local-storage-getitem', 'key')).toEqual(['cart']);
    });

    it('matches but yields no key extraction when key is unknown', () => {
      const r = detect('localStorage.getItem(someUnknownKey);');
      expect(hits(r, 'local-storage-getitem')).toBe(1);
      expect(extracted(r, 'local-storage-getitem', 'key')).toEqual([]);
    });
  });

  describe('session-storage-setitem', () => {
    it('matches sessionStorage.setItem', () => {
      const r = detect('sessionStorage.setItem(\'session\', \'1\');');
      expect(hits(r, 'session-storage-setitem')).toBe(1);
      expect(extracted(r, 'session-storage-setitem', 'key')).toEqual(['session']);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Window geometry
// ─────────────────────────────────────────────────────────────────────────────

describe('window geometry detectors', () => {
  it('matches window.innerWidth via dot notation', () => {
    const r = detect('window.innerWidth;');
    expect(hits(r, 'window-inner-width')).toBe(1);
  });

  it('matches window.innerWidth via bracket string literal', () => {
    const r = detect('window[\'innerWidth\'];');
    expect(hits(r, 'window-inner-width')).toBe(1);
  });

  it('matches window.innerWidth via bracket variable', () => {
    const r = detect('var p = \'innerWidth\'; window[p];');
    expect(hits(r, 'window-inner-width')).toBe(1);
  });

  it('matches screen.width', () => {
    const r = detect('screen.width;');
    expect(hits(r, 'screen-width')).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Canvas
// ─────────────────────────────────────────────────────────────────────────────

describe('canvas detectors', () => {
  it('matches getContext and extracts context-type 2d', () => {
    const r = detect('canvas.getContext(\'2d\');');
    expect(hits(r, 'canvas-get-context')).toBe(1);
    expect(extracted(r, 'canvas-get-context', 'context-type')).toEqual(['2d']);
  });

  it('matches getContext and extracts context-type webgl', () => {
    const r = detect('canvas.getContext(\'webgl\');');
    expect(hits(r, 'canvas-get-context')).toBe(1);
    expect(extracted(r, 'canvas-get-context', 'context-type')).toEqual(['webgl']);
  });

  it('matches toDataURL', () => {
    const r = detect('canvas.toDataURL();');
    expect(hits(r, 'canvas-to-data-url')).toBe(1);
  });

  it('matches getImageData', () => {
    const r = detect('canvas.getImageData(0,0,1,1);');
    expect(hits(r, 'canvas-get-image-data')).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Inference engine
// ─────────────────────────────────────────────────────────────────────────────

describe('inferences', () => {
  function infers(results, id) {
    return runInferences(results).some(i => i.id === id);
  }

  describe('devtools-size-probe', () => {
    it('fires when innerWidth and outerWidth are both present', () => {
      const r = detect('window.innerWidth; window.outerWidth;');
      expect(infers(r, 'devtools-size-probe')).toBe(true);
    });

    it('fires when innerHeight and outerHeight are both present', () => {
      const r = detect('window.innerHeight; window.outerHeight;');
      expect(infers(r, 'devtools-size-probe')).toBe(true);
    });

    it('does NOT fire on innerWidth alone', () => {
      const r = detect('window.innerWidth;');
      expect(infers(r, 'devtools-size-probe')).toBe(false);
    });
  });

  describe('canvas-fingerprinting', () => {
    it('fires on getContext + toDataURL', () => {
      const r = detect('canvas.getContext(\'2d\'); canvas.toDataURL();');
      expect(infers(r, 'canvas-fingerprinting')).toBe(true);
    });

    it('fires on getContext + getImageData', () => {
      const r = detect('canvas.getContext(\'2d\'); canvas.getImageData(0,0,1,1);');
      expect(infers(r, 'canvas-fingerprinting')).toBe(true);
    });

    it('does NOT fire on getContext alone', () => {
      const r = detect('canvas.getContext(\'2d\');');
      expect(infers(r, 'canvas-fingerprinting')).toBe(false);
    });
  });

  describe('cookie-tracking', () => {
    it('fires when both read and write are present', () => {
      const r = detect('var c = document.cookie; document.cookie = \'k=v\';');
      expect(infers(r, 'cookie-tracking')).toBe(true);
    });

    it('does NOT fire on read alone', () => {
      const r = detect('var c = document.cookie;');
      expect(infers(r, 'cookie-tracking')).toBe(false);
    });

    it('does NOT fire on write alone', () => {
      const r = detect('document.cookie = \'k=v\';');
      expect(infers(r, 'cookie-tracking')).toBe(false);
    });
  });

  describe('storage-profiling', () => {
    it('fires when both localStorage and sessionStorage are read', () => {
      const r = detect('localStorage.getItem(\'a\'); sessionStorage.getItem(\'b\');');
      expect(infers(r, 'storage-profiling')).toBe(true);
    });

    it('fires on localStorage read alone', () => {
      const r = detect('localStorage.getItem(\'a\');');
      expect(infers(r, 'storage-profiling')).toBe(true);
    });

    it('fires on sessionStorage read alone', () => {
      const r = detect('sessionStorage.getItem(\'a\');');
      expect(infers(r, 'storage-profiling')).toBe(true);
    });
  });

  describe('navigator-fingerprinting', () => {
    it('fires when 3 distinct navigator properties are accessed', () => {
      const r = detect('navigator.userAgent; navigator.platform; navigator.languages;');
      expect(infers(r, 'navigator-fingerprinting')).toBe(true);
    });

    it('does NOT fire on 2 distinct navigator properties', () => {
      const r = detect('navigator.userAgent; navigator.platform;');
      expect(infers(r, 'navigator-fingerprinting')).toBe(false);
    });

    it('does NOT fire when the same property is read multiple times', () => {
      const r = detect('navigator.userAgent; navigator.userAgent; navigator.userAgent;');
      expect(infers(r, 'navigator-fingerprinting')).toBe(false);
    });
  });
});
