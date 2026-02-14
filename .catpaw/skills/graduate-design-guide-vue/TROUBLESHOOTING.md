# 故障排查

## 项目启动问题

### 依赖安装失败

**问题**: `pnpm install` 出现超时或 404 错误
**解决方案**:

```bash
# 1. 清除缓存
pnpm store prune
rm -rf node_modules

# 2. 检查镜像源
pnpm config get registry

# 3. 设置淘宝镜像（如需要）
pnpm config set registry https://registry.npmmirror.com

# 4. 重新安装
pnpm install
```

### 端口被占用

**问题**: 启动时报 "Port 5173 is already in use" 或 "Port 3000 is already in use"
**解决方案**:

```bash
# 查看占用端口的进程
lsof -i :5173  # 前端
lsof -i :3000  # 后端

# 杀死进程
kill -9 <PID>

# 或自动选择可用端口
pnpm dev -- --port 5174
```

### Node 版本不匹配

**问题**: 依赖安装或编译时出现版本错误
**解决方案**:

```bash
# 检查 Node 版本
node -v

# 需要 18+ 版本
# 使用 nvm 切换版本
nvm use 18

# 或安装指定版本
nvm install 18
nvm use 18
```

## 前端问题

### 页面空白/无内容显示

**问题**: 应用启动后页面完全空白
**排查步骤**:

1. 打开浏览器开发者工具（F12）
2. 查看 Console 标签，检查是否有 JavaScript 错误
3. 查看 Network 标签，确认资源加载成功
4. 检查 `src/main.ts` 的挂载逻辑

**常见原因**:

- `#app` 元素不存在（检查 `index.html`）
- Vue 应用未正确初始化
- 路由配置错误

**修复**:

```typescript
// src/main.ts - 确保挂载逻辑正确
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import pinia from "./stores";

const app = createApp(App);
app.use(pinia);
app.use(router);
app.mount("#app");
```

### 登录后页面不跳转

**问题**: 登录成功但页面无反应
**排查步骤**:

1. 检查 Network 标签，确认登录请求返回 200
2. 检查 Console，看是否有 JavaScript 错误
3. 验证响应数据包含 `accessToken` 和 `user` 字段
4. 检查 Store 是否正确保存了 token

**修复**:

```typescript
// 在登录处理器中手动导航
const router = useRouter();
const { setAuth } = useAuthStore();

const handleLogin = async (values) => {
  const response = await login(values);
  setAuth(response);
  await router.push("/dashboard"); // 手动导航
};
```

### 输入框无法输入/不显示

**问题**: 使用 Ant Design Vue 表单组件但无法输入
**原因**: 通常是绑定值与组件不同步
**修复**:

```vue
<!-- ✅ 正确 -->
<a-input v-model:value="form.email" placeholder="Email" />

<!-- ❌ 错误 -->
<a-input v-model="form.email" placeholder="Email" />
<a-input :value="form.email" @change="(e) => (form.email = e)" />
```

### 样式不生效

**问题**: Less 样式编译错误或不被应用
**排查步骤**:

1. 检查 `<style>` 标签是否有 `scoped` 和 `lang="less"`
2. 检查 vite.config.ts 是否正确配置了 Less
3. 验证 Less 语法是否正确

**修复**:

```vue
<!-- ✅ 正确 -->
<style scoped lang="less">
@primary-color: #1890ff;
.button {
  color: @primary-color;
}
</style>

<!-- ❌ 错误 -->
<style>
.button {
  color: #1890ff;
} /* 没有 scoped，可能污染全局 */
</style>
```

### 动态导入组件失败

**问题**: 使用 `defineAsyncComponent` 导入组件时出错
**修复**:

```typescript
// ✅ 正确
import { defineAsyncComponent } from "vue";
const Component = defineAsyncComponent(
  () => import("@/components/MyComponent.vue"),
);

// ✅ 使用路由懒加载
const routes = [
  {
    path: "/about",
    component: () => import("@/views/About.vue"),
  },
];
```

## 认证和 API 问题

### 登录失败 - 404 错误

**问题**: `POST /auth/login 404` 错误
**排查步骤**:

1. 确认后端服务已启动（`npm run start:dev` from `backend/`）
2. 检查 API 基础 URL：应为 `http://localhost:3000/api/v1`
3. 验证环境变量：`VITE_API_BASE_URL`

**修复**:

```typescript
// src/api/client.ts
import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1",
});

export default client;
```

### 401 未授权错误

**问题**: API 返回 401，即使 Token 有效
**原因**:

1. Authorization 头未正确发送
2. Token 过期
3. JWT 密钥不匹配

**排查步骤**:

1. 检查 Network 中的请求头是否包含 `Authorization: Bearer <token>`
2. 检查 Token 是否正确保存在 Store
3. 查看后端日志确认 JWT 验证

**修复**:

```typescript
// src/api/client.ts - 请求拦截器
client.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});
```

### CORS 错误

**问题**: 浏览器控制台报 CORS 错误
**错误消息**: "Access to XMLHttpRequest blocked by CORS policy"
**解决方案**:

1. **后端已配置** CORS（NestJS）:

```typescript
// src/main.ts
app.enableCors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
});
```

2. **如仍有问题**，检查：
   - 前端 URL 是否在后端允许列表中
   - 请求是否包含 `credentials: 'include'`（跨域 cookie）

```typescript
// src/api/client.ts
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // 如使用 cookie
});
```

