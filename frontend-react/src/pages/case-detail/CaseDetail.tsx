import React from 'react'
import { Card, Button, Tag, Avatar, Space, Tabs, Input, Divider, Skeleton, message, Typography } from 'antd'
import { ArrowLeftOutlined, UserOutlined, LikeOutlined, LikeFilled, MessageOutlined, SendOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as roomApi from '@/api/rooms'
import './CaseDetail.less'

// ─── @提及高亮渲染 ───────────────────────────────────────────────────────────
const ReplyContent: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(@[\u4e00-\u9fa5a-zA-Z0-9_·]+)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} style={{ color: '#6366F1', fontWeight: 600 }}>
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

  // mutationFn 接收点击时的快照值，完全不依赖闭包
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
        size={24}
        className="reply-avatar"
      />
      <div className="reply-body">
        <span className="reply-author">{reply.sender?.name || '匿名用户'}</span>
        <span className="reply-text"> <ReplyContent text={reply.content} /></span>
        <div className="reply-meta">
          <span className="reply-time">
            {new Date(reply.createdAt).toLocaleString('zh-CN', {
              month: 'numeric', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
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

const REPLY_PREVIEW = 2 // 默认折叠时显示最新 N 条回复

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

  // 点赞顶层评论，mutationFn 接收点击时的快照值
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

  // 发送回复
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
      setExpanded(true) // 自动展开看到新回复
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
    // 如果有 replyTarget 且目标不是当前顶层评论本身，在内容前加 @提及
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
        {/* 作者 + 时间 */}
        <div className="comment-header">
          <span className="comment-author">{comment.sender?.name || '匿名用户'}</span>
          <span className="comment-time">
            {new Date(comment.createdAt).toLocaleString('zh-CN', {
              month: 'numeric', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
          </span>
        </div>

        {/* 评论内容 */}
        <Typography.Paragraph className="comment-text">
          {comment.content}
        </Typography.Paragraph>

        {/* 操作栏 */}
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

        {/* 折叠/展开回复区 */}
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
                  ? '收起回复'
                  : `展开全部 ${replies.length} 条回复 ▾`}
              </button>
            )}
          </div>
        )}

        {/* 内联回复输入框 */}
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

// ─── 主页面 ─────────────────────────────────────────────────────────────────
const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [comment, setComment] = React.useState('')
  const [commentPage, setCommentPage] = React.useState(1)

  // 获取案件详情（每次进入页面都重新请求，确保 viewCount 实时）
  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['case-detail', id],
    queryFn: () => roomApi.getRoomById(parseInt(id || '0')),
    enabled: !!id,
    staleTime: 0,
  })

  // 获取评论列表
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', id, commentPage],
    queryFn: () => roomApi.getComments(parseInt(id || '0'), commentPage),
    enabled: !!id,
  })

  const refreshComments = () => {
    queryClient.removeQueries({ queryKey: ['comments', id] })
    queryClient.invalidateQueries({ queryKey: ['case-detail', id] })
    setCommentPage(1)
  }

  // 发表顶层评论
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

  // 获取所有 Agents
  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: roomApi.getAllAgents,
    staleTime: Infinity,
  })

  const agents: Record<string, any> = {}
  if (agentsData && Array.isArray(agentsData)) {
    (agentsData as any[]).forEach((agent: any) => {
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

  if (roomLoading) {
    return (
      <div className="case-detail-page">
        <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 20, border: '1px solid #E2E8F0' }}>
          <Skeleton.Image active style={{ width: '100%', height: 220, borderRadius: 0 }} />
          <div style={{ padding: '24px' }}>
            <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 3, width: ['40%', '70%', '50%'] }} />
          </div>
        </div>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="case-detail-page">
        <Card>
          <p style={{ textAlign: 'center' }}>案件不存在或已被删除</p>
          <Button onClick={() => navigate('/cases')} style={{ display: 'block', margin: '0 auto' }}>
            返回列表
          </Button>
        </Card>
      </div>
    )
  }

  const caseData = room.data || room

  return (
    <div className="case-detail-page">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/cases')}
        className="back-button"
      >
        返回列表
      </Button>

      {/* 头部信息 */}
      <div className="case-header">
        {caseData.image && (
          <div className="case-banner">
            <img src={caseData.image} alt={caseData.title} />
          </div>
        )}

        <Card className="case-header-info">
          <div className="title-section">
            <h1>{caseData.title}</h1>
            <Tag color={
              caseData.status === 'LIVE'
                ? 'blue'
                : caseData.status === 'WAITING'
                ? 'orange'
                : 'default'
            }>
              {caseData.status === 'LIVE'
                ? '进行中'
                : caseData.status === 'WAITING'
                ? '即将开始'
                : '已结束'}
            </Tag>
          </div>

          <div className="meta-info">
            <Space separator="|" style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)' }}>
              <span>👀 {caseData.viewCount || 0} 人浏览</span>
              <span>💬 {caseData.commentCount || 0} 条评论</span>
              <span>📅 {new Date(caseData.createdAt).toLocaleDateString()}</span>
            </Space>
          </div>

          {caseData.owner && (
            <div className="owner-section">
              <Avatar src={caseData.owner.avatar} />
              <span>{caseData.owner.name}</span>
            </div>
          )}

          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <Space wrap>
              <Button type="primary" onClick={() => navigate(`/debate/${caseData.id}`)}>
                🎭 进入辩论室
              </Button>
              {caseData.status === 'CLOSED' && (
                <Button onClick={() => navigate(`/rooms/${caseData.id}/report`)}>
                  📊 查看结案报告
                </Button>
              )}
            </Space>
          </div>
        </Card>
      </div>

      {/* 主体内容 */}
      <div className="case-content">
        <Card title="案件描述" className="content-card">
          <div className="description">
            {caseData.content}
          </div>
        </Card>

        {/* 参与 Agents */}
        {caseData.agents && caseData.agents.length > 0 && (
          <Card title="参与讨论的 AI Agent" className="content-card">
            <Space wrap size="large">
              {caseData.agents.map((agentId: string) => {
                const agent = agents[agentId]
                return agent ? (
                  <div key={agentId} className="agent-card">
                    <Avatar src={agent.avatar} size={64} />
                    <div className="agent-info">
                      <p className="agent-name">{agent.name}</p>
                      <p className="agent-desc">{agent.personality}</p>
                      <p className="agent-stats">胜率: {agent.winRate || 0}%</p>
                    </div>
                  </div>
                ) : null
              })}
            </Space>
          </Card>
        )}

        {/* 讨论区 */}
        <Card title="讨论和评论" className="content-card">
          <Tabs
            items={[
              {
                key: 'comments',
                label: `评论 (${caseData.commentCount || 0})`,
                children: (
                  <div className="comments-section">
                    {/* 发表评论输入框 */}
                    <div className="comment-input-box">
                      <Input.TextArea
                        rows={3}
                        placeholder="说说你的看法... (Ctrl+Enter 发送)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onPressEnter={(e) => {
                          if (e.ctrlKey || e.metaKey) handleSubmitComment()
                        }}
                        className="main-comment-textarea"
                      />
                      <div className="comment-input-footer">
                        <span className="comment-hint">Ctrl+Enter 快速发送</span>
                        <Button
                          type="primary"
                          onClick={handleSubmitComment}
                          loading={submitting}
                          icon={<SendOutlined />}
                          className="submit-comment-btn"
                        >
                          发表评论
                        </Button>
                      </div>
                    </div>

                    <Divider style={{ margin: '16px 0' }} />

                    {/* 评论列表 */}
                    {commentsLoading ? (
                      <div className="comments-skeleton">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="comment-skeleton-row">
                            <Skeleton.Avatar active size={40} />
                            <div style={{ flex: 1 }}>
                              <Skeleton active title={{ width: '20%' }} paragraph={{ rows: 2, width: ['60%', '40%'] }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : commentsList.length === 0 ? (
                      <div className="empty-comments">
                        <div className="empty-icon">💬</div>
                        <p>暂无评论，成为第一个发言的人吧！</p>
                      </div>
                    ) : (
                      <div className="comments-list">
                        {commentsList.map((item) => (
                          <CommentRow
                            key={item.id}
                            comment={item}
                            roomId={parseInt(id || '0')}
                            onRefresh={refreshComments}
                          />
                        ))}

                        {/* 分页 */}
                        {commentsPagination.totalPages > 1 && (
                          <div className="comments-pagination">
                            <Button
                              size="small"
                              disabled={commentPage === 1}
                              onClick={() => setCommentPage((p) => p - 1)}
                            >
                              上一页
                            </Button>
                            <span className="page-info">
                              {commentPage} / {commentsPagination.totalPages}
                            </span>
                            <Button
                              size="small"
                              disabled={commentPage >= commentsPagination.totalPages}
                              onClick={() => setCommentPage((p) => p + 1)}
                            >
                              下一页
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'votes',
                label: '投票统计',
                children: (
                  <div className="votes-section">
                    <p>投票统计信息将在这里显示</p>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  )
}

export default CaseDetail
