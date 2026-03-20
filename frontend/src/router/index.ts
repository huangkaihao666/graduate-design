import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/store/auth';

// 扩展 Vue Router 的 RouteMeta 类型
declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    layout?: 'default' | 'full' | 'none';
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
    hideHeader?: boolean;
    hideSidebar?: boolean;
  }
}

// 视图组件 - 公开页面
import Home from '../views/home/Home.vue';
import Login from '../views/auth/Login.vue';
import About from '../views/system/About.vue';
import NotFound from '../views/system/NotFound.vue';

// AI 模块
import Dashboard from '../views/home/Dashboard.vue';
import VirtualTryOn from '../views/ai/VirtualTryOn.vue';
import StyleRecommendation from '../views/ai/StyleRecommendation.vue';
import ItineraryPlanning from '../views/plan/ItineraryPlanning.vue';

// 预约模块 (延迟加载)
const Packages = () => import('../views/booking/Packages.vue');
const Order = () => import('../views/booking/Order.vue');

// 用户中心 (延迟加载)
const UserProfile = () => import('../views/user/Profile.vue');
const UserOrders = () => import('../views/user/Orders.vue');
const UserFavorites = () => import('../views/user/Favorites.vue');
const UserAIHistory = () => import('../views/user/AIHistory.vue');

// 后台管理 (延迟加载)
const AdminDashboard = () => import('../views/admin/Dashboard.vue');
const AdminSpots = () => import('../views/admin/content/Spots.vue');
const AdminPackages = () => import('../views/admin/content/Packages.vue');
const AdminStyles = () => import('../views/admin/content/Styles.vue');
const AdminOrders = () => import('../views/admin/Orders.vue');
const AdminUsers = () => import('../views/admin/Users.vue');

// 路由配置
const routes: RouteRecordRaw[] = [
  // 公开页面
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: '首页',
      layout: 'none',
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: '登录/注册',
      layout: 'none',
    },
  },
  {
    path: '/about',
    name: 'About',
    component: About,
    meta: {
      title: '关于',
      layout: 'none',
    },
  },

  // 用户控制台
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      title: '控制台',
      requiresAuth: true,
      layout: 'default',
    },
  },

  // AI 功能模块
  {
    path: '/ai',
    meta: {
      requiresAuth: true,
      layout: 'default',
    },
    children: [
      {
        path: 'virtual-try-on',
        name: 'VirtualTryOn',
        component: VirtualTryOn,
        meta: {
          title: 'AI 虚拍',
        },
      },
      {
        path: 'style-recommendation',
        name: 'StyleRecommendation',
        component: StyleRecommendation,
        meta: {
          title: '风格推荐',
        },
      },
      {
        path: 'itinerary-planning',
        name: 'ItineraryPlanning',
        component: ItineraryPlanning,
        meta: {
          title: '行程规划',
        },
      },
    ],
  },

  // 预约模块
  {
    path: '/booking',
    meta: {
      layout: 'none',
    },
    children: [
      {
        path: 'packages',
        name: 'Packages',
        component: Packages,
        meta: {
          title: '旅拍套餐',
          layout: 'none',
        },
      },
      {
        path: 'order',
        name: 'Order',
        component: Order,
        meta: {
          title: '在线预约',
          requiresAuth: true,
          layout: 'default',
        },
      },
    ],
  },

  // 用户中心
  {
    path: '/user',
    meta: {
      requiresAuth: true,
      layout: 'default',
    },
    children: [
      {
        path: 'profile',
        name: 'UserProfile',
        component: UserProfile,
        meta: {
          title: '个人资料',
        },
      },
      {
        path: 'orders',
        name: 'UserOrders',
        component: UserOrders,
        meta: {
          title: '订单管理',
        },
      },
      {
        path: 'favorites',
        name: 'UserFavorites',
        component: UserFavorites,
        meta: {
          title: '我的收藏',
        },
      },
      {
        path: 'ai-history',
        name: 'UserAIHistory',
        component: UserAIHistory,
        meta: {
          title: 'AI 生成历史',
        },
      },
    ],
  },

  // 后台管理（管理员只）
  {
    path: '/admin',
    redirect: '/admin/dashboard',
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      layout: 'default',
    },
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: AdminDashboard,
        meta: {
          title: '数据看板',
        },
      },
      {
        path: 'content/spots',
        name: 'AdminSpots',
        component: AdminSpots,
        meta: {
          title: '景点管理',
        },
      },
      {
        path: 'content/packages',
        name: 'AdminPackages',
        component: AdminPackages,
        meta: {
          title: '套餐管理',
        },
      },
      {
        path: 'content/styles',
        name: 'AdminStyles',
        component: AdminStyles,
        meta: {
          title: '风格标签管理',
        },
      },
      {
        path: 'orders',
        name: 'AdminOrders',
        component: AdminOrders,
        meta: {
          title: '订单管理',
        },
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: AdminUsers,
        meta: {
          title: '用户管理',
        },
      },
    ],
  },

  // 错误页面（必须放在最后）
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: {
      title: '404 - 页面不存在',
      layout: 'none',
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

  // 检查管理员权限
  if (to.meta?.requiresAdmin) {
    if (!authStore.isAdmin) {
      next({ name: 'Dashboard' });
      return;
    }
  }

  // 如果已登录用户访问登录页，重定向到控制台
  if (to.name === 'Login' && authStore.isAuthenticated) {
    next(authStore.isAdmin ? { name: 'AdminDashboard' } : { name: 'Dashboard' });
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
