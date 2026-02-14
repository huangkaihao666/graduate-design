# 常见问题和故障排查

## 启动问题

### pnpm install 失败

检查：确保使用 pnpm，Node.js 版本 >= 18

```bash
pnpm install
node -v  # 应该是 18+ 或 20.x LTS
```

### 后端启动失败

```bash
cd backend && pnpm install
npm run start:dev
```

### 数据库连接错误

```bash
# 启动 MySQL
brew services start mysql

# 检查 DATABASE_URL 配置
cat backend/.env
```

## 前端问题

### 页面白屏

排查步骤：

1. 打开浏览器开发者工具（F12）
2. 查看 Console 和 Network 标签中的错误
3. 确保后端运行
4. 检查环境变量配置

### React 前端样式不生效

检查：

- 文件是否是 .less 而不是 .css
- 导入是否正确: `import './Component.less'`
- 清空缓存: `rm -rf dist node_modules/.vite`

## 认证问题

### 登录返回 401

这是正常行为（Token 过期）。应自动跳转登录页。

### CORS 错误

检查 backend/src/main.ts 中的 allowedOrigins：

```typescript
const allowedOrigins = [
  "http://localhost:5174", // React 前端
];
```
