# 数据库完整恢复指南

如果你需要恢复完整的演示数据（包含辩论记录、弹幕、辅导会话等），可以使用 SQL 备份文件直接导入，比运行 seed 脚本更完整。

## 获取备份文件

SQL 备份文件不提交到 git（包含对话内容等敏感数据）。请联系 **黄开浩** 获取最新的备份文件：

- 文件名：`database_backup_YYYYMMDD.sql`
- 联系方式：123456@qq.com

## 导入步骤

### 前提条件

确保已创建数据库并配置好 `backend/.env` 中的 `DATABASE_URL`。

### Mac

```bash
mysql -u huangkaihao -p graduate-design < database_backup_20260430.sql
```

### Windows

```bash
mysql -u root -p graduate-design < database_backup_20260430.sql
```

输入密码：`hkh618618`

## 导入后的账号

所有账号密码均为 `HKHhkh618618`

| 角色     | 邮箱               |
| -------- | ------------------ |
| 管理员   | admin@debate.local |
| 普通用户 | demo@debate.local  |
| 成员     | 123456@qq.com      |
| 成员     | 2134084703@qq.com  |
| 成员     | 13321312@qq.com    |
| 成员     | 43412@qq.com       |

## 如果只需要基础演示数据

不需要历史记录的话，直接运行 seed 脚本即可：

```bash
cd backend
npm run seed:demo
```

详见 `backend/prisma/README.md`。
