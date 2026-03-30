import { useAuthStore } from '@/store/auth';
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

// 扩展 Vue Router 的 RouteMeta 类型
declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    layout?: 'default' | 'full' | 'none';
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
    requiresWorker?: boolean;
    hideHeader?: boolean;
    hideSidebar?: boolean;
  }
}

// 视图组件 - 公开页面
import Login from '../views/auth/Login.vue';
import Home from '../views/home/Home.vue';
import About from '../views/system/About.vue';
import NotFound from '../views/system/NotFound.vue';

// AI 模块
import StyleRecommendation from '../views/ai/StyleRecommendation.vue';
import VirtualTryOn from '../views/ai/VirtualTryOn.vue';
import HelpCenter from '../views/help/HelpCenter.vue';
import Dashboard from '../views/home/Dashboard.vue';
import ItineraryPlanning from '../views/plan/ItineraryPlanning.vue';

// 工作人员端
const WorkerShell = () => import('../views/worker/WorkerShell.vue');
const WorkerDashboard = () => import('../views/worker/pages/Dashboard.vue');
const WorkerOrders = () => import('../views/worker/pages/Orders.vue');
const WorkerSchedule = () => import('../views/worker/pages/Schedule.vue');
const WorkerPortfolio = () => import('../views/worker/pages/Portfolio.vue');
const WorkerMessages = () => import('../views/worker/pages/Messages.vue');
const WorkerProfile = () => import('../views/worker/pages/Profile.vue');
const WorkerCustomMarket = () => import('../views/worker/pages/CustomMarket.vue');
const WorkerMakeupAI = () => import('../views/worker/pages/MakeupAI.vue');

// 预约模块 (延迟加载)
const Packages = () => import('../views/booking/Packages.vue');
const Order = () => import('../views/booking/Order.vue');
const Photographers = () => import('../views/booking/Photographers.vue');

// 用户中心 (延迟加载)
const UserProfile = () => import('../views/user/Profile.vue');
const UserOrders = () => import('../views/user/Orders.vue');
const UserFavorites = () => import('../views/user/Favorites.vue');
const UserAIHistory = () => import('../views/user/AIHistory.vue');
const UserChat = () => import('../views/user/Chat.vue');
const UserCustomShootRequests = () => import('../views/user/CustomShootRequests.vue');

