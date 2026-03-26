import React from 'react'
import { Badge, Dropdown, Button, List, Avatar, Typography, Empty, Spin, Divider } from 'antd'
import { BellOutlined, UserOutlined, LikeFilled, MessageFilled, CheckOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import * as notifApi from '@/api/notifications'
import type { NotificationItem } from '@/api/notifications'
import './NotificationDropdown.less'

// 通知类型对应的图标和文案
const TYPE_CONFIG = {
  LIKE_COMMENT: {
    icon: <LikeFilled style={{ color: '#ff4d4f' }} />,
    text: (name: string) => `${name} 赞了你的评论`,
  },
  NEW_COMMENT: {
    icon: <MessageFilled style={{ color: '#6366F1' }} />,
    text: (name: string) => `${name} 评论了你的案件`,
  },
  NEW_REPLY: {
    icon: <MessageFilled style={{ color: '#52c41a' }} />,
    text: (name: string) => `${name} 回复了你的评论`,
  },
}

// 相对时间格式化
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const NotificationDropdown: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)

  // 未读数（轮询，每 30s 刷新一次）
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: notifApi.getUnreadCount,
    refetchInterval: 30000,
  })
  const unreadCount = (unreadData as any)?.count ?? 0

  // 通知列表（点开时才加载）
  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notifApi.getNotifications,
    enabled: open,
    staleTime: 0,
  })
  const notifications: NotificationItem[] = (notifData as any) ?? []

  // 全部已读
  const { mutate: readAll } = useMutation({
    mutationFn: notifApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  // 点击单条：标记已读 + 跳转
  const handleClick = (item: NotificationItem) => {
    if (!item.isRead) {
      notifApi.markRead(item.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
        queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
      })
    }
    setOpen(false)
    navigate(`/cases/${item.roomId}`)
  }

  const config = (type: NotificationItem['type']) => TYPE_CONFIG[type] ?? TYPE_CONFIG.NEW_COMMENT

  const dropdownContent = (
    <div className="notif-panel">
      {/* 头部 */}
      <div className="notif-header">
        <span className="notif-title">通知</span>
        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => readAll()}
            className="read-all-btn"
          >
            全部已读
          </Button>
        )}
      </div>
      <Divider style={{ margin: 0 }} />

      {/* 列表 */}
      <div className="notif-list-wrap">
        {isLoading ? (
          <div className="notif-loading"><Spin size="small" /></div>
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无通知"
            style={{ padding: '32px 0' }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => {
              const cfg = config(item.type)
              const name = item.fromUser?.name || '某用户'
              return (
                <List.Item
                  key={item.id}
                  className={`notif-item ${item.isRead ? 'read' : 'unread'}`}
                  onClick={() => handleClick(item)}
                >
                  <div className="notif-item-inner">
                    {/* 头像 + 类型角标 */}
                    <div className="notif-avatar-wrap">
                      <Avatar
                        src={item.fromUser?.avatar}
                        icon={!item.fromUser?.avatar && <UserOutlined />}
                        size={36}
                      />
                      <span className="notif-type-badge">{cfg.icon}</span>
                    </div>

                    {/* 文字 */}
                    <div className="notif-text">
                      <Typography.Text className="notif-content">
                        {cfg.text(name)}
                      </Typography.Text>
                      <Typography.Text type="secondary" className="notif-time">
                        {timeAgo(item.createdAt)}
                      </Typography.Text>
                    </div>

                    {/* 未读圆点 */}
                    {!item.isRead && <span className="unread-dot" />}
                  </div>
                </List.Item>
              )
            }}
          />
        )}
      </div>
    </div>
  )

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      placement="bottomRight"
    >
      <Badge count={unreadCount} overflowCount={99} offset={[-2, 2]} size="small">
        <Button
          type="text"
          icon={<BellOutlined />}
          className="header-icon-btn"
          title="通知"
        />
      </Badge>
    </Dropdown>
  )
}

export default NotificationDropdown
