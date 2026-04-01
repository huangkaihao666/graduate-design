import React, { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Avatar,
  Button,
  Collapse,
  Progress,
  Skeleton,
  Tag,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  CopyOutlined,
  ShareAltOutlined,
  UserOutlined,
  CalendarOutlined,
  LikeOutlined,
  RightOutlined,
  MessageOutlined,
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
        await (navigator as any).share({ title, url: window.location.href, text: '分享本次 AI 辩论的结案报告' })
      } else {
        await handleCopyLink()
      }
    } catch { /* 用户取消 */ }
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
  const winnerAgent = winner?.type === 'WIN' ? agentMap[(winner as any).agentId] : null
  const hasVotes = winner?.type !== 'NO_VOTES' && (voteStats?.totalVotes ?? 0) > 0

  const statusConfig = {
    CLOSED: { label: '已结案', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    LIVE:   { label: '进行中', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    WAITING:{ label: '待开始', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
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

      {/* Hero */}
      <div className="rr-hero">
        <div className="rr-hero-orb rr-orb-1" />
        <div className="rr-hero-orb rr-orb-2" />
        <div className="rr-hero-grid" />
        <div className="rr-hero-content">
          <div className="rr-hero-top">
            <div className="rr-hero-badge">📊 结案报告</div>
            <span className="rr-status-pill" style={{ background: statusCfg.bg, color: statusCfg.color }}>
              {statusCfg.label}
            </span>
          </div>
          <h1 className="rr-hero-title">{room.title}</h1>
          <div className="rr-hero-meta">
            {room.owner && (
              <div className="rr-meta-item">
                <Avatar src={room.owner.avatar} icon={!room.owner.avatar && <UserOutlined />} size={20} className="rr-owner-avatar" />
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
            <div className="rr-meta-item">
              <MessageOutlined />
              <span>{debateMessages.length} 条发言</span>
            </div>
          </div>
          {agents.length > 0 && (
            <div className="rr-hero-agents">
              {agents.map((a: any, idx: number) => {
                const theme = getAgentTheme(idx)
                return (
                  <div key={a.id} className="rr-agent-chip" style={{ borderColor: `${theme.color}30`, background: theme.bg }}>
                    <Avatar size={20} src={a.avatar} style={{ background: theme.gradient }} />
                    <span className="rr-chip-name" style={{ color: theme.color }}>{a.name}</span>
                    {a.personality && <span className="rr-chip-tag">{a.personality}</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 主体两栏 */}
      <div className="rr-body">
        {/* 左主栏 */}
        <div className="rr-main">

          {/* ① 投票结果 / 胜者 —— 优先展示 */}
          <section className="rr-section rr-verdict-section">
            <div className="rr-section-header">
              <span className="rr-section-icon">🏆</span>
              <h2 className="rr-section-title">投票裁决</h2>
              <Tag className="rr-round-tag">{voteStats?.totalVotes ?? 0} 票</Tag>
            </div>

            {!hasVotes ? (
              /* 无票 → 提示并折叠展示律师建议 */
              <div className="rr-no-vote-verdict">
                <div className="rr-no-vote-illus">🗳️</div>
                <div className="rr-no-vote-title">本场暂无投票记录</div>
                <div className="rr-no-vote-sub">以下为 AI 律师的综合裁决，可作为参考结论</div>
                {finalAdviceRaw ? (
                  <div className="rr-advice-inline">
                    <div className="rr-advice-body">{finalAdviceRaw.content}</div>
                    {finalAdviceRaw.reasoning && String(finalAdviceRaw.reasoning).trim().length > 0 && (
                      <Collapse
                        className="rr-reasoning-collapse"
                        size="small"
                        items={[{ key: 'r', label: '📐 查看分析推理', children: <div className="rr-reasoning">{finalAdviceRaw.reasoning}</div> }]}
                      />
                    )}
                  </div>
                ) : (
                  <div className="rr-no-advice-hint">律师建议暂未生成</div>
                )}
              </div>
            ) : winner?.type === 'TIE' ? (
              /* 平票 */
              <div className="rr-tie-verdict">
                <div className="rr-tie-icon">🤝</div>
                <div className="rr-tie-title">势均力敌，平票！</div>
                <div className="rr-tie-sub">共 {voteStats?.totalVotes} 票，各方票数相同</div>
                <div className="rr-tie-agents">
                  {ranking.map((r: any) => {
                    const agent = agentMap[r.agentId]
                    const theme = agent?._theme || AGENT_COLORS[0]
                    return (
                      <div key={r.agentId} className="rr-tie-agent-item" style={{ borderColor: `${theme.color}40`, background: theme.bg }}>
                        <Avatar size={36} src={agent?.avatar} style={{ background: theme.gradient }} />
                        <span style={{ color: theme.color, fontWeight: 700 }}>{agent?.name}</span>
                        <span style={{ color: theme.color, fontSize: 13 }}>{r.count} 票</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* 有明确胜者 */
              <div className="rr-win-verdict">
                {/* 胜者主卡 */}
                <div className="rr-winner-main" style={{ '--winner-gradient': winnerAgent?._theme?.gradient } as React.CSSProperties}>
                  <div className="rr-winner-crown-wrap">
                    <div className="rr-winner-crown">👑</div>
                    <Avatar
                      size={80}
                      src={winnerAgent?.avatar}
                      className="rr-winner-big-avatar"
                      style={{ background: winnerAgent?._theme?.gradient }}
                    >
                      {!winnerAgent?.avatar && String(winnerAgent?.name || 'W')[0]}
                    </Avatar>
                  </div>
                  <div className="rr-winner-info">
                    <div className="rr-winner-label-tag">本场胜者</div>
                    <div className="rr-winner-name" style={{ color: winnerAgent?._theme?.color }}>
                      {winnerAgent?.name || (winner as any).agentId}
                    </div>
                    {winnerAgent?.personality && (
                      <div className="rr-winner-personality">{winnerAgent.personality}</div>
                    )}
                    {typeof (winner as any).topPercent === 'number' && (
                      <div className="rr-winner-percent">
                        获得 <strong style={{ color: winnerAgent?._theme?.color }}>{(winner as any).topPercent}%</strong> 的票数支持
                      </div>
                    )}
                  </div>
                  {typeof (winner as any).topPercent === 'number' && (
                    <Progress
                      type="circle"
                      percent={Math.min(100, Math.max(0, Number((winner as any).topPercent)))}
                      size={72}
                      strokeColor={winnerAgent?._theme?.gradient || 'var(--gradient-primary)'}
                      format={(p) => (
                        <span style={{ fontSize: 14, fontWeight: 800, color: winnerAgent?._theme?.color }}>{p}%</span>
                      )}
                    />
                  )}
                </div>

                {/* 所有选手票数排名 */}
                {ranking.length > 0 && (
                  <div className="rr-ranking-list">
                    {ranking.map((r: any) => {
                      const agent = agentMap[r.agentId]
                      const theme = agent?._theme || AGENT_COLORS[0]
                      const isWinner = r.agentId === (winner as any).agentId
                      return (
                        <div key={r.agentId} className={`rr-ranking-item ${isWinner ? 'is-winner' : ''}`}>
                          <span className="rr-rank-medal">{getRankLabel(r.rank)}</span>
                          <Avatar size={32} src={agent?.avatar} style={{ background: theme.gradient, flexShrink: 0 }} />
                          <span className="rr-rank-name">{agent?.name || r.agentId}</span>
                          <div className="rr-rank-bar-wrap">
                            <div className="rr-rank-bar">
                              <div className="rr-rank-bar-fill" style={{ width: `${r.percent || 0}%`, background: theme.gradient }} />
                            </div>
                            <span className="rr-rank-pct" style={{ color: theme.color }}>{r.percent ?? 0}%</span>
                          </div>
                          <span className="rr-rank-count">{r.count} 票</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ② 有胜者时展示胜者精彩发言；无投票时展示律师建议 */}
          {hasVotes && winner?.type === 'WIN' && winnerAgent ? (
            (() => {
              // 取胜者最后一条发言（通常是最具代表性的总结）
              const winnerMsgs = debateMessages.filter((m: any) => m.agentId === winnerAgent.id)
              const lastMsg = winnerMsgs[winnerMsgs.length - 1]
              return lastMsg ? (
                <section className="rr-section">
                  <div className="rr-section-header">
                    <Avatar size={24} src={winnerAgent.avatar} style={{ background: winnerAgent._theme?.gradient, flexShrink: 0 }} />
                    <h2 className="rr-section-title" style={{ color: winnerAgent._theme?.color }}>
                      {winnerAgent.name} · 精彩发言
                    </h2>
                    <Tag className="rr-round-tag">Round {lastMsg.roundNumber}</Tag>
                  </div>
                  <div className="rr-winner-speech">
                    {lastMsg.reasoning && String(lastMsg.reasoning).trim().length > 0 && (
                      <Collapse
                        className="rr-reasoning-collapse"
                        size="small"
                        items={[{ key: 'r', label: '思考过程', children: <div className="rr-reasoning">{lastMsg.reasoning}</div> }]}
                      />
                    )}
                    <div className="rr-winner-speech-content">{lastMsg.content}</div>
                  </div>
                </section>
              ) : null
            })()
          ) : !hasVotes ? null : null}

          {/* ③ 辩论时间线 */}
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
                          <div className="rr-timeline-axis">
                            <div className="rr-timeline-dot" style={{ background: theme.gradient }} />
                            {mIdx < r.items.length - 1 && <div className="rr-timeline-line" />}
                          </div>
                          <div className="rr-msg-card">
                            <div className="rr-msg-header">
                              <div className="rr-msg-agent">
                                <Avatar size={32} src={agent?.avatar} style={{ background: theme.gradient, flexShrink: 0 }} />
                                <div>
                                  <div className="rr-msg-name" style={{ color: theme.color }}>{agent?.name || m.agentId}</div>
                                  {m.createdAt && (
                                    <div className="rr-msg-time">
                                      {new Date(m.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {m.reasoning && String(m.reasoning).trim().length > 0 && (
                              <Collapse
                                className="rr-reasoning-collapse"
                                size="small"
                                items={[{ key: 'r', label: '思考过程', children: <div className="rr-reasoning">{m.reasoning}</div> }]}
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
          {/* 案件信息 */}
          <div className="rr-widget">
            <div className="rr-widget-header">
              <span className="rr-widget-emoji">📋</span>
              <span>案件信息</span>
            </div>
            <div className="rr-info-list">
              <div className="rr-info-row">
                <span className="rr-info-label">状态</span>
                <span className="rr-info-status" style={{ background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
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

          {/* 参与 AI */}
          {agents.length > 0 && (
            <div className="rr-widget">
              <div className="rr-widget-header">
                <span className="rr-widget-emoji">🤖</span>
                <span>参与 AI</span>
              </div>
              <div className="rr-agents-list">
                {agents.map((a: any, idx: number) => {
                  const theme = getAgentTheme(idx)
                  const rankItem = ranking.find((r: any) => r.agentId === a.id)
                  return (
                    <div key={a.id} className="rr-agent-row">
                      <Avatar size={36} src={a.avatar} style={{ background: theme.gradient, flexShrink: 0 }} />
                      <div className="rr-agent-row-info">
                        <div className="rr-agent-row-name" style={{ color: theme.color }}>{a.name}</div>
                        {a.personality && <div className="rr-agent-row-tag">{a.personality}</div>}
                        {rankItem && (
                          <div className="rr-agent-row-bar">
                            <div className="rr-agent-bar-fill" style={{ width: `${rankItem.percent || 0}%`, background: theme.gradient }} />
                          </div>
                        )}
                      </div>
                      {rankItem && (
                        <span className="rr-agent-row-pct" style={{ color: theme.color }}>{rankItem.percent ?? 0}%</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 分享 */}
          <div className="rr-widget">
            <div className="rr-widget-header">
              <span className="rr-widget-emoji">🔗</span>
              <span>分享报告</span>
            </div>
            <div className="rr-share-area">
              <Button block icon={<CopyOutlined />} onClick={handleCopyLink} className="rr-share-copy-btn">复制链接</Button>
              <Button block type="primary" icon={<ShareAltOutlined />} onClick={handleNativeShare} className="rr-share-btn">一键分享</Button>
            </div>
          </div>

          {/* 跳转辩论室 */}
          <div className="rr-widget rr-widget-goto">
            <Button block type="text" onClick={() => navigate(`/debate/${room.id}`)} className="rr-goto-debate-btn">
              进入辩论室查看实时 <RightOutlined />
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default RoomReport
