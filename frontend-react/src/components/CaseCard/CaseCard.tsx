import React, { useState, useEffect, useRef } from 'react'
import { Avatar, Tag, message } from 'antd'
import { EyeOutlined, MessageOutlined, FireOutlined, LikeOutlined, LikeFilled, StarOutlined, StarFilled } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as roomApi from '@/api/rooms'
import type { Room } from '@/types/common'
import './CaseCard.less'

interface CaseCardProps {
  room: Room
  agents: Record<string, any>
}

// Agent 对应颜色 & emoji（根据 agentId 序号映射）
const AGENT_STYLES: Record<number, { color: string; bg: string; emoji: string }> = {
  0: { color: '#F97316', bg: '#FFF7ED', emoji: '⚡' },
  1: { color: '#10B981', bg: '#ECFDF5', emoji: '💚' },
  2: { color: '#3B82F6', bg: '#EFF6FF', emoji: '⚖️' },
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  WAITING: { label: '等待中',  cls: 'status-waiting' },
  LIVE:    { label: '进行中',  cls: 'status-live' },
  CLOSED:  { label: '已结束', cls: 'status-closed' },
}

// 占位背景图案（SVG 数据 URI），根据 id 选一种颜色
const PLACEHOLDER_COLORS = [
  'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
  'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
  'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
]

const PLACEHOLDER_ICONS = ['⚖️', '💬', '🤔', '💡', '🎯']

