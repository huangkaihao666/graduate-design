# 编码规范

## TypeScript

### 类型定义

- 始终使用 `import type` 导入纯类型
- 复杂类型定义在 `src/types/` 目录
- 接口优于类型别名（除非需要联合或交叉类型）

```typescript
// ✅ 正确
import type { User } from "@/types";
interface AuthResponse {
  user: User;
  token: string;
}

// ❌ 错误
import { User } from "@/types";
type AuthResponse = { user: User; token: string };
```

### 命名约定

- 类和接口：PascalCase
- 变量、函数、方法：camelCase
- 常量：UPPER_SNAKE_CASE
- 文件名：与导出内容相同的大小写

## Vue 3 单文件组件

### 结构

```vue
<template>
  <!-- HTML 结构 -->
</template>

<script setup lang="ts">
// TypeScript 代码
</script>

<style scoped lang="less">
/* 样式 */
</style>
```

### script setup 最佳实践

- 尽量使用 `<script setup>` 语法糖
- 避免 `defineComponent`，除非需要继承其他组件
- 使用 `defineProps` 和 `defineEmits` 声明接口
- 使用 `const emit = defineEmits<{ close: [] }>()` 定义事件

```typescript
// ✅ 正确
<script setup lang="ts">
import type { User } from '@/types'

interface Props {
  user: User
}

const props = defineProps<Props>()
const emit = defineEmits<{ select: [user: User] }>()

const handleSelect = () => {
  emit('select', props.user)
}
</script>
```

### 响应式数据

- 简单值使用 `ref()`
- 对象使用 `reactive()` 或 `ref()`（推荐 `ref()`）
- 从 Store 读取状态时不需要 unwrap

```typescript
// ✅ 推荐
const count = ref(0);
const user = ref<User | null>(null);
const state = reactive({ name: "", email: "" });

// computed 依赖自动追踪
const fullName = computed(
  () => `${user.value?.firstName} ${user.value?.lastName}`,
);
```

### 条件渲染和列表

```vue
<!-- ✅ 使用 v-if/v-else -->
<div v-if="isLoading">Loading...</div>
<div v-else-if="error">{{ error }}</div>
<div v-else>{{ data }}</div>

<!-- ✅ 使用 key 稳定列表顺序 -->
<div v-for="item in items" :key="item.id">
  {{ item.name }}
</div>

<!-- ❌ 避免用索引作为 key -->
<div v-for="(item, i) in items" :key="i">...</div>
```

## Pinia Store

### Store 文件位置和命名

- 文件位置：`src/stores/`
- 文件名：`useXxxStore.ts`

### Store 定义模式

```typescript
// ✅ 组合式 API + Setup 函数
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { User } from "@/types";

export const useAuthStore = defineStore("auth", () => {
  // State
  const user = ref<User | null>(null);
  const token = ref<string>("");

  // Getters
  const isAuthenticated = computed(() => !!token.value);

  // Actions
  const setAuth = (data: { user: User; token: string }) => {
    user.value = data.user;
    token.value = data.token;
    localStorage.setItem("auth_token", data.token);
  };

  const logout = () => {
    user.value = null;
    token.value = "";
    localStorage.removeItem("auth_token");
  };

  return {
    user,
    token,
    isAuthenticated,
    setAuth,
    logout,
  };
});
```

## API 和 HTTP 请求

### Axios 配置

- 基础 URL：`http://localhost:3000/api/v1`
- 自动添加 Authorization 头（来自 Store）
- 统一处理 Token 刷新和 401 错误

### API 模块化

```typescript
// src/api/auth.ts
import axios from "@/api/client";
import type { LoginPayload, AuthResponse } from "@/types";

export const login = (payload: LoginPayload): Promise<AuthResponse> => {
  return axios.post("/auth/login", payload);
};

// src/api/user.ts
import axios from "@/api/client";
import type { User } from "@/types";

export const getProfile = (): Promise<User> => {
  return axios.get("/auth/profile");
};
```

## Less 样式

### 文件位置

- 全局样式：`src/assets/styles/`
- 组件样式：组件 .vue 文件内的 `<style scoped>`

### 最佳实践

```less
// ✅ 使用变量和 mixin
@primary-color: #1890ff;
@spacing: 16px;

.button {
  padding: @spacing;
  background-color: @primary-color;

  &:hover {
    opacity: 0.8;
  }
}

// ✅ 使用 scoped，避免全局污染
<style scoped lang="less">
  .container {
    padding: 20px;
  }
</style>

// ❌ 避免全局样式污染
<style>
  .container { padding: 20px; } /* 影响所有 .container */
</style>
```

## Git 提交规范

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type（必填）

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档
- `style`: 代码格式（非业务逻辑变化）
- `refactor`: 代码重构
- `test`: 测试
- `chore`: 构建工具、依赖更新

### 示例

```
feat(auth): 实现登录和注册功能

- 添加登录表单和注册表单组件
- 集成 Pinia Store 管理认证状态
- 配置 JWT Token 拦截器

Closes #123
```

## ESLint 和 Prettier

### 遵守约定

- 每个文件一个主导出
- 导入按以下顺序排列：
  1. Vue/库导入
  2. 本地导入
  3. 类型导入（分开）

```typescript
// ✅ 正确的导入顺序
import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores";
import { login } from "@/api/auth";

import type { User } from "@/types";
```

## 常见错误模式

### ❌ 错误 1：直接修改 Props

```typescript
// 错误 - 不能直接修改 props
const props = defineProps<{ name: string }>();
props.name = "new"; // ❌ 不能修改
```

```typescript
// 正确 - 使用 emit
const props = defineProps<{ name: string }>();
const emit = defineEmits<{ update: [name: string] }>();

const changeName = (newName: string) => {
  emit("update", newName);
};
```

### ❌ 错误 2：在模板中访问未定义的属性

```vue
<!-- 错误 -->
<div>{{ undefinedVar }}</div>

<!-- 正确 -->
<script setup lang="ts">
const message = ref("Hello");
</script>
<template>
  <div>{{ message }}</div>
</template>
```

### ❌ 错误 3：忘记 ref unwrap

```typescript
// 错误 - 脚本中需要 .value
const count = ref(0)
count++  // ❌ 应该是 count.value++

// 模板中自动 unwrap
<template>
  <div>{{ count }}</div> <!-- ✅ 自动 unwrap -->
</template>
```

### ❌ 错误 4：不适当的响应式数据

```typescript
// 错误 - 创建过多 computed，性能问题
const computed1 = computed(() => derivedValue);
const computed2 = computed(() => derivedValue);

// 正确 - 复用或使用 memo
const memoedValue = computed(() => expensiveCalculation());
```

## 环境变量

### 配置文件位置

- `frontend/.env` - 所有环境
- `frontend/.env.development` - 开发环境
- `frontend/.env.production` - 生产环境

### 必需变量

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_TITLE=Graduate Design
```

### 使用

```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

## NestJS 后端规范

### 控制器

- 路由路径小写，使用连字符
- 方法使用 HTTP 动词装饰器

```typescript
@Controller("auth")
export class AuthController {
  @Post("login")
  login(@Body() dto: LoginDto) {
    // ...
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req) {
    // ...
  }
}
```

### DTO

- 位置：`src/modules/*/dto/`
- 使用 class-validator 装饰器验证

```typescript
import { IsEmail, IsNotEmpty, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
```

### 错误处理

```typescript
// ✅ 使用 NestJS 异常
throw new BadRequestException("Invalid credentials");
throw new UnauthorizedException("Token expired");
throw new NotFoundException("User not found");
```
