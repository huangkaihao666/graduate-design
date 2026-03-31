import React, { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Avatar,
  Button,
  Collapse,
  Divider,
  Progress,
  Skeleton,
  Tag,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  CopyOutlined,
  ShareAltOutlined,
  TrophyOutlined,
  UserOutlined,
  CalendarOutlined,
  LikeOutlined,
  RightOutlined,
} from '@ant-design/icons'
import * as roomApi from '@/api/rooms'
import './RoomReport.less'


type Winner =
  | { type: 'NO_VOTES' }
  | { type: 'TIE'; topPercent?: number }
  | { type: 'WIN'; agentId: string; topPercent?: number }

const getRoundLabel = (round: number) =>
  round === 1 ? '阐述观点' : round === 2 ? '交叉反驳' : round === 3 ? '律师裁决' : '辩论回顾'

const getRankLabel = (rank: number) =>
  rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}th`

// Agent 主题色
const AGENT_COLORS = [
  { color: '#F97316', gradient: 'linear-gradient(135deg, #F97316, #FB923C)', bg: 'rgba(249,115,22,0.1)' },
  { color: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #34D399)', bg: 'rgba(16,185,129,0.1)' },
  { color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)', bg: 'rgba(59,130,246,0.1)' },
]

const getAgentTheme = (idx: number) => AGENT_COLORS[idx % AGENT_COLORS.length]

export const RoomReport: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const roomId = Number(id || 0)

  const { data, isLoading } = useQuery({
    queryKey: ['room-report', roomId],
    queryFn: () => roomApi.getRoomReport(roomId),
    enabled: !!roomId,
  })

  const report = (data as any) || null
  const room = report?.room
  const voteStats = report?.voteStats
  const debateMessages = Array.isArray(report?.debateMessages) ? report.debateMessages : []
  const agents = Array.isArray(room?.agents) ? room.agents : []

  const agentMap = useMemo(() => {
    const m: Record<string, any> = {}
    agents.forEach((a: any, idx: number) => {
      m[a.id] = { ...a, _theme: getAgentTheme(idx) }
    })
    return m
  }, [agents])

  const winner: Winner | null = voteStats?.winner || null

  const rounds = useMemo(() => {
    const byRound: Record<string, any[]> = {}
    debateMessages.forEach((m: any) => {
      const r = Number(m.roundNumber || 0)
      const key = String(r || 0)
      byRound[key] = byRound[key] || []
      byRound[key].push(m)
    })
    const keys = Object.keys(byRound).sort((a, b) => Number(a) - Number(b))
    return keys.map((k) => ({ round: Number(k), items: byRound[k] }))
  }, [debateMessages])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      message.success('链接已复制')
    } catch {
      message.error('复制失败，请手动复制地址栏链接')
    }
  }

  const handleNativeShare = async () => {
    const title = room?.title ? `结案报告｜${room.title}` : '结案报告'
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title,
          url: window.location.href,
          text: '分享本次 AI 辩论的结案报告',
        })
      } else {
        await handleCopyLink()
      }
    } catch {
      // 用户取消
    }
  }

  // ── 加载骨架屏 ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="rr-page">
        <div className="rr-back-row">
          <Skeleton.Button active size="small" style={{ width: 80 }} />
        </div>
        <div className="rr-hero-skeleton">
          <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 3, width: ['60%', '80%', '50%'] }} />
        </div>
        <div className="rr-body">
          <div className="rr-main">
            <Skeleton active paragraph={{ rows: 10 }} />
          </div>
          <div className="rr-sidebar">
            <Skeleton active paragraph={{ rows: 5 }} />
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        </div>
      </div>
    )
  }

  if (!report || !room) {
    return (
      <div className="rr-page">
        <div className="rr-empty-state">
          <div className="rr-empty-icon">📭</div>
          <h3>报告不存在或无权限访问</h3>
          <p>该结案报告可能尚未生成，或您没有访问权限</p>
          <Button type="primary" onClick={() => navigate('/cases')} className="rr-empty-btn">
            返回案件列表
          </Button>
        </div>
      </div>
    )
  }

  const finalAdviceRaw = report?.finalAdvice?.raw || null
  const ranking = Array.isArray(voteStats?.ranking) ? voteStats.ranking : []
  const winnerAgent =
    winner && winner.type === 'WIN' ? agentMap[(winner as any).agentId] : null

  const statusConfig = {
    CLOSED: { label: '已结案', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    LIVE: { label: '进行中', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    WAITING: { label: '待开始', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  }
  const statusCfg = statusConfig[room.status as keyof typeof statusConfig] || statusConfig.CLOSED

  return (
    <div className="rr-page">
      {/* 返回按钮 */}
      <div className="rr-back-row">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/debate/${room.id}`)}
          className="rr-back-btn"
        >
          返回辩论室
        </Button>
      </div>

      {/* Hero 区域 */}
      <div className="rr-hero">
        {/* 背景装饰 */}
        <div className="rr-hero-orb rr-orb-1" />
        <div className="rr-hero-orb rr-orb-2" />
        <div className="rr-hero-grid" />

        <div className="rr-hero-content">
          {/* 顶部：状态 + 标签 */}
          <div className="rr-hero-top">
            <div className="rr-hero-badge">📊 结案报告</div>
            <span className="rr-status-pill" style={{ background: statusCfg.bg, color: statusCfg.color }}>
              {statusCfg.label}
            </span>
          </div>

          {/* 案件标题 */}
          <h1 className="rr-hero-title">{room.title}</h1>

          {/* Meta 信息行 */}
          <div className="rr-hero-meta">
            {room.owner && (
              <div className="rr-meta-item">
                <Avatar
                  src={room.owner.avatar}
                  icon={!room.owner.avatar && <UserOutlined />}
                  size={20}
                  className="rr-owner-avatar"
                />
                <span>{room.owner.name || room.owner.email || `用户${room.owner.id}`}</span>
              </div>
            )}
            {room.createdAt && (
              <div className="rr-meta-item">
                <CalendarOutlined />
                <span>{new Date(room.createdAt).toLocaleDateString('zh-CN')}</span>
              </div>
            )}
            <div className="rr-meta-item">
              <LikeOutlined />
              <span>{voteStats?.totalVotes ?? 0} 票</span>
            </div>
          </div>

          {/* AI 陪审团芯片 */}
          {agents.length > 0 && (
            <div className="rr-hero-agents">
              {agents.map((a: any, idx: number) => {
                const theme = getAgentTheme(idx)
                return (
                  <div
                    key={a.id}
                    className="rr-agent-chip"
                    style={{ borderColor: `${theme.color}30`, background: theme.bg }}
                  >
                    <Avatar size={20} src={a.avatar} style={{ background: theme.gradient }} />
                    <span className="rr-chip-name" style={{ color: theme.color }}>
                      {a.name}
                    </span>
                    {a.personality && (
                      <span className="rr-chip-tag">{a.personality}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 主体两栏 */}
      <div className="rr-body">
        {/* 左主栏：辩论时间线 */}
        <div className="rr-main">
          {/* 律师最终建议 */}
          <section className="rr-section">
            <div className="rr-section-header">
              <span className="rr-section-icon">⚖️</span>
              <h2 className="rr-section-title">律师最终裁决</h2>
              <Tag className="rr-round-tag">Round 3</Tag>
            </div>

            {!finalAdviceRaw ? (
              <div className="rr-no-advice">
                <span className="rr-no-advice-icon">🔇</span>
                <p>暂无律师建议（辩论可能未完整结束，或服务重启导致上下文丢失）</p>
              </div>
            ) : (
              <div className="rr-advice-card">
                {finalAdviceRaw.reasoning && String(finalAdviceRaw.reasoning).trim().length > 0 && (
                  <Collapse
                    className="rr-reasoning-collapse"
                    size="small"
                    items={[
                      {
                        key: 'r',
                        label: '📐 分析推理过程',
                        children: <div className="rr-reasoning">{finalAdviceRaw.reasoning}</div>,
                      },
                    ]}
                  />
                )}
                <div className="rr-advice-body">{finalAdviceRaw.content}</div>
              </div>
            )}
          </section>

          {/* 辩论时间线 */}
          <section className="rr-section">
            <div className="rr-section-header">
              <span className="rr-section-icon">🧾</span>
              <h2 className="rr-section-title">完整辩论回顾</h2>
            </div>

            <Collapse
              className="rr-rounds-collapse"
              defaultActiveKey={rounds.length > 0 ? [String(rounds[0].round)] : []}
              items={rounds.map((r) => ({
                key: String(r.round),
                label: (
                  <div className="rr-round-label">
                    {r.round ? (
                      <>
                        <span className="rr-round-badge">Round {r.round}</span>
                        <span className="rr-round-name">{getRoundLabel(r.round)}</span>
                      </>
                    ) : (
                      <span className="rr-round-name">辩论回顾</span>
                    )}
                    <span className="rr-round-count">{r.items.length} 条发言</span>
                  </div>
                ),
                children: (
                  <div className="rr-timeline">
                    {r.items.map((m: any, mIdx: number) => {
                      const agent = agentMap[m.agentId]
                      const theme = agent?._theme || AGENT_COLORS[0]
                      return (
                        <div key={m.id || mIdx} className="rr-timeline-item">
                          {/* 时间线轴 */}
                          <div className="rr-timeline-axis">
                            <div
                              className="rr-timeline-dot"
                              style={{ background: theme.gradient }}
                            />
                            {mIdx < r.items.length - 1 && <div className="rr-timeline-line" />}
                          </div>

                          {/* 发言卡片 */}
                          <div className="rr-msg-card">
                            <div className="rr-msg-header">
                              <div className="rr-msg-agent">
                                <Avatar
                                  size={32}
                                  src={agent?.avatar}
                                  style={{ background: theme.gradient, flexShrink: 0 }}
                                />
                                <div>
                                  <div className="rr-msg-name" style={{ color: theme.color }}>
                                    {agent?.name || m.agentId}
                                  </div>
                                  {m.createdAt && (
                                    <div className="rr-msg-time">
                                      {new Date(m.createdAt).toLocaleTimeString('zh-CN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {m.reasoning && String(m.reasoning).trim().length > 0 && (
                              <Collapse
                                className="rr-reasoning-collapse"
                                size="small"
                                items={[
                                  {
                                    key: 'r',
                                    label: '思考过程',
                                    children: (
                                      <div className="rr-reasoning">{m.reasoning}</div>
                                    ),
                                  },
                                ]}
                              />
                            )}
                            <div className="rr-msg-content">{m.content}</div>
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

        {/* 右侧栏 */}
        <aside className="rr-sidebar">
          {/* 胜出方 */}
          <div className="rr-widget">
            <div className="rr-widget-header">
              <TrophyOutlined className="rr-widget-icon" style={{ color: '#F59E0B' }} />
              <span>投票结果</span>
            </div>

            {/* 胜者展示 */}
            <div className="rr-winner-block">
              {winner?.type === 'WIN' ? (
                <div className="rr-winner-card">
                  <div className="rr-winner-crown">👑</div>
                  <Avatar
                    size={64}
                    src={winnerAgent?.avatar}
                    className="rr-winner-avatar"
                    style={{ background: winnerAgent?._theme?.gradient || 'var(--gradient-primary)' }}
                  >
                    {!winnerAgent?.avatar && String(winnerAgent?.name || 'W')[0]}
                  </Avatar>
                  <div className="rr-winner-name">{winnerAgent?.name || (winner as any).agentId}</div>
                  <div className="rr-winner-label">本场胜者</div>
                  {typeof (winner as any).topPercent === 'number' && (
                    <Progress
                      type="circle"
                      percent={Math.min(100, Math.max(0, Number((winner as any).topPercent)))}
                      size={80}
                      strokeColor={winnerAgent?._theme?.gradient || 'var(--gradient-primary)'}
                      trailColor="var(--border-color)"
                      format={(p) => (
                        <span style={{ fontSize: 16, fontWeight: 800, color: winnerAgent?._theme?.color || 'var(--color-primary)' }}>
                          {p}%
                        </span>
                      )}
                    />
                  )}
                </div>
              ) : winner?.type === 'TIE' ? (
                <div className="rr-winner-tie">
                  <div className="rr-tie-icon">🤝</div>
                  <div className="rr-tie-label">平票！势均力敌</div>
                  <div className="rr-tie-meta">总计 {voteStats?.totalVotes ?? 0} 票</div>
                </div>
              ) : (
                <div className="rr-winner-empty">
                  <div className="rr-no-vote-icon">🗳️</div>
                  <div className="rr-no-vote-label">暂无投票记录</div>
                  <div className="rr-no-vote-meta">建议以律师裁决作为结论参考</div>
                </div>
              )}
            </div>

            {/* 排名列表 */}
            {ranking.length > 0 && (
              <>
                <Divider className="rr-divider" />
                <div className="rr-rank-list">
                  {ranking.slice(0, 3).map((r: any) => {
                    const agent = agentMap[r.agentId]
                    const theme = agent?._theme || AGENT_COLORS[0]
                    return (
                      <div key={r.agentId} className="rr-rank-item">
                        <div className="rr-rank-left">
                          <span className="rr-rank-medal">{getRankLabel(r.rank)}</span>
                          <Avatar size={28} src={agent?.avatar} style={{ background: theme.gradient }} />
                          <span className="rr-rank-name">{agent?.name || r.agentId}</span>
                        </div>
                        <div className="rr-rank-bar">
                          <Progress
                            percent={Number(r.percent || 0)}
                            size="small"
                            strokeColor={theme.color}
                            trailColor="var(--border-color)"
                            format={(p) => (
                              <span style={{ fontSize: 11, color: theme.color, fontWeight: 700 }}>
                                {p}%
                              </span>
                            )}
                          />
                          <span className="rr-rank-count">{r.count} 票</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* 案件信息 */}
          <div className="rr-widget">
            <div className="rr-widget-header">
              <span className="rr-widget-emoji">📋</span>
              <span>案件信息</span>
            </div>
            <div className="rr-info-list">
              <div className="rr-info-row">
                <span className="rr-info-label">状态</span>
                <span className="rr-info-status" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                  {statusCfg.label}
                </span>
              </div>
              <div className="rr-info-row">
                <span className="rr-info-label">辩论轮次</span>
                <span className="rr-info-value">{rounds.filter((r) => r.round > 0).length} 轮</span>
              </div>
              <div className="rr-info-row">
                <span className="rr-info-label">总发言数</span>
                <span className="rr-info-value">{debateMessages.length} 条</span>
              </div>
              <div className="rr-info-row">
                <span className="rr-info-label">总投票数</span>
                <span className="rr-info-value">{voteStats?.totalVotes ?? 0} 票</span>
              </div>
            </div>
          </div>

          {/* 分享 */}
          <div className="rr-widget">
            <div className="rr-widget-header">
              <span className="rr-widget-emoji">🔗</span>
              <span>分享报告</span>
            </div>
            <div className="rr-share-area">
              <Button
                block
                icon={<CopyOutlined />}
                onClick={handleCopyLink}
                className="rr-share-copy-btn"
              >
                复制链接
              </Button>
              <Button
                block
                type="primary"
                icon={<ShareAltOutlined />}
                onClick={handleNativeShare}
                className="rr-share-btn"
              >
                一键分享
              </Button>
            </div>
          </div>

          {/* 跳转辩论室 */}
          <div className="rr-widget rr-widget-goto">
            <Button
              block
              type="text"
              onClick={() => navigate(`/debate/${room.id}`)}
              className="rr-goto-debate-btn"
            >
              进入辩论室查看实时
              <RightOutlined />
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default RoomReport