### Token 刷新问题

**问题**: Token 自动刷新失败，用户被登出
**排查步骤**:

1. 检查 `refreshToken` 是否正确保存
2. 验证后端的 `/auth/refresh` 端点是否有效
3. 检查响应拦截器的刷新逻辑

**修复**:

```typescript
// src/api/client.ts - 响应拦截器
client.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const authStore = useAuthStore();

    if (error.response?.status === 401 && authStore.token) {
      // 尝试刷新 token
      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken: authStore.refreshToken,
        });
        authStore.setAuth(data);
        return client(error.config);
      } catch {
        authStore.logout();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
```

### API 返回数据格式错误

**问题**: API 调用成功但数据格式不符合预期
**排查步骤**:

1. 在 Network 标签查看实际响应
2. 验证响应数据与 TypeScript 类型定义的匹配

**预期格式**:

```json
{
  "statusCode": 200,
  "message": "Request successful",
  "data": {
    "user": { "id": 1, "username": "user", "email": "user@example.com" },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

## TypeScript 编译问题

### 类型错误

**问题**: TypeScript 编译错误如 `Property does not exist on type`
**解决方案**:

1. 检查类型定义是否正确导入
2. 使用 `import type` 导入纯类型
3. 验证接口定义是否完整

```typescript
// ✅ 正确
import type { User } from "@/types";

// ❌ 错误
import User from "@/types"; // User 是类型，不是值
```

### 模块找不到

**问题**: `Cannot find module '@/api'`
**解决方案**:

1. 检查 vite.config.ts 的路径别名配置
2. 验证文件夹结构
3. 确保使用正确的导入路径

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

## 性能和缓存问题

### 浏览器缓存导致代码不更新

**问题**: 修改代码后，浏览器仍显示旧内容
**解决方案**:

1. **浏览器硬刷新**: Cmd+Shift+R (Mac) / Ctrl+Shift+F5 (Windows)
2. **清除 Vite 缓存**:

```bash
rm -rf dist node_modules/.vite
pnpm dev
```

3. **浏览器开发者工具禁用缓存**: F12 → Settings → Disable cache (while DevTools open)

### 编译缓慢

**问题**: `pnpm dev` 启动慢或首次编译耗时长
**解决方案**:

```bash
# 清除所有缓存
pnpm store prune
rm -rf node_modules/.vite dist

# 重启开发服务器
pnpm dev
```

## 数据库和后端问题

### 数据库连接失败

**问题**: `error: connect ECONNREFUSED 127.0.0.1:3306`
**排查步骤**:

1. 确认 MySQL 服务已启动
2. 验证 `.env` 中的数据库连接信息
3. 检查端口号是否正确

**修复**:

```bash
# 启动 MySQL
brew services start mysql

# 或 Docker
docker run -d --name mysql -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 mysql:8.0
```

### Prisma 迁移失败

**问题**: `pnpm run db:migrate` 出错
**解决方案**:

```bash
# 重置数据库（谨慎！会删除所有数据）
cd backend
pnpm prisma migrate reset

# 或手动迁移
pnpm prisma migrate dev --name init
```

### 后端启动失败

**问题**: `npm run start:dev` 出现错误
**排查步骤**:

1. 检查环境变量是否配置
2. 验证所有依赖是否安装成功
3. 检查端口 3000 是否被占用

```bash
# 清除构建缓存
cd backend
rm -rf dist node_modules
pnpm install
npm run start:dev
```

## 其他常见问题

### 路由跳转无效

**问题**: `router.push()` 后页面无变化
**排查步骤**:

1. 检查路由配置中路径是否正确
2. 验证路由守卫逻辑
3. 确认组件正确导入

**修复**:

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "@/views/Dashboard.vue";

const routes = [
  {
    path: "/dashboard",
    component: Dashboard,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
```

### Store 状态丢失（刷新后）

**问题**: 刷新页面后 Pinia Store 状态被重置
**解决方案**: 使用 `pinia-plugin-persistedstate` 持久化

```typescript
// src/main.ts
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
```

```typescript
// src/stores/auth.ts
export const useAuthStore = defineStore(
  "auth",
  () => {
    const token = ref("");

    return { token };
  },
  {
    persist: true, // 启用持久化
  },
);
```

### 环境变量未被正确加载

**问题**: `import.meta.env.VITE_API_BASE_URL` 为 undefined
**排查步骤**:

1. 检查 `.env` 文件是否存在
2. 验证环境变量名称是否以 `VITE_` 开头
3. 重启开发服务器

**修复**:

```bash
# frontend/.env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

```typescript
// 确保正确使用
const baseURL = import.meta.env.VITE_API_BASE_URL;
console.log(baseURL); // 应输出 http://localhost:3000/api/v1
```

## 调试技巧

### 启用详细日志

```typescript
// 在 main.ts 中
if (import.meta.env.DEV) {
  app.config.globalProperties.$log = console.log;
}
```

### 使用浏览器 DevTools

1. **Network 标签**: 检查 API 请求和响应
2. **Console 标签**: 查看 JavaScript 错误和日志
3. **Application 标签**: 查看 localStorage、sessionStorage
4. **Vue DevTools 浏览器插件**: 调试 Vue 组件和 Pinia Store

### 后端调试

```typescript
// NestJS 中添加日志
import { Logger } from "@nestjs/common";

const logger = new Logger("AuthService");
logger.debug("Login attempt", email);
logger.error("Login failed", error);
```
