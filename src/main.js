import './assets/main.css';

import {createApp} from 'vue';
import * as flast from 'flast/src/index.js';
import flastPackage from 'flast/package.json' with {type: 'json'};
import App from './App.vue';
import restringerBrowser from './integrations/restringer/index.js';

window.flast = {...flast, version: flastPackage.version};
window.restringer = restringerBrowser;
createApp(App).mount('#app');
window.selectedNode = null;
