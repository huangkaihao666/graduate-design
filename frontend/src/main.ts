import { createApp } from 'vue';
import App from './App.vue';
import pinia from './store';
import router from './router';
import antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import './assets/styles/global.less';

const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(antd);
app.mount('#app');
