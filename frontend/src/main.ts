import { createApp } from 'vue';
import App from './App.vue';
import pinia from './store';
import router from './router';
import './assets/styles/global.less';

const app = createApp(App);

app.use(pinia);
app.use(router);
app.mount('#app');
