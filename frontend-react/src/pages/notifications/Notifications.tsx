import React, { useState } from 'react'
import { Avatar, Badge, Button, Empty, Pagination, Skeleton } from 'antd'
import {
  BellOutlined,
  CheckOutlined,
  LikeFilled,
  MessageFilled,
  TeamOutlined,
  TrophyFilled,
  UserOutlined,
  RightOutlined,
  StarFilled,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import * as notifApi from '@/api/notifications'
import type { NotificationItem, NotificationType } from '@/api/notifications'
import './Notifications.less'

// ─── 类型配置 ────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; color: string; bg: string; text: (name: string, item: NotificationItem) => string; sub: string }
> = {
  LIKE_COMMENT: {
    icon: <LikeFilled />,
    color: '#EF4444',
    bg: '#FEF2F2',
    text: (name, item) => `${name} 赞了你在「${item.room?.title ?? '某案件'}」中的评论`,
    sub: '互动',
  },
  NEW_COMMENT: {
    icon: <MessageFilled />,
    color: '#6366F1',
    bg: '#EEF2FF',
    text: (name, item) => `${name} 评论了你的案件「${item.room?.title ?? ''}」`,
    sub: '互动',
  },
  NEW_REPLY: {
    icon: <MessageFilled />,
    color: '#10B981',
    bg: '#ECFDF5',
    text: (name, item) => `${name} 回复了你在「${item.room?.title ?? '某案件'}」中的评论`,
    sub: '互动',
  },
  LIKE_ROOM: {
    icon: <LikeFilled />,
    color: '#EF4444',
    bg: '#FEF2F2',
    text: (name, item) => `${name} 点赞了你的案件「${item.room?.title ?? ''}」`,
    sub: '互动',
  },
  FAVORITE_ROOM: {
    icon: <StarFilled />,
    color: '#F59E0B',
    bg: '#FFFBEB',
    text: (name, item) => `${name} 收藏了你的案件「${item.room?.title ?? ''}」`,
    sub: '互动',
  },
  FOLLOW_NEW_ROOM: {
    icon: <TeamOutlined />,
    color: '#3B82F6',
    bg: '#EFF6FF',
    text: (name, item) => `${name} 发起了新辩论「${item.room?.title ?? ''}」`,
    sub: '关注',
  },
  ACHIEVEMENT_UNLOCKED: {
    icon: <TrophyFilled />,
    color: '#F59E0B',
    bg: '#FFFBEB',
    text: () => '恭喜解锁新成就！点击查看',
    sub: '成就',
  },
}

const TABS = [
  { key: 'ALL',         label: '全部',    icon: <BellOutlined />,   types: undefined },
  { key: 'INTERACTION', label: '互动',    icon: <LikeFilled />,     types: 'LIKE_COMMENT,NEW_COMMENT,NEW_REPLY,LIKE_ROOM,FAVORITE_ROOM' },
  { key: 'FOLLOW',      label: '关注动态', icon: <TeamOutlined />,   types: 'FOLLOW_NEW_ROOM' },
  { key: 'ACHIEVEMENT', label: '成就',    icon: <TrophyFilled />,   types: 'ACHIEVEMENT_UNLOCKED' },
]

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

// ─── 主组件 ──────────────────────────────────────────────────

const Notifications: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('ALL')
  const [page, setPage] = useState(1)

  const currentTab = TABS.find((t) => t.key === activeTab)!

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-page', activeTab, page],
    queryFn: () =>
      notifApi.getNotifications({ type: currentTab.types, page, pageSize: 20 }),
    staleTime: 0,
  })

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: notifApi.getUnreadCount,
    refetchInterval: 30000,
  })
  const unreadCount = (unreadData as any)?.count ?? 0

  const readAllMutation = useMutation({
    mutationFn: notifApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const handleClick = (item: NotificationItem) => {
    if (!item.isRead) {
      notifApi.markRead(item.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['notifications-page'] })
        queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      })
    }
    if (item.type === 'ACHIEVEMENT_UNLOCKED') navigate('/achievements')
    else if (item.roomId) navigate(`/cases/${item.roomId}`)
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    setPage(1)
  }

  const notifications: NotificationItem[] = data?.data ?? []
  const total = data?.total ?? 0

  return (
    <div className="nm-page">
      {/* ── Hero Banner ── */}
      <div className="nm-hero">
        <div className="nm-hero-bg-orb nm-orb-1" />
        <div className="nm-hero-bg-orb nm-orb-2" />
        <div className="nm-hero-grid" />
        <div className="nm-hero-content">
          <div className="nm-hero-left">
            <div className="nm-hero-icon-wrap">
              <BellOutlined className="nm-hero-bell" />
              {unreadCount > 0 && <span className="nm-hero-pulse" />}
            </div>
            <div>
              <h1 className="nm-hero-title">消息中心</h1>
              <p className="nm-hero-sub">
                {unreadCount > 0
                  ? `你有 ${unreadCount} 条未读消息`
                  : '所有消息已读，保持专注 ✦'}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              className="nm-hero-readall-btn"
              icon={<CheckOutlined />}
              loading={readAllMutation.isPending}
              onClick={() => readAllMutation.mutate()}
            >
              全部已读
            </Button>
          )}
        </div>
      </div>

      {/* ── 主体：左侧分类 + 右侧列表 ── */}
      <div className="nm-body">
        {/* 左侧竖向分类导航 */}
        <aside className="nm-sidebar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`nm-tab-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              <span className="nm-tab-icon">{tab.icon}</span>
              <span className="nm-tab-label">{tab.label}</span>
              {activeTab === tab.key && <RightOutlined className="nm-tab-arrow" />}
            </button>
          ))}
        </aside>

        {/* 右侧列表 */}
        <div className="nm-list-area">
          {isLoading ? (
            <div className="nm-skeletons">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="nm-skeleton-item">
                  <Skeleton avatar={{ size: 48 }} active paragraph={{ rows: 1 }} />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="nm-empty">
              <div className="nm-empty-icon">
                {activeTab === 'ACHIEVEMENT' ? '🏆' :
                 activeTab === 'FOLLOW' ? '👥' :
                 activeTab === 'INTERACTION' ? '💬' : '🔔'}
              </div>
              <div className="nm-empty-title">暂无消息</div>
              <div className="nm-empty-sub">
                {activeTab === 'ACHIEVEMENT' ? '完成任务即可解锁成就' :
                 activeTab === 'FOLLOW' ? '关注用户后会在这里看到他们的动态' :
                 activeTab === 'INTERACTION' ? '当有人与你互动时会出现在这里' :
                 '你已经看完所有消息了'}
              </div>
            </div>
          ) : (
            <>
              <div className="nm-list">
                {notifications.map((item, idx) => {
                  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.NEW_COMMENT
                  const name = item.fromUser?.name || '某用户'
                  return (
                    <div
                      key={item.id}
                      className={`nm-item ${item.isRead ? 'nm-item-read' : 'nm-item-unread'}`}
                      onClick={() => handleClick(item)}
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      {/* 未读左侧条 */}
                      {!item.isRead && <div className="nm-item-bar" />}

                      {/* 头像区 */}
                      <div className="nm-item-avatar-wrap">
                        <Avatar
                          size={48}
                          src={item.fromUser?.avatar}
                          icon={<UserOutlined />}
                          className="nm-item-avatar"
                        />
                        <span
                          className="nm-item-type-badge"
                          style={{ background: cfg.color }}
                        >
                          {cfg.icon}
                        </span>
                      </div>

                      {/* 内容 */}
                      <div className="nm-item-content">
                        <div className="nm-item-text">{cfg.text(name, item)}</div>
                        <div className="nm-item-meta">
                          <span
                            className="nm-item-tag"
                            style={{ color: cfg.color, background: cfg.bg }}
                          >
                            {cfg.sub}
                          </span>
                          <span className="nm-item-time">{timeAgo(item.createdAt)}</span>
                        </div>
                      </div>

                      {/* 右侧箭头 */}
                      <RightOutlined className="nm-item-arrow" />
                    </div>
                  )
                })}
              </div>

              {total > 20 && (
                <div className="nm-pagination">
                  <Pagination
                    current={page}
                    total={total}
                    pageSize={20}
                    onChange={(p) => setPage(p)}
                    showSizeChanger={false}
                    showTotal={(t) => `共 ${t} 条消息`}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Notifications
