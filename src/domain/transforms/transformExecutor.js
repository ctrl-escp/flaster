/**
 * Built-in (known-structure) transform execution against a live Arborist.
 *
 * @typedef {object} TransformResult
 * @property {boolean} isDone
 * @property {number} changesCount
 * @property {string} source
 * @property {string | null} structureName
 * @property {string} transformName
 * @property {Error | null} error
 */

import {runKnownStructureTransformSession} from '../../integrations/restringer/index.js';

/**
 * Runs a safe known-structure transform session and applies pending edits when present.
 *
 * @param {import('flast/src/arborist.js').Arborist} arborist
 * @param {string} structureId
 * @returns {TransformResult}
 */
export function executeKnownStructureTransformApply(arborist, structureId) {
  const sourceBefore = typeof arborist?.script === 'string' ? arborist.script : '';

  let session;
  try {
    session = runKnownStructureTransformSession(arborist, structureId);
  } catch (error) {
    return {
      isDone: false,
      changesCount: 0,
      source: sourceBefore,
      structureName: structureId,
      transformName: '',
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  const structureName = session.structureId ?? structureId;
  const transformName = session.transformName ?? '';

  if (session.error) {
    return {
      isDone: false,
      changesCount: 0,
      source: typeof arborist?.script === 'string' ? arborist.script : sourceBefore,
      structureName,
      transformName,
      error: session.error,
    };
  }

  const pending = session.pendingChanges ?? 0;
  const targetedMatchCount = session.targetedMatchCount ?? 0;
  if (pending < 1) {
    return {
      isDone: true,
      changesCount: 0,
      source: typeof arborist?.script === 'string' ? arborist.script : sourceBefore,
      structureName,
      transformName,
      error: null,
      targetedMatchCount,
    };
  }

  const applied = arborist.applyChanges();
  return {
    isDone: true,
    changesCount: applied,
    source: typeof arborist?.script === 'string' ? arborist.script : sourceBefore,
    structureName,
    transformName,
    error: null,
    targetedMatchCount,
  };
}
