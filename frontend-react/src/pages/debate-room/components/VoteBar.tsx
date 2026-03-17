import React, { useMemo, useState } from 'react'
import { Button, Avatar } from 'antd'
import { EyeOutlined, CloseOutlined } from '@ant-design/icons'
import './VoteBar.less'

interface VoteBarProps {
  agents: any[]
  onVote: (agentId: string) => Promise<boolean> | boolean | void
  onlineCount: number
  voteCounts?: Record<string, number>
  totalVotes?: number
}

export const VoteBar: React.FC<VoteBarProps> = ({
  agents,
  onVote,
  onlineCount,
  voteCounts,
  totalVotes,
}) => {
  const [votedAgent, setVotedAgent] = useState<string | null>(null)
  const [visible, setVisible] = useState(true)
  const [minimized, setMinimized] = useState(false)

  const handleVote = async (agentId: string) => {
    if (votedAgent) return // 已经投过票
    setVotedAgent(agentId)
    const ok = await onVote(agentId)
    // 投票成功后允许用户关闭（不强制关闭）；若失败则允许重投
    if (ok === false) {
      setVotedAgent(null)
    }
  }

  const winner = useMemo(() => {
    if (!voteCounts) return null
    let best: { agentId: string; count: number } | null = null
    for (const [agentId, count] of Object.entries(voteCounts)) {
      if (!best || count > best.count) best = { agentId, count }
    }
    if (!best || best.count <= 0) return null
    const isTie =
      Object.values(voteCounts).filter((c) => c === best!.count).length > 1
    return isTie ? { agentId: null, count: best.count } : best
  }, [voteCounts])

  if (!visible) return null

  if (minimized) {
    return (
      <div className="vote-bar vote-bar-minimized">
        <Button type="primary" size="small" onClick={() => setMinimized(false)}>
          打开投票
        </Button>
      </div>
    )
  }

  return (
    <div className="vote-bar">
      <div className="vote-bar-content">
        <div className="vote-question">
          <span className="question-text">
            你支持哪个观点？
            {typeof totalVotes === 'number' && (
              <span className="vote-summary">
                · 已投 {totalVotes} 票
                {winner && (
                  <>
                    {' '}
                    ·{' '}
                    {winner.agentId
                      ? `领先：${agents.find((a) => a.id === winner.agentId)?.name || winner.agentId}`
                      : `暂时平票（${winner.count}）`}
                  </>
                )}
              </span>
            )}
          </span>
          <span className="viewer-count">
            <EyeOutlined /> {onlineCount}+ 人在围观
          </span>
          <div className="vote-actions">
            <Button
              size="small"
              type="text"
              className="vote-minimize"
              onClick={() => setMinimized(true)}
            >
              最小化
            </Button>
            <Button
              size="small"
              type="text"
              aria-label="close"
              onClick={() => setVisible(false)}
              icon={<CloseOutlined />}
            />
          </div>
        </div>

        <div className="vote-buttons">
          {agents.map((agent) => (
            <Button
              key={agent.id}
              size="large"
              type={votedAgent === agent.id ? 'primary' : 'default'}
              className={`vote-button ${votedAgent === agent.id ? 'voted' : ''}`}
              onClick={() => handleVote(agent.id)}
              disabled={!!votedAgent}
            >
              <Avatar src={agent.avatar} size={32} />
              <span className="vote-label">{agent.name}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
