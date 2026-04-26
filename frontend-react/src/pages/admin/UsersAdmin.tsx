import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Modal, Select, Switch, Table, Tag, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import * as adminApi from '@/api/admin'
import './UsersAdmin.less'

const UsersAdmin: React.FC = () => {
  const [role, setRole] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', role, status, search],
    queryFn: () =>
      adminApi.getAdminUsers({ page: 1, pageSize: 50, role, status, search: search.trim() || undefined }),
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
        width: 160,
        render: (v: string, r: any) => (
          <Select
            size="small"
            value={v}
            style={{ width: 140 }}
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
        render: (v: string) => v ? new Date(v).toLocaleString() : '-',
      },
      {
        title: '操作',
        key: 'actions',
        width: 100,
        render: (_: any, r: any) => (
          <Button
            danger
            size="small"
            style={{ borderRadius: 7, fontWeight: 600, fontSize: 12 }}
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
    <div className="ua-page">
      <div className="ua-banner">
        <h2 className="ua-banner-title">用户管理</h2>
        <div className="ua-toolbar">
          <Select
            allowClear
            placeholder="角色筛选"
            style={{ width: 140 }}
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
            style={{ width: 140 }}
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
            style={{ width: 260 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} style={{ borderRadius: 9 }}>
            刷新
          </Button>
        </div>
      </div>

      <div className="ua-table-wrap">
        <Table
          className="ua-table"
          rowKey="id"
          loading={isLoading}
          dataSource={rows}
          columns={columns as any}
          pagination={false}
        />
      </div>
    </div>
  )
}

export default UsersAdmin
