import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/store/auth';

// 视图组件
import Home from '../views/home/Home.vue';
import Dashboard from '../views/home/Dashboard.vue';
import About from '../views/system/About.vue';
import Login from '../views/auth/Login.vue';
import NotFound from '../views/system/NotFound.vue';
import VirtualTryOn from '../views/ai/VirtualTryOn.vue';
import StyleRecommendation from '../views/ai/StyleRecommendation.vue';
import ItineraryPlanning from '../views/plan/ItineraryPlanning.vue';

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
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      title: '控制台',
      requiresAuth: true,
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: '登录/注册',
      description: '用户登录与注册',
    },
  },
  {
    path: '/ai/virtual-try-on',
    name: 'VirtualTryOn',
    component: VirtualTryOn,
    meta: {
      title: 'AI 虚拟试拍',
      requiresAuth: true,
    },
  },
  {
    path: '/ai/style-recommendation',
    name: 'StyleRecommendation',
    component: StyleRecommendation,
    meta: {
      title: '智能风格推荐',
      requiresAuth: true,
    },
  },
  {
    path: '/plan/itinerary-planning',
    name: 'ItineraryPlanning',
    component: ItineraryPlanning,
    meta: {
      title: '智能行程规划',
      requiresAuth: true,
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
router.beforeEach((to, from, next) => {
  // 更新页面标题
  const title = (to.meta?.title as string) ? `${to.meta.title} - 旅拍智享` : '旅拍智享';
  document.title = title;

  const authStore = useAuthStore();

  // 检查路由是否需要认证
  if (to.meta?.requiresAuth) {
    if (!authStore.isAuthenticated) {
      // 未登录，重定向到登录页
      next({ name: 'Login', query: { redirect: to.fullPath } });
      return;
    }
  }

  // 如果已登录用户访问登录页，重定向到控制台
  if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'Dashboard' });
    return;
  }

  next();
});

// 路由加载后
router.afterEach((to) => {
  // 可以在这里添加页面加载完成后的逻辑
  console.log(`Navigated to ${to.path}`);
});

export default router;
