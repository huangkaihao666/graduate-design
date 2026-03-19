import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Modal, Select, Space, Switch, Table, Tag, message } from 'antd'
import * as adminApi from '@/api/admin'

const UsersAdmin: React.FC = () => {
  const [role, setRole] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', role, status, search],
    queryFn: () =>
      adminApi.getAdminUsers({
        page: 1,
        pageSize: 50,
        role,
        status,
        search: search.trim() || undefined,
      }),
  })

  const rows = (data as any)?.data || []

  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 80 },
      { title: '邮箱', dataIndex: 'email', width: 220 },
      { title: '昵称', dataIndex: 'name', width: 160, ellipsis: true },
      {
        title: '角色',
        dataIndex: 'role',
        width: 150,
        render: (v: string, r: any) => (
          <Select
            size="small"
            value={v}
            style={{ width: 130 }}
            options={[
              { value: 'USER', label: 'USER' },
              { value: 'ADMIN', label: 'ADMIN' },
              { value: 'MODERATOR', label: 'MODERATOR' },
            ]}
            onChange={async (next) => {
              await adminApi.updateAdminUserRole(r.id, next)
              message.success('角色已更新')
              void refetch()
            }}
          />
        ),
      },
      {
        title: '状态',
        dataIndex: 'isActive',
        width: 120,
        render: (v: boolean, r: any) => (
          <Switch
            checked={!!v}
            checkedChildren="启用"
            unCheckedChildren="禁用"
            onChange={async (checked) => {
              await adminApi.updateAdminUserStatus(r.id, checked)
              message.success('状态已更新')
              void refetch()
            }}
          />
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        width: 180,
        render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        render: (_: any, r: any) => (
          <Button
            danger
            size="small"
            onClick={() => {
              Modal.confirm({
                title: '确认封禁该用户？',
                content: '封禁后用户将无法继续登录。',
                okText: '封禁',
                okButtonProps: { danger: true },
                cancelText: '取消',
                onOk: async () => {
                  await adminApi.updateAdminUserStatus(r.id, false)
                  message.success('已封禁')
                  void refetch()
                },
              })
            }}
          >
            封禁
          </Button>
        ),
      },
    ],
    [refetch]
  )

  return (
    <Card style={{ borderRadius: 16 }} title="用户管理" extra={<Button onClick={() => refetch()}>刷新</Button>}>
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          allowClear
          placeholder="角色筛选"
          style={{ width: 160 }}
          value={role}
          onChange={(v) => setRole(v)}
          options={[
            { value: 'USER', label: 'USER' },
            { value: 'ADMIN', label: 'ADMIN' },
            { value: 'MODERATOR', label: 'MODERATOR' },
          ]}
        />
        <Select
          allowClear
          placeholder="状态筛选"
          style={{ width: 160 }}
          value={status}
          onChange={(v) => setStatus(v)}
          options={[
            { value: 'ACTIVE', label: 'ACTIVE' },
            { value: 'DISABLED', label: 'DISABLED' },
          ]}
        />
        <Input.Search
          allowClear
          placeholder="搜索邮箱/昵称"
          style={{ width: 320 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Space>

      <Table rowKey="id" loading={isLoading} dataSource={rows} columns={columns as any} pagination={false} />
    </Card>
  )
}

export default UsersAdmin

