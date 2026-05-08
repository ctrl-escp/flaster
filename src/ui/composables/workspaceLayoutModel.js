/**
 * Mirrors `App.vue` resize constraints: content width is container minus handle and padding.
 *
 * @param {number} width
 * @param {number} contentWidth
 * @param {{
 *   minLeftWidth?: number;
 *   minRightWidth?: number;
 *   minPanelRatio?: number;
 *   maxPanelRatio?: number;
 * }} [constraints]
 */
export function clampWorkspaceLeftWidth(width, contentWidth, constraints = {}) {
  const {
    minLeftWidth = 288,
    minRightWidth = 288,
    minPanelRatio = 1 / 3,
    maxPanelRatio = 2 / 3,
  } = constraints;

  if (contentWidth <= 0) {
    return width;
  }

  const minWidth = Math.max(minLeftWidth, contentWidth * minPanelRatio);
  const maxWidth = Math.min(contentWidth - minRightWidth, contentWidth * maxPanelRatio);

  return Math.min(Math.max(width, minWidth), Math.max(minWidth, maxWidth));
}
