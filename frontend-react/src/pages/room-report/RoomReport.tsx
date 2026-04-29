import React, { useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Button, Collapse, Skeleton, Tag, message, Tooltip } from 'antd'
import ReactECharts from 'echarts-for-react'
import {
  ArrowLeftOutlined, UserOutlined,
  CalendarOutlined, LikeOutlined, LikeFilled, MessageOutlined,
  StarOutlined, StarFilled, HeartOutlined, BulbOutlined,
  TeamOutlined, ThunderboltOutlined, ShareAltOutlined, RetweetOutlined,
} from '@ant-design/icons'
import * as roomApi from '@/api/rooms'
import './RoomReport.less'

type Winner =
  | { type: 'NO_VOTES' }
  | { type: 'TIE'; topPercent?: number }
  | { type: 'WIN'; agentId: string; topPercent?: number }

const getRoundLabel = (round: number) =>
  round === 1 ? '阐述观点' : round === 2 ? '交叉反驳' : round === 3 ? '综合总结' : '辩论回顾'

const AGENT_COLORS = [
  { color: '#F97316', gradient: 'linear-gradient(135deg,#F97316,#FB923C)', bg: 'rgba(249,115,22,0.08)', soft: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.2)' },
  { color: '#10B981', gradient: 'linear-gradient(135deg,#10B981,#34D399)', bg: 'rgba(16,185,129,0.08)', soft: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)' },
  { color: '#6366F1', gradient: 'linear-gradient(135deg,#6366F1,#818CF8)', bg: 'rgba(99,102,241,0.08)', soft: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.2)' },
]
const getAgentTheme = (idx: number) => AGENT_COLORS[idx % AGENT_COLORS.length]

// ── 投票环形图 ────────────────────────────────────────────────
const VoteDonutChart: React.FC<{ agents: any[]; ranking: any[]; totalVotes: number }> = ({ agents, ranking, totalVotes }) => {
  if (totalVotes === 0 || agents.length === 0) return (
    <div className="rr-empty-chart"><span>🗳️</span><p>暂无投票记录</p></div>
  )
  const pieData = agents.map((a, idx) => {
    const r = ranking.find((r: any) => r.agentId === a.id)
    const theme = getAgentTheme(idx)
    return { name: a.name, value: r?.count || 0, percent: r?.percent || 0, itemStyle: { color: theme.color } }
  }).filter(d => d.value > 0)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e293b',
      borderColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      textStyle: { color: '#f1f5f9', fontSize: 13 },
      formatter: (p: any) => `<b style="color:${p.color}">${p.name}</b><br/>${p.value} 票 &nbsp;·&nbsp; <b>${p.data.percent}%</b>`,
    },
    series: [{
      type: 'pie',
      radius: ['56%', '84%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderWidth: 3, borderColor: 'transparent' },
      label: { show: true, position: 'outside', formatter: '{b}\n{d}%', fontSize: 12, fontWeight: 700, color: '#64748b', lineHeight: 18 },
      labelLine: { length: 8, length2: 12, smooth: true },
      emphasis: { scale: true, scaleSize: 6, itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,0,0,0.15)' } },
      animationType: 'scale', animationEasing: 'elasticOut', animationDuration: 1000,
      data: pieData,
    }],
  }
  return <ReactECharts option={option} style={{ height: 220, width: '100%' }} opts={{ renderer: 'svg' }} />
}

