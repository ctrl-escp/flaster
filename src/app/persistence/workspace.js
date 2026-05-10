import {dbPromise} from './db.js';

const WORKSPACE_ID = 'current';

/**
 * @typedef {{
 *   id: string,
 *   appVersion: string,
 *   script: string,
 *   currentScriptKind: string,
 *   currentScriptLabel: string,
 *   currentScriptBaseline: string,
 *   editorContent: string,
 *   editorSelectionAnchor: number,
 *   editorSelectionHead: number,
 *   editorScrollTop: number,
 *   editorScrollLeft: number,
 *   steps: unknown[],
 *   filters: unknown[],
 *   transformationCode: string,
 *   undoStates: unknown[],
 *   customStructures: {id: string, title: string, filterSrc: string, category: string}[],
 *   selectedKnownStructureIds: string[],
 *   savedAt: string,
 * }} WorkspaceSnapshot
 */

/**
 * @param {Omit<WorkspaceSnapshot, 'id' | 'savedAt'>} data
 */
export async function saveWorkspace(data) {
  const db = await dbPromise;
  await db.put('workspace', {id: WORKSPACE_ID, ...data, savedAt: new Date().toISOString()});
}

/**
 * @returns {Promise<WorkspaceSnapshot | undefined>}
 */
export async function loadWorkspace() {
  const db = await dbPromise;
  return db.get('workspace', WORKSPACE_ID);
}
