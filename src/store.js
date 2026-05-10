import {createAppStore} from './app/createAppStore.js';

const store = createAppStore(undefined, {skipPersistence: typeof globalThis.indexedDB === 'undefined'});

export default store;
