import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Modal, Space, Table, Tag, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import * as adminApi from '@/api/admin'
import './MessagesAdmin.less'

const MessagesAdmin: React.FC = () => {
  const [search, setSearch] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-violations', search],
    queryFn: () => adminApi.getAdminViolations({ page: 1, pageSize: 50, search: search.trim() || undefined }),
  })

  const rows = (data as any)?.data || []

  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 80 },
      {
        title: '用户',
        dataIndex: 'user',
        width: 220,
        render: (u: any) => (
          <Space>
            <span style={{ fontWeight: 500 }}>{u?.name || u?.email || `用户${u?.id}`}</span>
            <Tag
              color={u?.isActive ? 'green' : 'default'}
              style={{ borderRadius: 6, fontWeight: 600, fontSize: 10 }}
            >
              {u?.isActive ? 'ACTIVE' : 'BANNED'}
            </Tag>
          </Space>
        ),
      },
      { title: '房间', dataIndex: ['room', 'title'], width: 240, ellipsis: true },
      { title: '内容', dataIndex: 'content', ellipsis: true },
      {
        title: '原因',
        dataIndex: 'reason',
        width: 130,
        render: (v: string) => (
          <Tag color="red" style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{v}</Tag>
        ),
      },
      {
        title: '时间',
        dataIndex: 'createdAt',
        width: 160,
        render: (v: string) => v ? new Date(v).toLocaleString() : '-',
      },
      {
        title: '操作',
        key: 'actions',
        width: 180,
        render: (_: any, r: any) => (
          <Space>
            <Button
              danger
              size="small"
              style={{ borderRadius: 7, fontWeight: 600, fontSize: 12 }}
              onClick={() => {
                Modal.confirm({
                  title: '删除该消息？',
                  content: '删除后不可恢复。',
                  okText: '删除',
                  okButtonProps: { danger: true },
                  cancelText: '取消',
                  onOk: async () => {
                    await adminApi.deleteAdminMessage(r.id)
                    message.success('已删除消息')
                    void refetch()
                  },
                })
              }}
            >
              删除
            </Button>
            <Button
              size="small"
              style={{ borderRadius: 7, fontWeight: 600, fontSize: 12 }}
              onClick={() => {
                Modal.confirm({
                  title: '封禁该用户？',
                  content: '封禁后用户将无法继续登录。',
                  okText: '封禁',
                  okButtonProps: { danger: true },
                  cancelText: '取消',
                  onOk: async () => {
                    await adminApi.banAdminUser(r.user.id)
                    message.success('已封禁用户')
                    void refetch()
                  },
                })
              }}
            >
              封禁用户
            </Button>
          </Space>
        ),
      },
    ],
    [refetch]
  )

  return (
    <div className="ma-page">
      <div className="ma-banner">
        <h2 className="ma-banner-title">消息审核</h2>
        <div className="ma-toolbar">
          <Input.Search
            allowClear
            placeholder="搜索消息内容"
            style={{ width: 320 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} style={{ borderRadius: 9 }}>
            刷新
          </Button>
        </div>
      </div>

      <div className="ma-table-wrap">
        <Table
          className="ma-table"
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

export default MessagesAdmin
