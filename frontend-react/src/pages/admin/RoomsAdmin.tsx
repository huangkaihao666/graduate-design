import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Modal, Select, Space, Table, Tag, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import * as adminApi from '@/api/admin'
import './RoomsAdmin.less'

const RoomsAdmin: React.FC = () => {
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-rooms', status, search],
    queryFn: () => adminApi.getAdminRooms({ page: 1, pageSize: 50, status, search: search.trim() || undefined }),
  })

  const rows = (data as any)?.data || []

  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 80 },
      { title: '标题', dataIndex: 'title', ellipsis: true },
      {
        title: '状态',
        dataIndex: 'status',
        width: 140,
        render: (v: string, record: any) => (
          <Select
            size="small"
            value={v}
            style={{ width: 120 }}
            options={[
              { value: 'WAITING', label: 'WAITING' },
              { value: 'LIVE', label: 'LIVE' },
              { value: 'CLOSED', label: 'CLOSED' },
            ]}
            onChange={async (next) => {
              await adminApi.updateAdminRoomStatus(record.id, next)
              message.success('状态已更新')
              void refetch()
            }}
          />
        ),
      },
      {
        title: '发起人',
        dataIndex: 'owner',
        width: 220,
        render: (o: any) => o?.name || o?.email || `用户${o?.id}`,
      },
      {
        title: '在线',
        dataIndex: 'onlineCount',
        width: 90,
        render: (v: number) => (
          <Tag
            color={v > 0 ? 'green' : 'default'}
            style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}
          >
            {v ?? 0}
          </Tag>
        ),
      },
      {
        title: '围观/评论',
        key: 'stats',
        width: 120,
        render: (_: any, r: any) => (
          <span style={{ color: '#6b6459', fontSize: 13 }}>
            {r.viewCount ?? 0} / {r.commentCount ?? 0}
          </span>
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        width: 170,
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
                title: '确认删除房间？',
                content: '删除后无法恢复。',
                okText: '删除',
                okButtonProps: { danger: true },
                cancelText: '取消',
                onOk: async () => {
                  await adminApi.deleteAdminRoom(r.id)
                  message.success('已删除')
                  void refetch()
                },
              })
            }}
          >
            删除
          </Button>
        ),
      },
    ],
    [refetch]
  )

  return (
    <div className="ra-page">
      <div className="ra-banner">
        <h2 className="ra-banner-title">房间管理</h2>
        <div className="ra-toolbar">
          <Select
            allowClear
            placeholder="状态筛选"
            style={{ width: 140 }}
            value={status}
            onChange={(v) => setStatus(v)}
            options={[
              { value: 'WAITING', label: 'WAITING' },
              { value: 'LIVE', label: 'LIVE' },
              { value: 'CLOSED', label: 'CLOSED' },
            ]}
          />
          <Input.Search
            allowClear
            placeholder="搜索标题/内容"
            style={{ width: 280 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} style={{ borderRadius: 9 }}>
            刷新
          </Button>
        </div>
      </div>

      <div className="ra-table-wrap">
        <Table
          className="ra-table"
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

export default RoomsAdmin
