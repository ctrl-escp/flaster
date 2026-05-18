/**
 * Serializes the enriched report envelope to a JSON string.
 * The _store internal field is never included.
 *
 * @param {object} envelope  report envelope (without _store)
 * @returns {string}
 */
export function formatReportJson(envelope) {
  return JSON.stringify(envelope, null, 2);
}
