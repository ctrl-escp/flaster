import './assets/main.css';

import {createApp} from 'vue';
import App from './App.vue';
import {installDebugGlobals} from './app/debugGlobals.js';

void installDebugGlobals();
createApp(App).mount('#app');
