# 代码规范和最佳实践

## TypeScript 配置

所有项目启用严格模式：

- strict: true
- verbatimModuleSyntax: true（类型导入必须使用 import type）

### 类型导入示例

```typescript
// ✅ 正确
import type { User, LoginResponse } from "@/types/common";
import { useAuthStore } from "@/store";

// ❌ 错误
import { User, useAuthStore } from "@/store";
```

## React 前端规范

### 组件结构

```typescript
export const ComponentName = () => {
  const store = useStore()
  const [state, setState] = useState(initialValue)
  return <div>content</div>
}
export default ComponentName
```

### 样式导入（必须用 Less）

```typescript
// ✅ 必须
import "./MyComponent.less";

// ❌ 错误
import "./MyComponent.css";
import styles from "./MyComponent.module.less";
```

### Zustand Store 模式

```typescript
export const useAuthStore = create<AuthState>()
  persist(
    (set) => ({
      user: null,
      setAuthData: (data) => set({ user: data.user }),
      logout: () => set({ user: null }),
    }),
    { name: 'auth-storage' }
  )
)
```

## Less 样式规范

### BEM 命名规范

```less
.login-container {
  &__card {
  }
  &__header {
  }
  &__form-item {
    &--error {
    }
  }
}
```

## Git 提交规范

格式: `<type>(<scope>): <subject>`

类型: feat, fix, docs, style, refactor, perf, test, chore
范围: frontend-react, backend, auth, users

示例:
`feat(frontend-react): implement JWT token refresh`

## 常见错误

| 错误                   | 修复                                     |
| ---------------------- | ---------------------------------------- |
| 硬编码 API URL         | 使用 `import.meta.env.VITE_API_BASE_URL` |
| React 中用 .css        | 必须用 .less                             |
| 混淆响应格式           | 使用 `response.data` 字段                |
| 缺少类型导入           | `import type { User } from './types'`    |
| require() 在 ES Module | `import { ... } from '...'`              |
