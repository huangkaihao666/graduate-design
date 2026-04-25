import React from 'react'
import { Button, Tag, Avatar, Input, Divider, Skeleton, message, Typography, Progress } from 'antd'
import {
  ArrowLeftOutlined,
  UserOutlined,
  LikeOutlined,
  LikeFilled,
  MessageOutlined,
  SendOutlined,
  EyeOutlined,
  CalendarOutlined,
  FireOutlined,
  TrophyOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store'
import * as roomApi from '@/api/rooms'
import * as usersApi from '@/api/users'
import './CaseDetail.less'

// ─── @提及高亮渲染 ───────────────────────────────────────────────────────────
const ReplyContent: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(@[\u4e00-\u9fa5a-zA-Z0-9_·]+)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="mention-highlight">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  )
}

// ─── 单条回复 ──────────────────────────────────────────────────────────────────
interface ReplyItem {
  id: number
  content: string
  likeCount: number
  liked: boolean
  createdAt: string
  sender?: { id: number; name: string; avatar?: string } | null
}

interface ReplyRowProps {
  reply: ReplyItem
  roomId: number
  onReply: (id: number, name: string) => void
}

const ReplyRow: React.FC<ReplyRowProps> = ({ reply, roomId, onReply }) => {
  const queryClient = useQueryClient()
  const [localLiked, setLocalLiked] = React.useState(reply.liked)
  const [localCount, setLocalCount] = React.useState(reply.likeCount)

  const { mutate: toggleLike } = useMutation({
    mutationFn: (currentLiked: boolean) =>
      currentLiked
        ? roomApi.unlikeComment(roomId, reply.id)
        : roomApi.likeComment(roomId, reply.id),
    onSuccess: (data: any) => {
      setLocalLiked(data.liked)
      setLocalCount(data.likeCount)
    },
    onError: () => {
      setLocalLiked(reply.liked)
      setLocalCount(reply.likeCount)
      queryClient.invalidateQueries({ queryKey: ['comments'] })
    },
  })

  return (
    <div className="reply-row">
      <Avatar
        src={reply.sender?.avatar}
        icon={!reply.sender?.avatar && <UserOutlined />}
        size={22}
        className="reply-avatar"
      />
      <div className="reply-body">
        <span className="reply-author">{reply.sender?.name || '匿名用户'}</span>
        <span className="reply-text">
          {' '}
          <ReplyContent text={reply.content} />
        </span>
        <div className="reply-meta">
          <span className="reply-time">
            {new Date(reply.createdAt).toLocaleString('zh-CN', {
              month: 'numeric',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
          <button
            className={`like-btn ${localLiked ? 'liked' : ''}`}
            onClick={() => {
              const snapshot = localLiked
              setLocalLiked(!snapshot)
              setLocalCount((c) => (snapshot ? c - 1 : c + 1))
              toggleLike(snapshot)
            }}
          >
            {localLiked ? <LikeFilled /> : <LikeOutlined />}
            {localCount > 0 && <span>{localCount}</span>}
          </button>
          <button
            className="reply-btn"
            onClick={() => onReply(reply.id, reply.sender?.name || '匿名用户')}
          >
            回复
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 单条顶层评论 ────────────────────────────────────────────────────────────
interface CommentItem extends ReplyItem {
  replies?: ReplyItem[]
}

interface CommentRowProps {
  comment: CommentItem
  roomId: number
  currentUserId?: number
  onRefresh: () => void
}

const REPLY_PREVIEW = 2

const CommentRow: React.FC<CommentRowProps> = ({ comment, roomId, onRefresh }) => {
  const queryClient = useQueryClient()
  const [localLiked, setLocalLiked] = React.useState(comment.liked)
  const [localCount, setLocalCount] = React.useState(comment.likeCount)
  const [showReplyInput, setShowReplyInput] = React.useState(false)
  const [replyTarget, setReplyTarget] = React.useState<{ id: number; name: string } | null>(null)
  const [replyText, setReplyText] = React.useState('')
  const [expanded, setExpanded] = React.useState(false)

  const replies = comment.replies || []
  const hasMore = replies.length > REPLY_PREVIEW
  const displayedReplies = expanded ? replies : replies.slice(0, REPLY_PREVIEW)

  const { mutate: toggleLike } = useMutation({
    mutationFn: (currentLiked: boolean) =>
      currentLiked
        ? roomApi.unlikeComment(roomId, comment.id)
        : roomApi.likeComment(roomId, comment.id),
    onSuccess: (data: any) => {
      setLocalLiked(data.liked)
      setLocalCount(data.likeCount)
    },
    onError: () => {
      setLocalLiked(comment.liked)
      setLocalCount(comment.likeCount)
      queryClient.invalidateQueries({ queryKey: ['comments'] })
    },
  })

  const { mutate: sendReply, isPending: sendingReply } = useMutation({
    mutationFn: (content: string) =>
      roomApi.addComment(
        roomId,
        content,
        replyTarget?.id !== comment.id ? replyTarget?.id ?? comment.id : comment.id,
      ),
    onSuccess: () => {
      message.success('回复已发布')
      setReplyText('')
      setShowReplyInput(false)
      setReplyTarget(null)
      setExpanded(true)
      onRefresh()
    },
    onError: () => message.error('回复失败，请重试'),
  })

  const handleReply = (targetId: number, targetName: string) => {
    setReplyTarget({ id: targetId, name: targetName })
    setShowReplyInput(true)
    setReplyText('')
  }

  const handleSend = () => {
    const text = replyText.trim()
    if (!text) return
    const finalContent =
      replyTarget && replyTarget.id !== comment.id
        ? `@${replyTarget.name} ${text}`
        : text
    sendReply(finalContent)
  }

  return (
    <div className="comment-item">
      <Avatar
        src={comment.sender?.avatar}
        icon={!comment.sender?.avatar && <UserOutlined />}
        size={40}
        className="comment-avatar"
      />
      <div className="comment-body">
        <div className="comment-header">
          <span className="comment-author">{comment.sender?.name || '匿名用户'}</span>
          <span className="comment-time">
            {new Date(comment.createdAt).toLocaleString('zh-CN', {
              month: 'numeric',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>

        <Typography.Paragraph className="comment-text">
          {comment.content}
        </Typography.Paragraph>

        <div className="comment-actions">
          <button
            className={`like-btn ${localLiked ? 'liked' : ''}`}
            onClick={() => {
              const snapshot = localLiked
              setLocalLiked(!snapshot)
              setLocalCount((c) => (snapshot ? c - 1 : c + 1))
              toggleLike(snapshot)
            }}
          >
            {localLiked ? <LikeFilled /> : <LikeOutlined />}
            <span>{localCount > 0 ? localCount : '赞'}</span>
          </button>
          <button
            className="reply-btn"
            onClick={() => {
              handleReply(comment.id, comment.sender?.name || '匿名用户')
            }}
          >
            <MessageOutlined />
            <span>{replies.length > 0 ? `${replies.length} 回复` : '回复'}</span>
          </button>
        </div>

        {replies.length > 0 && (
          <div className="replies-wrapper">
            {displayedReplies.map((r) => (
              <ReplyRow
                key={r.id}
                reply={r}
                roomId={roomId}
                onReply={handleReply}
              />
            ))}
            {hasMore && (
              <button
                className="expand-btn"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded
                  ? '收起回复 ▴'
                  : `展开全部 ${replies.length} 条回复 ▾`}
              </button>
            )}
          </div>
        )}

        {showReplyInput && (
          <div className="inline-reply">
            <Input
              autoFocus
              size="small"
              placeholder={
                replyTarget && replyTarget.id !== comment.id
                  ? `回复 @${replyTarget.name}...`
                  : `回复 @${comment.sender?.name || '匿名用户'}...`
              }
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onPressEnter={handleSend}
              suffix={
                <Button
                  type="text"
                  size="small"
                  icon={<SendOutlined />}
                  loading={sendingReply}
                  disabled={!replyText.trim()}
                  onClick={handleSend}
                  className="send-inline-btn"
                />
              }
            />
            <Button
              type="text"
              size="small"
              className="cancel-reply-btn"
              onClick={() => {
                setShowReplyInput(false)
                setReplyTarget(null)
                setReplyText('')
              }}
            >
              取消
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Agent 颜色配置 ───────────────────────────────────────────────────────────
const AGENT_THEMES = [
  { gradient: 'linear-gradient(135deg, #F97316, #FB923C)', bg: '#FFF7ED', color: '#F97316', emoji: '⚔️' },
  { gradient: 'linear-gradient(135deg, #10B981, #34D399)', bg: '#ECFDF5', color: '#10B981', emoji: '🌿' },
  { gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)', bg: '#EFF6FF', color: '#3B82F6', emoji: '⚖️' },
]

// ─── 状态配置 ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  LIVE: { label: '进行中', color: '#10B981', bg: 'rgba(16,185,129,0.12)', pulse: true },
  WAITING: { label: '即将开始', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', pulse: false },
  CLOSED: { label: '已结束', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', pulse: false },
}

// ─── 主页面 ─────────────────────────────────────────────────────────────────
const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [comment, setComment] = React.useState('')
  const [commentPage, setCommentPage] = React.useState(1)

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['case-detail', id],
    queryFn: () => roomApi.getRoomById(parseInt(id || '0')),
    enabled: !!id,
    staleTime: 0,
  })

  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', id, commentPage],
    queryFn: () => roomApi.getComments(parseInt(id || '0'), commentPage),
    enabled: !!id,
  })

  const ownerId = (room as any)?.owner?.id ?? (room as any)?.data?.owner?.id
  const isOwnCase = currentUser?.id === ownerId

  const { data: followStatus } = useQuery({
    queryKey: ['is-following', ownerId],
    queryFn: () => usersApi.isFollowing(ownerId!),
    enabled: !!ownerId && !!currentUser && !isOwnCase,
  })

  const followMutation = useMutation({
    mutationFn: () =>
      (followStatus as any)?.following
        ? usersApi.unfollowUser(ownerId!)
        : usersApi.followUser(ownerId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['is-following', ownerId] })
      void queryClient.invalidateQueries({ queryKey: ['follow-counts', currentUser?.id] })
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  const refreshComments = () => {
    queryClient.removeQueries({ queryKey: ['comments', id] })
    queryClient.invalidateQueries({ queryKey: ['case-detail', id] })
    setCommentPage(1)
  }

  const { mutate: submitComment, isPending: submitting } = useMutation({
    mutationFn: (content: string) =>
      roomApi.addComment(parseInt(id || '0'), content),
    onSuccess: () => {
      message.success('评论已发布')
      setComment('')
      refreshComments()
    },
    onError: () => {
      message.error('评论发布失败，请重试')
    },
  })

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: roomApi.getAllAgents,
    staleTime: Infinity,
  })

  const agents: Record<string, any> = {}
  if (agentsData && Array.isArray(agentsData)) {
    ;(agentsData as any[]).forEach((agent: any) => {
      agents[agent.id] = agent
    })
  }

  const commentsList: CommentItem[] = (commentsData as any)?.data || []
  const commentsPagination = (commentsData as any)?.pagination || {}

  const handleSubmitComment = () => {
    if (!comment.trim()) {
      message.warning('请输入评论')
      return
    }
    submitComment(comment.trim())
  }

  // ── 加载骨架屏 ──────────────────────────────────────────────────────────────
  if (roomLoading) {
    return (
      <div className="case-detail-page">
        <div className="cd-back-row">
          <Skeleton.Button active size="small" style={{ width: 80 }} />
        </div>
        <div className="cd-hero-skeleton">
          <Skeleton.Image active style={{ width: '100%', height: 280 }} />
        </div>
        <div className="cd-body">
          <div className="cd-main">
            <Skeleton active title={{ width: '70%' }} paragraph={{ rows: 4 }} />
          </div>
          <div className="cd-sidebar">
            <Skeleton active paragraph={{ rows: 5 }} />
          </div>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="case-detail-page">
        <div className="cd-empty-state">
          <div className="cd-empty-icon">🔍</div>
          <h3>案件不存在或已被删除</h3>
          <p>该案件可能已被移除或您没有访问权限</p>
          <Button type="primary" onClick={() => navigate('/cases')} className="cd-empty-btn">
            返回案件列表
          </Button>
        </div>
      </div>
    )
  }

  const caseData = room.data || room
  const statusCfg = STATUS_CONFIG[caseData.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.CLOSED
  const caseAgents = (caseData.agents || []) as string[]

  return (
    <div className="case-detail-page">
      {/* 返回按钮 */}
      <div className="cd-back-row">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/cases')}
          className="cd-back-btn"
        >
          返回列表
        </Button>
      </div>

      {/* Hero 区域 */}
      <div className="cd-hero">
        {caseData.image ? (
          <div className="cd-hero-img-wrap">
            <img src={caseData.image} alt={caseData.title} className="cd-hero-img" />
            <div className="cd-hero-img-overlay" />
          </div>
        ) : (
          <div className="cd-hero-placeholder">
            <div className="cd-hero-orb orb-1" />
            <div className="cd-hero-orb orb-2" />
            <div className="cd-hero-grid" />
            <div className="cd-hero-placeholder-icon">⚖️</div>
          </div>
        )}

        {/* Hero 信息覆盖层 */}
        <div className="cd-hero-content">
          <div className="cd-status-badge" style={{ background: statusCfg.bg, color: statusCfg.color }}>
            {statusCfg.pulse && <span className="cd-live-dot" />}
            {statusCfg.label}
          </div>
          <h1 className="cd-title">{caseData.title}</h1>
          <div className="cd-meta-row">
            {caseData.owner && (
              <div className="cd-owner">
                <Avatar
                  src={caseData.owner.avatar}
                  icon={!caseData.owner.avatar && <UserOutlined />}
                  size={24}
                  className="cd-owner-avatar"
                />
                <span className="cd-owner-name">{caseData.owner.name}</span>
                {currentUser && !isOwnCase && (
                  <Button
                    size="small"
                    type={(followStatus as any)?.following ? 'default' : 'primary'}
                    icon={(followStatus as any)?.following ? <UserDeleteOutlined /> : <UserAddOutlined />}
                    loading={followMutation.isPending}
                    onClick={() => followMutation.mutate()}
                    className="cd-follow-btn"
                  >
                    {(followStatus as any)?.following ? '取消关注' : '关注'}
                  </Button>
                )}
              </div>
            )}
            <div className="cd-stats">
              <span className="cd-stat-item">
                <EyeOutlined /> {caseData.viewCount || 0}
              </span>
              <span className="cd-stat-item">
                <MessageOutlined /> {caseData.commentCount || 0}
              </span>
              <span className="cd-stat-item">
                <CalendarOutlined />{' '}
                {new Date(caseData.createdAt).toLocaleDateString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
          <div className="cd-hero-actions">
            <Button
              type="primary"
              size="large"
              onClick={() => navigate(`/debate/${caseData.id}`)}
              className="cd-btn-debate"
            >
              🎭 进入辩论室
            </Button>
            {caseData.status === 'CLOSED' && (
              <Button
                size="large"
                onClick={() => navigate(`/rooms/${caseData.id}/report`)}
                className="cd-btn-report"
              >
                📊 查看结案报告
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 主体两栏布局 */}
      <div className="cd-body">
        {/* 左主栏 */}
        <div className="cd-main">
          {/* 案件描述 */}
          <section className="cd-section">
            <div className="cd-section-header">
              <span className="cd-section-icon">📋</span>
              <h2 className="cd-section-title">案件详情</h2>
            </div>
            <div className="cd-description">{caseData.content}</div>
          </section>

          {/* 评论区 */}
          <section className="cd-section">
            <div className="cd-section-header">
              <span className="cd-section-icon">💬</span>
              <h2 className="cd-section-title">
                讨论区
                <Tag className="cd-count-tag">{caseData.commentCount || 0}</Tag>
              </h2>
            </div>

            {/* 发表评论 */}
            <div className="cd-comment-input-box">
              <Input.TextArea
                rows={3}
                placeholder="说说你的看法... (Ctrl+Enter 发送)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onPressEnter={(e) => {
                  if (e.ctrlKey || e.metaKey) handleSubmitComment()
                }}
                className="cd-comment-textarea"
              />
              <div className="cd-comment-footer">
                <span className="cd-comment-hint">Ctrl+Enter 快速发送</span>
                <Button
                  type="primary"
                  onClick={handleSubmitComment}
                  loading={submitting}
                  icon={<SendOutlined />}
                  className="cd-submit-btn"
                >
                  发表评论
                </Button>
              </div>
            </div>

            <Divider className="cd-divider" />

            {/* 评论列表 */}
            {commentsLoading ? (
              <div className="cd-comments-skeleton">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="cd-skeleton-row">
                    <Skeleton.Avatar active size={40} />
                    <div style={{ flex: 1 }}>
                      <Skeleton active title={{ width: '25%' }} paragraph={{ rows: 2, width: ['65%', '40%'] }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : commentsList.length === 0 ? (
              <div className="cd-empty-comments">
                <div className="cd-empty-comment-icon">💬</div>
                <p>暂无评论，成为第一个发言的人吧！</p>
              </div>
            ) : (
              <div className="cd-comments-list">
                {commentsList.map((item) => (
                  <CommentRow
                    key={item.id}
                    comment={item}
                    roomId={parseInt(id || '0')}
                    onRefresh={refreshComments}
                  />
                ))}

                {commentsPagination.totalPages > 1 && (
                  <div className="cd-pagination">
                    <Button
                      size="small"
                      disabled={commentPage === 1}
                      onClick={() => setCommentPage((p) => p - 1)}
                      className="cd-page-btn"
                    >
                      上一页
                    </Button>
                    <span className="cd-page-info">
                      {commentPage} / {commentsPagination.totalPages}
                    </span>
                    <Button
                      size="small"
                      disabled={commentPage >= commentsPagination.totalPages}
                      onClick={() => setCommentPage((p) => p + 1)}
                      className="cd-page-btn"
                    >
                      下一页
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* 右侧栏 */}
        <aside className="cd-sidebar">
          {/* 快速操作 */}
          <div className="cd-widget">
            <div className="cd-widget-header">
              <FireOutlined className="cd-widget-icon" />
              <span>快速操作</span>
            </div>
            <div className="cd-quick-actions">
              <Button
                type="primary"
                block
                size="large"
                onClick={() => navigate(`/debate/${caseData.id}`)}
                className="cd-btn-debate-sidebar"
              >
                🎭 进入辩论室
              </Button>
              {caseData.status === 'CLOSED' && (
                <Button
                  block
                  onClick={() => navigate(`/rooms/${caseData.id}/report`)}
                  className="cd-btn-report-sidebar"
                >
                  📊 查看结案报告
                </Button>
              )}
            </div>
          </div>

          {/* 案件信息 */}
          <div className="cd-widget">
            <div className="cd-widget-header">
              <span className="cd-widget-emoji">📊</span>
              <span>案件信息</span>
            </div>
            <div className="cd-info-list">
              <div className="cd-info-row">
                <span className="cd-info-label">状态</span>
                <span
                  className="cd-info-status"
                  style={{ background: statusCfg.bg, color: statusCfg.color }}
                >
                  {statusCfg.pulse && <span className="cd-live-dot-sm" />}
                  {statusCfg.label}
                </span>
              </div>
              <div className="cd-info-row">
                <span className="cd-info-label">浏览量</span>
                <span className="cd-info-value">
                  <EyeOutlined style={{ marginRight: 4 }} />
                  {caseData.viewCount || 0}
                </span>
              </div>
              <div className="cd-info-row">
                <span className="cd-info-label">评论数</span>
                <span className="cd-info-value">
                  <MessageOutlined style={{ marginRight: 4 }} />
                  {caseData.commentCount || 0}
                </span>
              </div>
              <div className="cd-info-row">
                <span className="cd-info-label">发布时间</span>
                <span className="cd-info-value">
                  {new Date(caseData.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              {caseData.owner && (
                <div className="cd-info-row">
                  <span className="cd-info-label">发布者</span>
                  <div className="cd-info-owner">
                    <Avatar
                      src={caseData.owner.avatar}
                      icon={!caseData.owner.avatar && <UserOutlined />}
                      size={20}
                    />
                    <span>{caseData.owner.name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI 陪审团 */}
          {caseAgents.length > 0 && (
            <div className="cd-widget">
              <div className="cd-widget-header">
                <TrophyOutlined className="cd-widget-icon" />
                <span>AI 陪审团</span>
              </div>
              <div className="cd-agents-list">
                {caseAgents.map((agentId: string, idx: number) => {
                  const agent = agents[agentId]
                  const theme = AGENT_THEMES[idx % AGENT_THEMES.length]
                  return (
                    <div key={agentId} className="cd-agent-item">
                      <div
                        className="cd-agent-avatar"
                        style={{ background: theme.gradient }}
                      >
                        {agent?.avatar ? (
                          <img src={agent.avatar} alt={agent.name} />
                        ) : (
                          <span className="cd-agent-emoji">{theme.emoji}</span>
                        )}
                      </div>
                      <div className="cd-agent-info">
                        <div className="cd-agent-name">{agent?.name || agentId}</div>
                        {agent?.personality && (
                          <div className="cd-agent-personality">{agent.personality}</div>
                        )}
                        {agent?.winRate !== undefined && (
                          <div className="cd-agent-win-rate">
                            <Progress
                              percent={agent.winRate}
                              size="small"
                              strokeColor={theme.color}
                              trailColor="var(--border-color)"
                              format={(p) => (
                                <span style={{ fontSize: 10, color: theme.color, fontWeight: 700 }}>
                                  {p}%
                                </span>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default CaseDetail
