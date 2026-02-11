import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

// 视图组件
import Home from '../views/Home.vue';
import About from '../views/About.vue';
import NotFound from '../views/NotFound.vue';

// 路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: '首页',
      description: '项目首页',
    },
  },
  {
    path: '/about',
    name: 'About',
    component: About,
    meta: {
      title: '关于',
      description: '关于项目',
    },
  },
  // 捕获所有未匹配的路由，必须放在最后
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: {
      title: '404 - 页面不存在',
    },
  },
];

// 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// 路由守卫
router.beforeEach((to, _from, next) => {
  // 更新页面标题
  const title = (to.meta?.title as string) ? `${to.meta.title} - Vue3 App` : 'Vue3 App';
  document.title = title;

  // 可以在这里添加权限检查等逻辑
  if (to.meta?.requiresAuth) {
    // 示例：检查用户是否已登录
    // const userStore = useUserStore()
    // if (!userStore.isLoggedIn) {
    //   next('/login')
    //   return
    // }
  }

  next();
});

// 路由加载后
router.afterEach((to) => {
  // 可以在这里添加页面加载完成后的逻辑
  console.log(`Navigated to ${to.path}`);
});

export default router;
