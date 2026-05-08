import {describe, expect, it} from 'vitest';
import {clampWorkspaceLeftWidth} from '../../src/ui/composables/workspaceLayoutModel.js';

describe('workspaceLayoutModel', () => {
  it('clamps widths inside the allowed band', () => {
    const contentWidth = 900;
    const clamped = clampWorkspaceLeftWidth(120, contentWidth);

    expect(clamped).toBeGreaterThanOrEqual(288);
    expect(clamped).toBeLessThanOrEqual(contentWidth - 288);
  });

  it('returns the requested width unchanged when content width is missing', () => {
    expect(clampWorkspaceLeftWidth(400, 0)).toBe(400);
  });
});
