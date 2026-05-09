import {describe, expect, it} from 'vitest';
import {isHelpToggleEvent, nextHelpOpenState} from '../../src/ui/composables/helpOverlayModel.js';

describe('helpOverlayModel', () => {
  describe('isHelpToggleEvent', () => {
    it('returns true for F1 with no modifiers', () => {
      expect(
        isHelpToggleEvent({
          key: 'F1',
          ctrlKey: false,
          altKey: false,
          metaKey: false,
          shiftKey: false,
        }),
      ).toBe(true);
    });

    it('returns false when ctrlKey is true', () => {
      expect(
        isHelpToggleEvent({
          key: 'F1',
          ctrlKey: true,
          altKey: false,
          metaKey: false,
          shiftKey: false,
        }),
      ).toBe(false);
    });

    it('returns false when altKey is true', () => {
      expect(
        isHelpToggleEvent({
          key: 'F1',
          ctrlKey: false,
          altKey: true,
          metaKey: false,
          shiftKey: false,
        }),
      ).toBe(false);
    });

    it('returns false when metaKey is true', () => {
      expect(
        isHelpToggleEvent({
          key: 'F1',
          ctrlKey: false,
          altKey: false,
          metaKey: true,
          shiftKey: false,
        }),
      ).toBe(false);
    });

    it('returns false when shiftKey is true', () => {
      expect(
        isHelpToggleEvent({
          key: 'F1',
          ctrlKey: false,
          altKey: false,
          metaKey: false,
          shiftKey: true,
        }),
      ).toBe(false);
    });

    it('returns false for Escape', () => {
      expect(
        isHelpToggleEvent({
          key: 'Escape',
          ctrlKey: false,
          altKey: false,
          metaKey: false,
          shiftKey: false,
        }),
      ).toBe(false);
    });

    it('returns false for F2', () => {
      expect(
        isHelpToggleEvent({
          key: 'F2',
          ctrlKey: false,
          altKey: false,
          metaKey: false,
          shiftKey: false,
        }),
      ).toBe(false);
    });
  });

  describe('nextHelpOpenState', () => {
    it('toggles false to true', () => {
      expect(nextHelpOpenState(false, 'toggle')).toBe(true);
    });

    it('toggles true to false', () => {
      expect(nextHelpOpenState(true, 'toggle')).toBe(false);
    });

    it('closes from true', () => {
      expect(nextHelpOpenState(true, 'close')).toBe(false);
    });

    it('close from false stays false', () => {
      expect(nextHelpOpenState(false, 'close')).toBe(false);
    });

    it('opens from false', () => {
      expect(nextHelpOpenState(false, 'open')).toBe(true);
    });

    it('open from true stays true', () => {
      expect(nextHelpOpenState(true, 'open')).toBe(true);
    });
  });
});
