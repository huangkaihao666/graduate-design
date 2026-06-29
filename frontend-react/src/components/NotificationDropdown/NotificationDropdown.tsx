import React from 'react'
import { Badge, Dropdown, Button, List, Avatar, Typography, Empty, Spin, Divider } from 'antd'
import { BellOutlined, UserOutlined, LikeFilled, MessageFilled, CheckOutlined, TeamOutlined, TrophyFilled, RightOutlined, StarFilled, RobotOutlined, NotificationOutlined, WarningFilled } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import * as notifApi from '@/api/notifications'
import type { NotificationItem } from '@/api/notifications'
import './NotificationDropdown.less'

// 通知类型对应的图标和文案
const TYPE_CONFIG: Record<string, { icon: React.ReactNode; text: (name: string, item: NotificationItem) => string }> = {
  LIKE_COMMENT: {
    icon: <LikeFilled style={{ color: '#ff4d4f' }} />,
    text: (name, item) => `${name} 赞了你在「${item.room?.title ?? '某案件'}」中的评论`,
  },
  NEW_COMMENT: {
    icon: <MessageFilled style={{ color: '#6366F1' }} />,
    text: (name, item) => `${name} 评论了「${item.room?.title ?? '你的案件'}」`,
  },
  NEW_REPLY: {
    icon: <MessageFilled style={{ color: '#52c41a' }} />,
    text: (name, item) => `${name} 回复了你在「${item.room?.title ?? '某案件'}」中的评论`,
  },
  LIKE_ROOM: {
    icon: <LikeFilled style={{ color: '#EF4444' }} />,
    text: (name, item) => `${name} 点赞了「${item.room?.title ?? '你的案件'}」`,
  },
  FAVORITE_ROOM: {
    icon: <StarFilled style={{ color: '#F59E0B' }} />,
    text: (name, item) => `${name} 收藏了「${item.room?.title ?? '你的案件'}」`,
  },
  FOLLOW_NEW_ROOM: {
    icon: <TeamOutlined style={{ color: '#3B82F6' }} />,
    text: (name, item) => `${name} 发起了「${item.room?.title ?? '新辩论'}」`,
  },
  ACHIEVEMENT_UNLOCKED: {
    icon: <TrophyFilled style={{ color: '#F59E0B' }} />,
    text: () => '恭喜解锁新成就！',
  },
  AGENT_APPROVED: {
    icon: <RobotOutlined style={{ color: '#10B981' }} />,
    text: () => '你的智能体申请已通过审核',
  },
  AGENT_REJECTED: {
    icon: <RobotOutlined style={{ color: '#EF4444' }} />,
    text: () => '你的智能体申请未通过审核',
  },
  ANNOUNCEMENT: {
    icon: <NotificationOutlined style={{ color: '#6366F1' }} />,
    text: () => '平台发布了新公告',
  },
  WARN_MESSAGE: {
    icon: <WarningFilled style={{ color: '#D97706' }} />,
    text: (_name: string, item: NotificationItem) => {
      const roomTitle = item.room?.title ? `「${item.room.title}」` : '某辩论室'
      return `你在 ${roomTitle} 中的弹幕被管理员标记为违规`
    },
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
    queryFn: () => notifApi.getNotifications(),
    enabled: open,
    staleTime: 0,
  })
  const notifications: NotificationItem[] = (notifData as any)?.data ?? []

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
    if (item.type === 'ACHIEVEMENT_UNLOCKED') navigate('/achievements')
    else if (item.type === 'AGENT_APPROVED' || item.type === 'AGENT_REJECTED') navigate('/create-agent')
    else if (item.type === 'ANNOUNCEMENT' || item.type === 'WARN_MESSAGE') { setOpen(false); navigate('/notifications') }
    else if (item.roomId) navigate(`/cases/${item.roomId}`)
  }

  const config = (type: NotificationItem['type']) => TYPE_CONFIG[type] ?? TYPE_CONFIG.NEW_COMMENT

  const dropdownContent = (
    <div className="notif-panel">
      {/* 头部 */}
      <div className="notif-header">
        <span className="notif-title">
          消息
          {unreadCount > 0 && <span className="notif-title-badge">{unreadCount}</span>}
        </span>
        <div className="notif-header-actions">
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
          <button
            className="notif-view-all-btn"
            onClick={() => { setOpen(false); navigate('/notifications') }}
          >
            消息中心 <RightOutlined style={{ fontSize: 10 }} />
          </button>
        </div>
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
                        {cfg.text(name, item)}
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