// ── 民意条形图 ────────────────────────────────────────────────
const OpinionBar: React.FC<{
  supportA: number; supportB: number; neutral: number
  agentAName: string; agentBName: string; agentAColor: string; agentBColor: string
}> = ({ supportA, supportB, neutral, agentAName, agentBName, agentAColor, agentBColor }) => {
  const total = supportA + supportB + neutral
  if (total === 0) return <div className="rr-empty-chart"><span>💬</span><p>暂无观众意见</p></div>
  const pA = Math.round((supportA / total) * 100)
  const pB = Math.round((supportB / total) * 100)
  const pN = 100 - pA - pB
  const bars = [
    { label: agentAName, value: supportA, pct: pA, color: agentAColor },
    { label: '中立', value: neutral, pct: pN, color: '#94a3b8' },
    { label: agentBName, value: supportB, pct: pB, color: agentBColor },
  ]
  return (
    <div className="rr-opinion-bars">
      {bars.map((b) => (
        <div key={b.label} className="rr-opinion-bar-row">
          <div className="rr-opinion-bar-meta">
            <span className="rr-opinion-bar-label" style={{ color: b.color }}>{b.label}</span>
            <span className="rr-opinion-bar-count">{b.value} 条 · <b style={{ color: b.color }}>{b.pct}%</b></span>
          </div>
          <div className="rr-opinion-bar-track">
            <div className="rr-opinion-bar-fill" style={{ width: `${b.pct}%`, background: b.color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export const RoomReport: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pageRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [roundsActiveKey, setRoundsActiveKey] = useState<string[] | undefined>(undefined)
  const [reasoningActiveKeys, setReasoningActiveKeys] = useState<Record<string, string[]> | undefined>(undefined)
  const [verdictReasoningKey, setVerdictReasoningKey] = useState<string[] | undefined>(undefined)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const roomId = Number(id || 0)

  const { data, isLoading } = useQuery({
    queryKey: ['room-report', roomId],
    queryFn: () => roomApi.getRoomReport(roomId),
    enabled: !!roomId,
  })
  const { data: interactionData } = useQuery({
    queryKey: ['room-interaction', roomId],
    queryFn: () => roomApi.getRoomInteractionStatus(roomId),
    enabled: !!roomId,
  })
  const interaction = (interactionData as any) || {}
  const [liked, setLiked] = useState<boolean | null>(null)
  const [likeCount, setLikeCount] = useState<number | null>(null)
  const [favorited, setFavorited] = useState<boolean | null>(null)
  const [favoriteCount, setFavoriteCount] = useState<number | null>(null)

  const displayLiked = liked !== null ? liked : (interaction.liked ?? false)
  const displayLikeCount = likeCount !== null ? likeCount : (interaction.likeCount ?? 0)
  const displayFavorited = favorited !== null ? favorited : (interaction.favorited ?? false)
  const displayFavoriteCount = favoriteCount !== null ? favoriteCount : (interaction.favoriteCount ?? 0)

  const likeMutation = useMutation({
    mutationFn: (w: boolean) => w ? roomApi.unlikeRoom(roomId) : roomApi.likeRoom(roomId),
    onSuccess: (d: any) => { setLiked(d.liked); setLikeCount(d.likeCount) },
    onError: (_e, w: boolean) => { setLiked(w); setLikeCount(c => c !== null ? (w ? c + 1 : c - 1) : null); message.error('操作失败') },
  })
  const favoriteMutation = useMutation({
    mutationFn: (w: boolean) => w ? roomApi.unfavoriteRoom(roomId) : roomApi.favoriteRoom(roomId),
    onSuccess: (d: any) => { setFavorited(d.favorited); setFavoriteCount(d.favoriteCount); queryClient.invalidateQueries({ queryKey: ['my-favorites'] }) },
    onError: (_e, w: boolean) => { setFavorited(w); setFavoriteCount(c => c !== null ? (w ? c + 1 : c - 1) : null); message.error('操作失败') },
  })

  const handleLike = () => { const s = displayLiked; setLiked(!s); setLikeCount(c => (c ?? interaction.likeCount ?? 0) + (s ? -1 : 1)); likeMutation.mutate(s) }
  const handleFavorite = () => { const s = displayFavorited; setFavorited(!s); setFavoriteCount(c => (c ?? interaction.favoriteCount ?? 0) + (s ? -1 : 1)); favoriteMutation.mutate(s) }
  const handleCopyLink = async () => { try { await navigator.clipboard.writeText(window.location.href); message.success('链接已复制') } catch { message.error('复制失败') } }

  const reDebateMutation = useMutation({
    mutationFn: () => roomApi.reDebateRoom(roomId),
    onSuccess: (d: any) => {
      const newId = d?.id || d?.data?.id
      message.success('已创建续辩辩论室，快去开始吧！')
      if (newId) navigate(`/debate/${newId}`)
    },
    onError: () => message.error('创建续辩失败，请重试'),
  })

  const report = (data as any) || null
  const room = report?.room
  const voteStats = report?.voteStats
  const opinionStats = report?.opinionStats || { total: 0, supportA: 0, supportB: 0, neutral: 0, topOpinions: [] }
  const debateMessages = Array.isArray(report?.debateMessages) ? report.debateMessages : []
  const agents = Array.isArray(room?.agents) ? room.agents : []

  const agentMap = useMemo(() => {
    const m: Record<string, any> = {}
    agents.forEach((a: any, idx: number) => { m[a.id] = { ...a, _theme: getAgentTheme(idx) } })
    return m
  }, [agents])

  const winner: Winner | null = voteStats?.winner || null

  const rounds = useMemo(() => {
    const byRound: Record<string, any[]> = {}
    debateMessages.forEach((m: any) => {
      const key = String(Number(m.roundNumber || 0))
      byRound[key] = byRound[key] || []
      byRound[key].push(m)
    })
    return Object.keys(byRound).sort((a, b) => Number(a) - Number(b)).map(k => ({ round: Number(k), items: byRound[k] }))
  }, [debateMessages])

  const keyPoints = useMemo(() => rounds.filter(r => r.round > 0).map(r => ({
    round: r.round, label: getRoundLabel(r.round),
    items: r.items.map((m: any) => {
      const agent = agentMap[m.agentId]
      if (!agent) return null
      const excerpt = (m.content || '').split(/[。！？\n]/)[0].trim().slice(0, 60)
      return {
        agent,
        excerpt: excerpt + (excerpt.length >= 60 ? '…' : ''),
        fullContent: m.content || '',   // 保留完整内容供弹窗展示
        roundLabel: getRoundLabel(r.round),
      }
    }).filter(Boolean),
  })).filter(r => r.items.length > 0), [rounds, agentMap])

  // 关键论点弹窗状态
  const [kpModal, setKpModal] = useState<{ agent: any; content: string; roundLabel: string } | null>(null)

  // ── Loading ──────────────────────────────────────────────────
  if (isLoading) return (
    <div className="rr-page">
      <div className="rr-navbar rr-navbar--scrolled">
        <Skeleton.Button active size="small" style={{ width: 100 }} />
        <Skeleton.Button active size="small" style={{ width: 200, marginLeft: 'auto' }} />
      </div>
      <div className="rr-hero-band">
        <div className="rr-hero-inner"><Skeleton active title={{ width: '55%' }} paragraph={{ rows: 2, width: ['70%', '40%'] }} /></div>
      </div>
      <div className="rr-content-zone"><Skeleton active paragraph={{ rows: 14 }} /></div>
    </div>
  )

  if (!report || !room) return (
    <div className="rr-page">
      <div className="rr-empty-state">
        <div className="rr-empty-icon">📭</div>
        <h3>报告不存在或无权限访问</h3>
        <p>该结案报告可能尚未生成，或您没有访问权限</p>
        <Button type="primary" onClick={() => navigate('/cases')} className="rr-empty-btn">返回话题列表</Button>
      </div>
    </div>
  )

  const finalAdviceRaw = report?.finalAdvice?.raw || null
  const ranking = Array.isArray(voteStats?.ranking) ? voteStats.ranking : []
  const winnerAgent = winner?.type === 'WIN' ? agentMap[(winner as any).agentId] : null
  const hasVotes = winner?.type !== 'NO_VOTES' && (voteStats?.totalVotes ?? 0) > 0
  const agentA = agents[0], agentB = agents[1]
  const agentATheme = agentA ? getAgentTheme(0) : null
  const agentBTheme = agentB ? getAgentTheme(1) : null

  const statusConfig = {
    CLOSED:  { label: '已结案', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    LIVE:    { label: '进行中', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    WAITING: { label: '待开始', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  }
  const statusCfg = statusConfig[room.status as keyof typeof statusConfig] || statusConfig.CLOSED

  return (
    <div className="rr-page" ref={pageRef}>

      {/* ══ Sticky Navbar ══ */}
      <nav className={`rr-navbar ${scrolled ? 'rr-navbar--scrolled' : ''}`}>
        <button className="rr-nav-back" onClick={() => navigate(`/debate/${room.id}`)}>
          <ArrowLeftOutlined />
          <span>返回辩论室</span>
        </button>
        <div className="rr-nav-title" style={{ opacity: scrolled ? 1 : 0 }}>
          {room.title}
        </div>
        <div className="rr-nav-actions">
          <Tooltip title={displayLiked ? '取消点赞' : '点赞'}>
            <button
              className={`rr-nav-btn ${displayLiked ? 'rr-nav-btn--active-like' : ''}`}
              onClick={handleLike}
            >
              {displayLiked ? <LikeFilled /> : <LikeOutlined />}
              {displayLikeCount > 0 && <span>{displayLikeCount}</span>}
            </button>
          </Tooltip>
          <Tooltip title={displayFavorited ? '取消收藏' : '收藏'}>
            <button
              className={`rr-nav-btn ${displayFavorited ? 'rr-nav-btn--active-fav' : ''}`}
              onClick={handleFavorite}
            >
              {displayFavorited ? <StarFilled /> : <StarOutlined />}
              {displayFavoriteCount > 0 && <span>{displayFavoriteCount}</span>}
            </button>
          </Tooltip>
          <Tooltip title="复制链接">
            <button className="rr-nav-btn" onClick={handleCopyLink}><ShareAltOutlined /></button>
          </Tooltip>
          {room?.status === 'CLOSED' && (
            <Tooltip title="对结论不满意？以相同设置重新发起一场辩论">
              <button
                className="rr-nav-btn rr-nav-btn--redebate"
                onClick={() => reDebateMutation.mutate()}
                disabled={reDebateMutation.isPending}
              >
                <RetweetOutlined />
                <span>{reDebateMutation.isPending ? '创建中…' : '发起续辩'}</span>
              </button>
            </Tooltip>
          )}
        </div>
      </nav>

      {/* ══ Hero Band（全宽深色背景） ══ */}
      <div className="rr-hero-band">
        <div className="rr-hero-inner">
          <div className="rr-hero-left">
            <div className="rr-hero-tags">
              <span className="rr-hero-tag">📊 结案报告</span>
              <span className="rr-hero-status" style={{ background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
            </div>
            <h1 className="rr-hero-title">{room.title}</h1>
            <div className="rr-hero-title-line" />
            <div className="rr-hero-meta">
              {room.owner && (
                <span className="rr-hero-meta-item">
                  <Avatar src={room.owner.avatar} icon={!room.owner.avatar && <UserOutlined />} size={16} />
                  {room.owner.name || room.owner.email || `用户${room.owner.id}`}
                </span>
              )}
              {room.createdAt && (
                <span className="rr-hero-meta-item"><CalendarOutlined />{new Date(room.createdAt).toLocaleDateString('zh-CN')}</span>
              )}
              <span className="rr-hero-meta-item"><LikeOutlined />{voteStats?.totalVotes ?? 0} 票</span>
              <span className="rr-hero-meta-item"><MessageOutlined />{debateMessages.length} 条发言</span>
              {opinionStats.total > 0 && <span className="rr-hero-meta-item"><TeamOutlined />{opinionStats.total} 条观众意见</span>}
            </div>
            {/* 情绪伙伴入口 */}
            <button
              className="rr-hero-counseling-btn"
              onClick={() => navigate(`/counseling?roomId=${room.id}&roomTitle=${encodeURIComponent(room.title || '')}`)}
            >
              <HeartOutlined />
              <span>辩论结束了，和 AI 情绪伙伴聊聊？</span>
              <span className="rr-hero-counseling-arrow">→</span>
            </button>
          </div>
          {/* Agent 卡片行 */}
          {agents.length > 0 && (
            <div className="rr-hero-agents">
              {agents.map((a: any, idx: number) => {
                const theme = getAgentTheme(idx)
                const rankItem = ranking.find((r: any) => r.agentId === a.id)
                const isWinner = winner?.type === 'WIN' && (winner as any).agentId === a.id
                return (
                  <div key={a.id} className={`rr-hero-agent-card ${isWinner ? 'rr-hero-agent-card--winner' : ''}`}
                    style={{ '--agent-color': theme.color, '--agent-border': theme.border } as React.CSSProperties}>
                    {isWinner && <span className="rr-hero-agent-crown">👑</span>}
                    <Avatar size={36} src={a.avatar} style={{ background: theme.gradient, flexShrink: 0 }} />
                    <div className="rr-hero-agent-info">
                      <span className="rr-hero-agent-name" style={{ color: theme.color }}>{a.name}</span>
                      {a.personality && <span className="rr-hero-agent-role">{a.personality}</span>}
                    </div>
                    <span className="rr-hero-agent-pct" style={{ color: theme.color }}>
                      {rankItem ? `${rankItem.percent}%` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ 内容区（全宽，内部 padding 控制） ══ */}
      <div className="rr-content-zone">

        {/* ── 核心数据三栏 ── */}
        <div className="rr-data-grid">

          {/* AI 综合建议 */}
          {finalAdviceRaw && (
            <div className="rr-data-card rr-data-card--verdict">
              <div className="rr-data-card-header">
                <span className="rr-data-card-dot" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} />
                <span className="rr-data-card-title">💡 AI 综合建议</span>
              </div>
              <div className="rr-verdict-body">
                <div className="rr-verdict-quote">"</div>
                <div className="rr-verdict-text">{finalAdviceRaw.content}</div>
              </div>
              {finalAdviceRaw.reasoning?.trim() && (
                <Collapse className="rr-collapse rr-collapse--flush" size="small"
                  {...(verdictReasoningKey !== undefined ? { activeKey: verdictReasoningKey } : {})}
                  onChange={k => setVerdictReasoningKey(Array.isArray(k) ? k : [k])}
                  items={[{ key: 'r', label: '📐 推理过程', children: <div className="rr-reasoning">{finalAdviceRaw.reasoning}</div> }]}
                />
              )}
            </div>
          )}

          {/* 投票分布 */}
          <div className="rr-data-card">
            <div className="rr-data-card-header">
              <span className="rr-data-card-dot" style={{ background: 'linear-gradient(135deg,#F59E0B,#FCD34D)' }} />
              <span className="rr-data-card-title">🏆 投票分布</span>
              <span className="rr-data-card-badge">{voteStats?.totalVotes ?? 0} 票</span>
            </div>
            <VoteDonutChart agents={agents} ranking={ranking} totalVotes={voteStats?.totalVotes ?? 0} />
            {hasVotes && winner?.type === 'WIN' && winnerAgent && (
              <div className="rr-winner-row" style={{ background: winnerAgent._theme?.soft, borderColor: winnerAgent._theme?.border }}>
                <span className="rr-winner-crown">👑</span>
                <Avatar size={22} src={winnerAgent.avatar} style={{ background: winnerAgent._theme?.gradient }} />
                <span style={{ color: winnerAgent._theme?.color, fontWeight: 700, flex: 1 }}>{winnerAgent.name}</span>
                <span style={{ color: winnerAgent._theme?.color, fontWeight: 900, fontSize: 16 }}>{(winner as any).topPercent}%</span>
              </div>
            )}
            {hasVotes && winner?.type === 'TIE' && (
              <div className="rr-winner-row rr-winner-row--tie"><span>🤝</span><span style={{ flex: 1 }}>势均力敌，平票</span></div>
            )}
          </div>

          {/* 观众意见 */}
          <div className="rr-data-card">
            <div className="rr-data-card-header">
              <span className="rr-data-card-dot" style={{ background: 'linear-gradient(135deg,#10B981,#34D399)' }} />
              <span className="rr-data-card-title"><TeamOutlined /> 观众意见</span>
              {opinionStats.total > 0 && <span className="rr-data-card-badge">{opinionStats.total} 条</span>}
            </div>
            <OpinionBar
              supportA={opinionStats.supportA} supportB={opinionStats.supportB} neutral={opinionStats.neutral}
              agentAName={agentA?.name || 'A方'} agentBName={agentB?.name || 'B方'}
              agentAColor={agentATheme?.color || '#F97316'} agentBColor={agentBTheme?.color || '#10B981'}
            />
            {opinionStats.topOpinions.length > 0 && (
              <div className="rr-quotes-list">
                {opinionStats.topOpinions.slice(0, 4).map((op: any, i: number) => {
                  const isA = op.stance === 'SUPPORT_A', isB = op.stance === 'SUPPORT_B'
                  const color = isA ? agentATheme?.color : isB ? agentBTheme?.color : '#94a3b8'
                  const label = isA ? agentA?.name : isB ? agentB?.name : '中立'
                  return (
                    <div key={i} className="rr-quote-item" style={{ borderLeftColor: color }}>
                      <span className="rr-quote-label" style={{ color }}>{label}</span>
                      <span className="rr-quote-text">"{op.content}"</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 关键论点速览 ── */}
        {keyPoints.length > 0 && (
          <section className="rr-section">
            <div className="rr-section-hd">
              <BulbOutlined className="rr-section-icon" />
              <h2 className="rr-section-title">关键论点速览</h2>
              <Tag className="rr-tag">{keyPoints.length} 轮</Tag>
            </div>
            <div className="rr-keypoints" style={{ gridTemplateColumns: `repeat(${Math.min(keyPoints.length, 3)}, 1fr)` }}>
              {keyPoints.map(kp => (
                <div key={kp.round} className="rr-kp-col">
                  <div className="rr-kp-hd">
                    <span className="rr-kp-badge">Round {kp.round}</span>
                    <span className="rr-kp-label">{kp.label}</span>
                  </div>
                  {kp.items.map((item: any, i: number) => {
                    const theme = item.agent._theme || AGENT_COLORS[0]
                    return (
                      <div key={i} className="rr-kp-item rr-kp-item--clickable"
                        style={{ borderLeftColor: theme.color }}
                        onClick={() => setKpModal({ agent: item.agent, content: item.fullContent, roundLabel: item.roundLabel })}
                      >
                        <div className="rr-kp-agent" style={{ color: theme.color }}>
                          <Avatar size={13} src={item.agent.avatar} style={{ background: theme.gradient, flexShrink: 0 }} />
                          {item.agent.name}
                        </div>
                        <div className="rr-kp-text">{item.excerpt}</div>
                        <div className="rr-kp-hint">点击查看完整论点</div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 完整辩论回顾 ── */}
        <section className="rr-section">
          <div className="rr-section-hd">
            <ThunderboltOutlined className="rr-section-icon" />
            <h2 className="rr-section-title">完整辩论回顾</h2>
          </div>
          <Collapse
            className="rr-rounds-collapse"
            {...(roundsActiveKey !== undefined
              ? { activeKey: roundsActiveKey }
              : { defaultActiveKey: rounds.length > 0 ? [String(rounds[0].round)] : [] }
            )}
            onChange={k => setRoundsActiveKey(Array.isArray(k) ? k : [k])}
            items={rounds.map(r => ({
              key: String(r.round),
              label: (
                <div className="rr-round-label">
                  {r.round ? <><span className="rr-round-badge">Round {r.round}</span><span className="rr-round-name">{getRoundLabel(r.round)}</span></> : <span className="rr-round-name">辩论回顾</span>}
                  <span className="rr-round-count">{r.items.length} 条</span>
                </div>
              ),
              children: (
                <div className="rr-timeline">
                  {r.items.map((m: any, mIdx: number) => {
                    const agent = agentMap[m.agentId]
                    const theme = agent?._theme || AGENT_COLORS[0]
                    return (
                      <div key={m.id || mIdx} className="rr-tl-item">
                        <div className="rr-tl-axis">
                          <div className="rr-tl-dot" style={{ background: theme.gradient }} />
                          {mIdx < r.items.length - 1 && <div className="rr-tl-line" />}
                        </div>
                        <div className="rr-msg">
                          <div className="rr-msg-hd" style={{ borderLeftColor: theme.color }}>
                            <Avatar size={28} src={agent?.avatar} style={{ background: theme.gradient, flexShrink: 0 }} />
                            <div>
                              <div className="rr-msg-name" style={{ color: theme.color }}>{agent?.name || m.agentId}</div>
                              {m.createdAt && <div className="rr-msg-time">{new Date(m.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>}
                            </div>
                          </div>
                          {m.reasoning?.trim() && (
                            <Collapse className="rr-collapse" size="small"
                              {...(reasoningActiveKeys !== undefined ? { activeKey: reasoningActiveKeys[String(m.id || `${m.agentId}-${m.roundNumber}`)] || [] } : {})}
                              items={[{ key: 'r', label: '思考过程', children: <div className="rr-reasoning">{m.reasoning}</div> }]}
                            />
                          )}
                          <div className="rr-msg-body">{m.content}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ),
            }))}
          />
        </section>
      </div>

      {/* ── 关键论点完整内容弹窗 ── */}
      {kpModal && (
        <div className="rr-kp-modal-overlay" onClick={() => setKpModal(null)}>
          <div className="rr-kp-modal" onClick={e => e.stopPropagation()}>
            <div className="rr-kp-modal-hd" style={{ borderLeftColor: kpModal.agent._theme?.color }}>
              <div className="rr-kp-modal-agent">
                <Avatar size={28} src={kpModal.agent.avatar} style={{ background: kpModal.agent._theme?.gradient, flexShrink: 0 }} />
                <div>
                  <div className="rr-kp-modal-name" style={{ color: kpModal.agent._theme?.color }}>{kpModal.agent.name}</div>
                  <div className="rr-kp-modal-round">{kpModal.roundLabel}</div>
                </div>
              </div>
              <button className="rr-kp-modal-close" onClick={() => setKpModal(null)}>✕</button>
            </div>
            <div className="rr-kp-modal-body">{kpModal.content}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoomReport
