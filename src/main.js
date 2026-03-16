import './assets/main.css';

import {createApp} from 'vue';
import * as flast from 'flast/src/index.js';
import App from './App.vue';

window.flast = flast;
createApp(App).mount('#app');
window.selectedNode = null;
