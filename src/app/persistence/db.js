import {openDB} from 'idb';

const DB_NAME = 'flaster-workspace';
const DB_VERSION = 1;

let openedDatabasePromise = null;

function openWorkspaceDatabase() {
  if (!openedDatabasePromise) {
    openedDatabasePromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('workspace')) {
          db.createObjectStore('workspace', {keyPath: 'id'});
        }
      },
    });
  }
  return openedDatabasePromise;
}

export const dbPromise = {
  then(resolve, reject) {
    return openWorkspaceDatabase().then(resolve, reject);
  },
};

export async function clearDatabase() {
  const db = await dbPromise;
  await db.clear('workspace');
}
