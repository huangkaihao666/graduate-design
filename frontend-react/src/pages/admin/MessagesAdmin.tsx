import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Avatar, Button, Empty, Input, Modal, Select, Space, Spin, Tag, Tooltip, message,
} from 'antd'
import {
  ReloadOutlined, SearchOutlined, WarningOutlined, DeleteOutlined,
  StopOutlined, UserOutlined, MessageOutlined,
} from '@ant-design/icons'
import * as adminApi from '@/api/admin'
import './MessagesAdmin.less'

const { Option } = Select

const MessagesAdmin: React.FC = () => {
  const queryClient = useQueryClient()

  // 房间选择
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [roomSearch, setRoomSearch] = useState('')

  // 弹幕搜索
  const [msgSearch, setMsgSearch] = useState('')
  const [msgSearchInput, setMsgSearchInput] = useState('')

  // 获取房间列表（用于选择）
  const { data: roomsData } = useQuery({
    queryKey: ['admin-rooms-for-msg', roomSearch],
    queryFn: () => adminApi.getAdminRooms({ page: 1, pageSize: 30, search: roomSearch || undefined }),
  })
  const rooms: any[] = (roomsData as any)?.data || []

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId)

  // 获取该房间弹幕
  const { data: msgData, isLoading: msgLoading, refetch: refetchMsgs } = useQuery({
    queryKey: ['admin-room-messages', selectedRoomId, msgSearch],
    queryFn: () => adminApi.getAdminRoomMessages(selectedRoomId!, { pageSize: 100, search: msgSearch || undefined }),
    enabled: !!selectedRoomId,
  })
  const msgs: any[] = (msgData as any)?.data || []
  const total: number = (msgData as any)?.pagination?.total || 0

  // 发警告
  const warnMutation = useMutation({
    mutationFn: (msgId: number) => adminApi.warnAdminMessage(msgId),
    onSuccess: () => {
      message.success('已发送违规警告通知给用户')
    },
    onError: () => message.error('发送失败，请重试'),
  })

  // 删除弹幕
  const deleteMutation = useMutation({
    mutationFn: (msgId: number) => adminApi.deleteAdminMessage(msgId),
    onSuccess: () => {
      message.success('弹幕已删除')
      void queryClient.invalidateQueries({ queryKey: ['admin-room-messages', selectedRoomId] })
    },
    onError: () => message.error('删除失败'),
  })

  // 封禁用户
  const banMutation = useMutation({
    mutationFn: (userId: number) => adminApi.banAdminUser(userId),
    onSuccess: () => {
      message.success('用户已封禁')
      void queryClient.invalidateQueries({ queryKey: ['admin-room-messages', selectedRoomId] })
    },
    onError: () => message.error('封禁失败'),
  })

  const handleWarn = (msg_: any) => {
    Modal.confirm({
      title: '发送违规警告',
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>将向用户 <b>{msg_.user?.name || msg_.user?.email || `用户${msg_.user?.id}`}</b> 发送违规警告通知。</p>
          <div style={{ background: '#f3f0ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#6b6459' }}>
            "{msg_.content}"
          </div>
        </div>
      ),
      okText: '发送警告',
      okButtonProps: { style: { background: '#d97706', borderColor: '#d97706' } },
      cancelText: '取消',
      onOk: () => warnMutation.mutateAsync(msg_.id),
    })
  }

  const handleDelete = (msg_: any) => {
    Modal.confirm({
      title: '删除该弹幕？',
      content: (
        <div>
          <div style={{ background: '#fff1f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#cf1322', marginBottom: 8 }}>
            "{msg_.content}"
          </div>
          <p style={{ margin: 0, color: '#6b6459', fontSize: 13 }}>删除后不可恢复。</p>
        </div>
      ),
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => deleteMutation.mutateAsync(msg_.id),
    })
  }

  const handleBan = (user: any) => {
    Modal.confirm({
      title: '封禁该用户？',
      content: `封禁后用户 ${user?.name || user?.email || `用户${user?.id}`} 将无法继续登录。`,
      okText: '封禁',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => banMutation.mutateAsync(user.id),
    })
  }

  return (
    <div className="ma-page">
      {/* 顶部 Banner */}
      <div className="ma-banner">
        <div className="ma-banner-left">
          <h2 className="ma-banner-title">消息审核</h2>
          <p className="ma-banner-sub">选择辩论室，查看并管理用户弹幕内容</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => refetchMsgs()} style={{ borderRadius: 9 }}>
          刷新
        </Button>
      </div>

      {/* 房间选择区 */}
      <div className="ma-room-picker">
        <div className="ma-room-picker-label">
          <MessageOutlined style={{ color: '#d97706' }} />
          选择辩论室
        </div>
        <Select
          showSearch
          allowClear
          placeholder="搜索辩论室标题…"
          style={{ flex: 1, minWidth: 280, maxWidth: 480 }}
          filterOption={false}
          onSearch={setRoomSearch}
          onChange={(val) => { setSelectedRoomId(val ?? null); setMsgSearch(''); setMsgSearchInput('') }}
          value={selectedRoomId}
          notFoundContent={<span style={{ color: '#b0a89c', fontSize: 13 }}>未找到对应辩论室</span>}
        >
          {rooms.map((r) => (
            <Option key={r.id} value={r.id}>
              <Space size={6}>
                <Tag
                  color={r.status === 'LIVE' ? 'blue' : r.status === 'CLOSED' ? 'default' : 'gold'}
                  style={{ borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '0 5px' }}
                >
                  {r.status === 'LIVE' ? '进行中' : r.status === 'CLOSED' ? '已结案' : '待开始'}
                </Tag>
                {r.title}
              </Space>
            </Option>
          ))}
        </Select>
        {selectedRoomId && (
          <Input
            prefix={<SearchOutlined style={{ color: '#b0a89c' }} />}
            placeholder="搜索弹幕内容…"
            allowClear
            style={{ width: 220, borderRadius: 9 }}
            value={msgSearchInput}
            onChange={(e) => setMsgSearchInput(e.target.value)}
            onPressEnter={() => setMsgSearch(msgSearchInput)}
            onClear={() => { setMsgSearch(''); setMsgSearchInput('') }}
          />
        )}
        {selectedRoomId && msgSearchInput && (
          <Button type="primary" ghost style={{ borderRadius: 9 }} onClick={() => setMsgSearch(msgSearchInput)}>
            搜索
          </Button>
        )}
      </div>

      {/* 弹幕列表 */}
      {!selectedRoomId ? (
        <div className="ma-empty-hint">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: '#b0a89c' }}>请先选择一个辩论室</span>}
          />
        </div>
      ) : msgLoading ? (
        <div className="ma-loading"><Spin size="large" /></div>
      ) : msgs.length === 0 ? (
        <div className="ma-empty-hint">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: '#b0a89c' }}>{msgSearch ? '未找到匹配的弹幕' : '该辩论室暂无弹幕记录'}</span>}
          />
        </div>
      ) : (
        <div className="ma-msg-zone">
          {/* 房间信息条 */}
          <div className="ma-room-info-bar">
            <span className="ma-room-info-title">{selectedRoom?.title || `辩论室 #${selectedRoomId}`}</span>
            <span className="ma-room-info-count">共 {total} 条弹幕</span>
          </div>

          {/* 弹幕卡片列表 */}
          <div className="ma-msg-list">
            {msgs.map((m) => {
              const isBanned = !m.user?.isActive
              return (
                <div key={m.id} className={`ma-msg-item ${isBanned ? 'ma-msg-item--banned' : ''}`}>
                  {/* 用户信息 */}
                  <div className="ma-msg-user">
                    <Avatar size={32} src={m.user?.avatar} icon={<UserOutlined />}
                      style={{ flexShrink: 0, background: '#e8e4dc' }} />
                    <div className="ma-msg-user-info">
                      <span className="ma-msg-username">{m.user?.name || m.user?.email || `用户${m.user?.id}`}</span>
                      {isBanned && <Tag color="red" style={{ borderRadius: 4, fontSize: 10, padding: '0 5px', marginLeft: 4 }}>已封禁</Tag>}
                    </div>
                    <span className="ma-msg-time">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>

                  {/* 弹幕内容 */}
                  <div className="ma-msg-content">{m.content}</div>

                  {/* 操作按钮 */}
                  <div className="ma-msg-actions">
                    <Tooltip title="发送违规警告通知给该用户">
                      <Button
                        size="small"
                        icon={<WarningOutlined />}
                        className="ma-btn-warn"
                        loading={warnMutation.isPending}
                        onClick={() => handleWarn(m)}
                      >
                        警告
                      </Button>
                    </Tooltip>
                    <Tooltip title="删除该条弹幕">
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        className="ma-btn-delete"
                        loading={deleteMutation.isPending}
                        onClick={() => handleDelete(m)}
                      >
                        删除
                      </Button>
                    </Tooltip>
                    {!isBanned && (
                      <Tooltip title="封禁该用户账号">
                        <Button
                          size="small"
                          icon={<StopOutlined />}
                          className="ma-btn-ban"
                          loading={banMutation.isPending}
                          onClick={() => handleBan(m.user)}
                        >
                          封禁用户
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default MessagesAdmin