export const CaseCard: React.FC<CaseCardProps> = ({ room, agents }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // 用 ref 记录"本地覆盖值"，null 表示尚未交互，以 prop 为准
  const localLiked = useRef<boolean | null>(null)
  const localFavorited = useRef<boolean | null>(null)

  // room.id 变化（切换到不同 room 的卡片）时清除本地覆盖
  const prevRoomId = useRef(room.id)
  if (prevRoomId.current !== room.id) {
    prevRoomId.current = room.id
    localLiked.current = null
    localFavorited.current = null
  }

  const liked = localLiked.current !== null ? localLiked.current : (room.liked ?? false)
  const favorited = localFavorited.current !== null ? localFavorited.current : (room.favorited ?? false)

  const [likeCount, setLikeCount] = useState(room.likeCount ?? 0)
  const [favoriteCount, setFavoriteCount] = useState(room.favoriteCount ?? 0)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    setLikeCount(room.likeCount ?? 0)
    setFavoriteCount(room.favoriteCount ?? 0)
  }, [room.id, room.likeCount, room.favoriteCount])

  // wasLiked = 点击时的状态快照（点击前的值），用于 mutationFn 判断发 POST 还是 DELETE
  const likeMutation = useMutation({
    mutationFn: (wasLiked: boolean) =>
      wasLiked ? roomApi.unlikeRoom(room.id) : roomApi.likeRoom(room.id),
    onSuccess: (data: any) => {
      localLiked.current = data.liked
      setLikeCount(data.likeCount)
      forceUpdate((n) => n + 1)
      queryClient.invalidateQueries({ queryKey: ['my-likes'] })
    },
    onError: (_err, wasLiked: boolean) => {
      // 回滚：恢复点击前的状态
      localLiked.current = wasLiked
      setLikeCount((c) => wasLiked ? c + 1 : c - 1)
      forceUpdate((n) => n + 1)
      message.error('操作失败，请重试')
    },
  })

  const favoriteMutation = useMutation({
    mutationFn: (wasFavorited: boolean) =>
      wasFavorited ? roomApi.unfavoriteRoom(room.id) : roomApi.favoriteRoom(room.id),
    onSuccess: (data: any) => {
      localFavorited.current = data.favorited
      setFavoriteCount(data.favoriteCount)
      forceUpdate((n) => n + 1)
      queryClient.invalidateQueries({ queryKey: ['my-favorites'] })
    },
    onError: (_err, wasFavorited: boolean) => {
      localFavorited.current = wasFavorited
      setFavoriteCount((c) => wasFavorited ? c + 1 : c - 1)
      forceUpdate((n) => n + 1)
      message.error('操作失败，请重试')
    },
  })

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    const currentLiked = localLiked.current !== null ? localLiked.current : (room.liked ?? false)
    // 把当前状态快照作为 variable 传给 mutationFn，onMutate 之后修改 ref 不影响它
    localLiked.current = !currentLiked
    setLikeCount((c) => currentLiked ? c - 1 : c + 1)
    forceUpdate((n) => n + 1)
    likeMutation.mutate(currentLiked)
  }

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    const currentFavorited = localFavorited.current !== null ? localFavorited.current : (room.favorited ?? false)
    localFavorited.current = !currentFavorited
    setFavoriteCount((c) => currentFavorited ? c - 1 : c + 1)
    forceUpdate((n) => n + 1)
    favoriteMutation.mutate(currentFavorited)
  }

  const agentIds: string[] = room.agents || []
  const voteStats: Record<string, number> = room.votes || {}
  const totalVotes = Object.values(voteStats).reduce((s, v) => s + v, 0)

  // 双方票数（前半 vs 后半）
  const halfLen = Math.ceil(agentIds.length / 2)
  const firstVotes = agentIds.slice(0, halfLen).reduce((s, id) => s + (voteStats[id] || 0), 0)
  const secondVotes = agentIds.slice(halfLen).reduce((s, id) => s + (voteStats[id] || 0), 0)
  const firstPct = totalVotes > 0 ? (firstVotes / totalVotes) * 100 : 50
  const secondPct = totalVotes > 0 ? (secondVotes / totalVotes) * 100 : 50

  const statusCfg = STATUS_CONFIG[room.status] || { label: room.status, cls: 'status-closed' }
  const colorIdx = (room.id || 0) % PLACEHOLDER_COLORS.length

  const handleClick = () => {
    if (room.status === 'LIVE') {
      navigate(`/debate/${room.id}`)
    } else {
      navigate(`/cases/${room.id}`)
    }
  }

  return (
    <div className="case-card" onClick={handleClick}>
      {/* ── 顶部封面区 ── */}
      <div
        className="card-cover"
        style={room.image
          ? { backgroundImage: `url(${room.image})` }
          : { background: PLACEHOLDER_COLORS[colorIdx] }
        }
      >
        {!room.image && (
          <div className="card-cover-placeholder">
            <span className="placeholder-icon">{PLACEHOLDER_ICONS[colorIdx]}</span>
          </div>
        )}
        {/* 状态徽章 */}
        <div className={`card-status-badge ${statusCfg.cls}`}>
          {room.status === 'LIVE' && <span className="live-pulse" />}
          {statusCfg.label}
        </div>
        {/* 热度角标（若有 viewCount） */}
        {room.viewCount > 50 && (
          <div className="card-hot-badge">
            <FireOutlined />
            <span>热门</span>
          </div>
        )}
      </div>

      {/* ── 卡片主体 ── */}
      <div className="card-body">
        {/* 标题 */}
        <h3 className="card-title">{room.title}</h3>

        {/* 话题标签 */}
        {(room as any).tags?.length > 0 && (
          <div className="card-tags">
            {((room as any).tags as any[]).slice(0, 3).map((tag: any) => (
              <Tag
                key={tag.id}
                color={tag.color}
                className="card-tag"
              >
                {tag.name}
              </Tag>
            ))}
          </div>
        )}

        {/* 简介 */}
        <p className="card-desc">
          {(room.content || '').substring(0, 72)}{(room.content?.length || 0) > 72 ? '…' : ''}
        </p>

        {/* Agent 头像行 */}
        {agentIds.length > 0 && (
          <div className="card-agents">
            <div className="agent-avatars">
              {agentIds.slice(0, 3).map((agentId: string, idx: number) => {
                const agent = agents?.[agentId]
                const style = AGENT_STYLES[idx] || AGENT_STYLES[0]
                return (
                  <div
                    key={agentId}
                    className="agent-avatar-item"
                    title={agent?.name}
                    style={{ '--agent-color': style.color, '--agent-bg': style.bg } as React.CSSProperties}
                  >
                    {agent?.avatar
                      ? <Avatar src={agent.avatar} size={28} />
                      : <span className="agent-emoji">{style.emoji}</span>
                    }
                  </div>
                )
              })}
            </div>
            <span className="agent-label">AI 辩手团队</span>
          </div>
        )}

        {/* 投票进度条 */}
        <div className="card-vote-bar">
          <div className="vote-bar-track">
            <div
              className="vote-bar-left"
              style={{ width: `${firstPct}%` }}
            />
            <div
              className="vote-bar-right"
              style={{ width: `${secondPct}%` }}
            />
          </div>
          <div className="vote-bar-labels">
            <span className="vote-label-left">{firstVotes} 票</span>
            <span className="vote-total">{totalVotes} 总票</span>
            <span className="vote-label-right">{secondVotes} 票</span>
          </div>
        </div>
      </div>

      {/* ── 卡片底部 ── */}
      <div className="card-footer">
        <div className="card-owner">
          <Avatar src={room.owner?.avatar} size={22} className="owner-avatar" />
          <span className="owner-name">{room.owner?.name || '匿名用户'}</span>
        </div>
        <div className="card-meta">
          <span className="meta-item">
            <EyeOutlined />
            {room.viewCount || 0}
          </span>
          <span className="meta-item">
            <MessageOutlined />
            {room.commentCount || 0}
          </span>
          <span
            className={`meta-item meta-like ${liked ? 'meta-like--active' : ''}`}
            onClick={handleLike}
          >
            {liked ? <LikeFilled /> : <LikeOutlined />}
            {likeCount}
          </span>
          <span
            className={`meta-item meta-favorite ${favorited ? 'meta-favorite--active' : ''}`}
            onClick={handleFavorite}
          >
            {favorited ? <StarFilled /> : <StarOutlined />}
            {favoriteCount}
          </span>
        </div>
      </div>
    </div>
  )
}

export default CaseCard
