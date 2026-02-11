# 开发指南

本文档说明如何在本项目中进行开发，包括开发工具配置、环境设置等。

## 🔧 必需工具

### 1. Node.js 和 pnpm

- **Node.js**: v20 或更高
- **pnpm**: v10 或更高

```bash
# 安装 pnpm (如果还未安装)
npm install -g pnpm

# 验证安装
node --version
pnpm --version
```

### 2. Visual Studio Code

下载并安装 [VS Code](https://code.visualstudio.com/)

## 📦 必需的 VSCode 扩展

在开发前，请在 VSCode 中安装以下扩展:

### 核心扩展 (必需)

| 扩展 | 功能 | 安装 |
|------|------|------|
| **Prettier - Code formatter** | 代码格式化 | `esbenp.prettier-vscode` |
| **ESLint** | 代码质量检查 | `dbaeumer.vscode-eslint` |
| **Vue - Official** | Vue 3 官方支持 | `Vue.volar` |
| **TypeScript Vue Plugin** | Vue + TypeScript 支持 | `Vue.vscode-typescript-vue-plugin` |

### 推荐扩展 (可选但推荐)

| 扩展 | 功能 |
|------|------|
| **EditorConfig for VS Code** | 编辑器配置同步 |
| **GitHub Theme** | GitHub 主题 |
| **GitLens** | Git 历史查看 |
| **Thunder Client** | API 测试工具 |
| **REST Client** | REST API 测试 |

### 快速安装方式

VSCode 会在打开项目时自动提示安装推荐的扩展。点击"安装所有推荐的扩展"即可。

或者在命令行安装:

```bash
# 安装 Prettier
code --install-extension esbenp.prettier-vscode

# 安装 ESLint
code --install-extension dbaeumer.vscode-eslint

# 安装 Vue 扩展
code --install-extension Vue.volar
code --install-extension Vue.vscode-typescript-vue-plugin
```

## 🚀 启动开发

### 第一次运行

```bash
# 进入项目目录
cd /Users/huangkaihao/Desktop/graduate-design

# 安装依赖
pnpm install

# 启动开发服务器
cd frontend
pnpm run dev

# 访问应用
# 在浏览器中打开 http://localhost:5173
```

### 开发命令

```bash
# 启动开发服务器
pnpm run dev

# 构建生产版本
pnpm run build

# 预览构建结果
pnpm run preview

# 代码检查 (仅报告)
pnpm run lint

# 代码检查 + 自动修复
pnpm run lint:fix

# 代码格式化
pnpm run format

# 检查代码格式 (不修改)
pnpm run format:check

# TypeScript 类型检查
pnpm run type-check
```

## 💾 自动格式化和代码检查

### 工作流程

当保存文件时，VSCode 会自动:

1. ✅ **Prettier 格式化** - 统一代码风格
2. ✅ **ESLint 修复** - 修复可修复的问题
3. ✅ **问题提示** - 显示代码质量警告

### 支持的文件类型

- `.vue` - Vue 单文件组件
- `.ts` / `.tsx` - TypeScript
- `.js` / `.jsx` - JavaScript
- `.json` - JSON 配置
- `.css` / `.scss` - 样式文件
- `.html` - HTML 文件

### 如果保存时没有自动格式化

**检查清单:**

1. ✓ 确认已安装 **Prettier** 扩展 (`esbenp.prettier-vscode`)
2. ✓ 确认已安装 **ESLint** 扩展 (`dbaeumer.vscode-eslint`)
3. ✓ 重启 VSCode (`Cmd+Shift+P` → "Developer: Reload Window")
4. ✓ 检查文件是否在 `.prettierignore` 中被排除
5. ✓ 查看 VSCode 输出面板 (`View` → `Output` → 选择 `Prettier`)

### 手动运行格式化

在 VSCode 命令面板中:

```
Cmd+Shift+P (Mac) / Ctrl+Shift+P (Windows)
输入: Format Document
按 Enter
```

或在终端运行:

```bash
# 格式化所有文件
pnpm run format

# 只格式化特定文件
npx prettier --write src/views/Home.vue
```

## 🎯 VSCode 快捷方式

### 常用快捷键

| 快捷键 | 功能 |
|-------|------|
| `Cmd+S` / `Ctrl+S` | 保存文件 (自动格式化) |
| `Cmd+Shift+P` / `Ctrl+Shift+P` | 命令面板 |
| `Cmd+B` / `Ctrl+B` | 切换侧边栏 |
| `Cmd+Shift+M` / `Ctrl+Shift+M` | 显示问题面板 |
| `Cmd+Shift+D` / `Ctrl+Shift+D` | 调试视图 |
| `Cmd+J` / `Ctrl+J` | 切换终端 |

### 快速任务

在 VSCode 中使用快捷任务:

```
Cmd+Shift+P / Ctrl+Shift+P
输入: Tasks: Run Task
选择任务:
  - dev        (启动开发服务器)
  - build      (生产构建)
  - lint       (代码检查)
  - lint:fix   (自动修复)
  - format     (格式化)
  - type-check (类型检查)
```

## 📋 代码规范

### ESLint 规则

项目配置了严格的 ESLint 规则:

- ✓ 禁止未使用的变量 (除非以 `_` 开头)
- ✓ 禁止 `console.log` (生产环境)
- ✓ 禁止 `debugger`
- ✓ TypeScript 类型检查
- ✓ Vue 3 最佳实践

### Prettier 规则

- 行宽: 100 字符
- 制表符: 2 空格
- 单引号: 启用
- 尾部逗号: es5
- 分号: 启用
- 箭头函数参数: 始终添加括号

### 命名约定

- **文件名**: 使用 kebab-case (如 `user-store.ts`)
- **组件名**: 使用 PascalCase (如 `UserProfile.vue`)
- **函数名**: 使用 camelCase (如 `getUserInfo()`)
- **常量**: 使用 UPPER_SNAKE_CASE (如 `API_BASE_URL`)

## 🔄 Git 工作流程

### 提交前检查

在提交代码前，推荐运行:

```bash
# 完整检查
pnpm run type-check
pnpm run lint
pnpm run format:check

# 或快速检查
pnpm run build
```

### 提交规范

遵循常规提交 (Conventional Commits):

```
feat: 新功能
fix: 错误修复
docs: 文档更新
style: 代码风格调整
refactor: 代码重构
test: 测试相关
chore: 构建、依赖等杂务
```

示例:

```bash
git commit -m "feat: 添加用户认证功能"
git commit -m "fix: 修复登录按钮样式问题"
```

## 🐛 常见问题

### Q: 保存时没有自动格式化

**A:** 请检查:
1. 是否安装了 Prettier 扩展
2. VSCode 设置中 `editor.formatOnSave` 是否为 true
3. 尝试重启 VSCode
4. 查看 Prettier 输出面板了解具体错误

### Q: ESLint 错误太多

**A:** 运行自动修复:
```bash
pnpm run lint:fix
```

### Q: 类型检查失败

**A:** 运行类型检查并查看错误:
```bash
pnpm run type-check
```

### Q: 开发服务器无法启动

**A:** 尝试:
```bash
# 清理缓存
rm -rf node_modules frontend/node_modules
pnpm install

# 重新启动
pnpm run dev
```

### Q: 端口 5173 已被占用

**A:** 修改 vite.config.ts 中的端口号，或使用其他端口:
```bash
PORT=5174 pnpm run dev
```

## 📚 资源链接

- [Vue 3 文档](https://vuejs.org/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Vite 文档](https://vitejs.dev/)
- [ESLint 文档](https://eslint.org/)
- [Prettier 文档](https://prettier.io/)
- [Ant Design Vue](https://www.antdv.com/)

## 💡 提示

1. **定期更新依赖**: `pnpm update`
2. **检查类型**: 保存时自动检查
3. **使用 VSCode IntelliSense**: 获得代码提示
4. **查看 Git 历史**: 使用 GitLens 扩展
5. **调试**: 使用 VSCode 调试工具或浏览器开发者工具

---

如有问题，请查看项目根目录的配置文件或联系项目维护者。
