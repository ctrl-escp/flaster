/**
 * Returns true when the given KeyboardEvent should open/close the overlay.
 * Isolated here so tests never need a real DOM event.
 *
 * @param {{
 *   key: string;
 *   ctrlKey?: boolean;
 *   altKey?: boolean;
 *   metaKey?: boolean;
 *   shiftKey?: boolean;
 * }} event
 * @returns {boolean}
 */
export function isHelpToggleEvent(event) {
  return (
    event.key === 'F1' &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.shiftKey
  );
}

/**
 * Computes the next open state given the current state and a close/toggle signal.
 *
 * @param {boolean} current
 * @param {'toggle' | 'open' | 'close'} action
 * @returns {boolean}
 */
export function nextHelpOpenState(current, action) {
  switch (action) {
    case 'toggle':
      return !current;
    case 'close':
      return false;
    case 'open':
      return true;
    default:
      return current;
  }
}
