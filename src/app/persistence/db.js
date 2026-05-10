import {openDB} from 'idb';

const DB_NAME = 'flaster-workspace';
const DB_VERSION = 1;

export const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('workspace')) {
      db.createObjectStore('workspace', {keyPath: 'id'});
    }
  },
});

export async function clearDatabase() {
  const db = await dbPromise;
  await db.clear('workspace');
}
