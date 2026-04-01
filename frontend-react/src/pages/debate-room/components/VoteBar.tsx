import React, { useMemo, useEffect, useRef, useState } from 'react'
import { Avatar } from 'antd'
import { CloseOutlined, EyeOutlined, CheckOutlined } from '@ant-design/icons'
import './VoteBar.less'

interface VoteBarProps {
  agents: any[]
  onVote: (agentId: string) => Promise<boolean> | boolean | void
  onlineCount: number
  voteCounts?: Record<string, number>
  totalVotes?: number
  countdown?: number
}

const AGENT_COLORS = [
  { color: '#F97316', gradient: 'linear-gradient(135deg, #F97316, #FB923C)', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.35)' },
  { color: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #34D399)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.35)' },
  { color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.35)' },
]

export const VoteBar: React.FC<VoteBarProps> = ({
  agents,
  onVote,
  onlineCount,
  voteCounts,
  totalVotes,
  countdown,
}) => {
  const [votedAgent, setVotedAgent] = useState<string | null>(null)
  const [visible, setVisible] = useState(true)
  const [voting, setVoting] = useState(false)
  const closeTimerRef = useRef<number | null>(null)

  // 投票成功后 1.5s 自动关闭弹窗
  useEffect(() => {
    if (votedAgent) {
      closeTimerRef.current = window.setTimeout(() => setVisible(false), 1500)
    }
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    }
  }, [votedAgent])

  const winner = useMemo(() => {
    if (!voteCounts) return null
    let best: { agentId: string; count: number } | null = null
    for (const [agentId, count] of Object.entries(voteCounts)) {
      if (!best || count > best.count) best = { agentId, count }
    }
    if (!best || best.count <= 0) return null
    const isTie = Object.values(voteCounts).filter((c) => c === best!.count).length > 1
    return isTie ? { agentId: null, count: best.count } : best
  }, [voteCounts])

  const handleVote = async (agentId: string) => {
    if (votedAgent || voting) return
    setVoting(true)
    setVotedAgent(agentId)
    const ok = await onVote(agentId)
    if (ok === false) setVotedAgent(null)
    setVoting(false)
  }

  if (!visible) return null

  const urgentCountdown = typeof countdown === 'number' && countdown <= 10 && countdown > 0

  return (
    <>
      {/* 遮罩 */}
      <div className="vote-modal-overlay" onClick={() => !votedAgent && setVisible(false)} />

      {/* 弹窗 */}
      <div className="vote-modal">
        {/* 头部 */}
        <div className="vote-modal-header">
          <div className="vote-modal-title">
            <span className="vote-modal-icon">🗳️</span>
            <span>辩论结束，请投票</span>
          </div>
          <div className="vote-modal-meta">
            {typeof countdown === 'number' && countdown > 0 && (
              <span className={`vote-modal-countdown ${urgentCountdown ? 'urgent' : ''}`}>
                {countdown}s
              </span>
            )}
            <span className="vote-modal-online">
              <EyeOutlined /> {onlineCount}+
            </span>
            <button className="vote-modal-close" onClick={() => setVisible(false)}>
              <CloseOutlined />
            </button>
          </div>
        </div>

        {/* 副标题 */}
        <div className="vote-modal-sub">
          你支持哪位 AI 的观点？
          {typeof totalVotes === 'number' && totalVotes > 0 && (
            <span className="vote-modal-stats">
              · 已有 {totalVotes} 人投票
              {winner?.agentId && (
                <> · 暂时领先：{agents.find((a) => a.id === winner.agentId)?.name}</>
              )}
              {winner && !winner.agentId && <> · 暂时平票</>}
            </span>
          )}
        </div>

        {/* 投票成功态 */}
        {votedAgent ? (
          <div className="vote-modal-success">
            <div className="vote-success-icon">
              <CheckOutlined />
            </div>
            <div className="vote-success-text">
              已投票给 <strong>{agents.find((a) => a.id === votedAgent)?.name}</strong>
            </div>
            <div className="vote-success-sub">感谢参与，窗口即将关闭…</div>
          </div>
        ) : (
          /* 投票按钮列表 */
          <div className="vote-modal-agents">
            {agents.map((agent, idx) => {
              const theme = AGENT_COLORS[idx % AGENT_COLORS.length]
              const count = voteCounts?.[agent.id] ?? 0
              const percent = (totalVotes ?? 0) > 0 ? Math.round((count / (totalVotes!)) * 100) : 0

              return (
                <button
                  key={agent.id}
                  className="vote-agent-btn"
                  onClick={() => handleVote(agent.id)}
                  disabled={voting}
                  style={{ '--agent-color': theme.color, '--agent-bg': theme.bg, '--agent-border': theme.border, '--agent-gradient': theme.gradient } as React.CSSProperties}
                >
                  <Avatar src={agent.avatar} size={44} className="vote-agent-avatar" />
                  <div className="vote-agent-info">
                    <div className="vote-agent-name">{agent.name}</div>
                    {agent.personality && (
                      <div className="vote-agent-personality">{agent.personality}</div>
                    )}
                  </div>
                  {(totalVotes ?? 0) > 0 && (
                    <div className="vote-agent-bar-wrap">
                      <div className="vote-agent-bar">
                        <div className="vote-agent-bar-fill" style={{ width: `${percent}%`, background: theme.gradient }} />
                      </div>
                      <span className="vote-agent-percent" style={{ color: theme.color }}>{percent}%</span>
                    </div>
                  )}
                  <div className="vote-agent-arrow">›</div>
                </button>
              )
            })}
          </div>
        )}

        {/* 倒计时进度条 */}
        {typeof countdown === 'number' && countdown > 0 && (
          <div className="vote-modal-progress">
            <div
              className={`vote-modal-progress-fill ${urgentCountdown ? 'urgent' : ''}`}
              style={{ width: `${(countdown / 30) * 100}%` }}
            />
          </div>
        )}
      </div>
    </>
  )
}

export default VoteBar