// 后台管理 (延迟加载)
const AdminDashboard = () => import('../views/admin/Dashboard.vue');
const AdminSpots = () => import('../views/admin/content/Spots.vue');
const AdminPackages = () => import('../views/admin/content/Packages.vue');
const AdminStyles = () => import('../views/admin/content/Styles.vue');
const AdminPhotographers = () => import('../views/admin/content/Photographers.vue');
const AdminMakeupArtists = () => import('../views/admin/content/MakeupArtists.vue');
const AdminOrders = () => import('../views/admin/Orders.vue');
const AdminUsers = () => import('../views/admin/Users.vue');
const AdminInsights = () => import('../views/admin/Insights.vue');

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
  {
    path: '/help-center',
    name: 'HelpCenter',
    component: HelpCenter,
    meta: {
      title: '帮助中心',
      layout: 'default',
    },
  },
  {
    path: '/payment/scan',
    name: 'PaymentScan',
    component: () => import('../views/payment/PaymentScan.vue'),
    meta: {
      title: '支付确认',
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
      layout: 'full',
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
      layout: 'default',
    },
    children: [
      {
        path: 'packages',
        name: 'Packages',
        component: Packages,
        meta: {
          title: '旅拍套餐',
          layout: 'full',
        },
      },
      {
        path: 'photographers',
        name: 'Photographers',
        component: Photographers,
        meta: {
          title: '本店摄影师',
          layout: 'default',
        },
      },
      {
        path: 'order',
        name: 'Order',
        component: Order,
        beforeEnter: (to, _from, next) => {
          const raw = to.query.packageId;
          const id = Number(raw);
          if (
            raw === undefined ||
            raw === null ||
            (typeof raw === 'string' && raw.trim() === '') ||
            Number.isNaN(id) ||
            id <= 0
          ) {
            next({ path: '/user/custom-requests', replace: true });
            return;
          }
          next();
        },
        meta: {
          title: '套餐预约下单',
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
          title: '我的订单',
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
      {
        path: 'chat',
        name: 'UserChat',
        component: UserChat,
        meta: {
          title: '消息',
        },
      },
      {
        path: 'custom-requests',
        name: 'UserCustomShootRequests',
        component: UserCustomShootRequests,
        meta: {
          title: '个性预约',
        },
      },
    ],
  },

  // 工作人员工作台
  {
    path: '/worker',
    component: WorkerShell,
    redirect: '/worker/dashboard',
    meta: {
      requiresAuth: true,
      requiresWorker: true,
      layout: 'default',
      hideHeader: true,
      hideSidebar: true,
    },
    children: [
      {
        path: 'dashboard',
        name: 'WorkerDashboard',
        component: WorkerDashboard,
        meta: { title: '工作人员工作台' },
      },
      {
        path: 'orders',
        name: 'WorkerOrders',
        component: WorkerOrders,
        meta: { title: '我的订单' },
      },
      {
        path: 'custom-market',
        name: 'WorkerCustomMarket',
        component: WorkerCustomMarket,
        meta: { title: '定制需求广场' },
      },
      {
        path: 'schedule',
        name: 'WorkerSchedule',
        component: WorkerSchedule,
        meta: { title: '档期管理' },
      },
      {
        path: 'portfolio',
        name: 'WorkerPortfolio',
        component: WorkerPortfolio,
        meta: { title: '作品管理' },
      },
      {
        path: 'messages',
        name: 'WorkerMessages',
        component: WorkerMessages,
        meta: { title: '消息中心' },
      },
      {
        path: 'makeup-ai',
        name: 'WorkerMakeupAI',
        component: WorkerMakeupAI,
        meta: { title: '智能试妆' },
      },
      {
        path: 'profile',
        name: 'WorkerProfile',
        component: WorkerProfile,
        meta: { title: '个人中心' },
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
        path: 'insights',
        name: 'AdminInsights',
        component: AdminInsights,
        meta: {
          title: '运营洞察',
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
        path: 'content/photographers',
        name: 'AdminPhotographers',
        component: AdminPhotographers,
        meta: {
          title: '摄影师管理',
        },
      },
      {
        path: 'content/makeup-artists',
        name: 'AdminMakeupArtists',
        component: AdminMakeupArtists,
        meta: {
          title: '化妆师管理',
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
router.beforeEach(async (to, from, next) => {
  // 更新页面标题
  const title = (to.meta?.title as string) ? `${to.meta.title} - 旅拍智享` : '旅拍智享';
  document.title = title;

  const authStore = useAuthStore();
  // 确保从 localStorage 恢复登录态（路由守卫触发时页面可能尚未 mounted）
  authStore.initializeAuth();

  // 若已登录但缺少 role（旧缓存），拉取一次 profile 补齐
  if (authStore.isAuthenticated && !authStore.user?.role) {
    try {
      await authStore.getProfile();
    } catch {
      // ignore
    }
  }

  // worker 账号隔离：除 /worker/** 外不允许访问其他业务页面
  if (
    authStore.isAuthenticated &&
    authStore.user?.role === 'worker' &&
    !to.path.startsWith('/worker') &&
    to.name !== 'Login'
  ) {
    next({ name: 'WorkerDashboard' });
    return;
  }

  // worker 账号禁止进入用户控制台，统一送到工作人员工作台
  if (to.path === '/dashboard' && authStore.user?.role === 'worker') {
    next({ name: 'WorkerDashboard' });
    return;
  }

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

  // 检查工作人员权限（role=worker）
  if (to.meta?.requiresWorker) {
    if (authStore.user?.role !== 'worker') {
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
