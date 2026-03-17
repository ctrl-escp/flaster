import './assets/main.css';

import {createApp} from 'vue';
import * as flast from 'flast/src/index.js';
import App from './App.vue';
import {version} from 'flast/package.json' assert {type: 'json'};
import restringerBrowser from './integrations/restringer/index.js';

window.flast = {...flast, version};
window.restringer = restringerBrowser;
createApp(App).mount('#app');
window.selectedNode = null;
