import React, { useState } from 'react'
import { Button, Avatar } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import './VoteBar.less'

interface VoteBarProps {
  agents: any[]
  onVote: (agentId: string) => void
  onlineCount: number
}

export const VoteBar: React.FC<VoteBarProps> = ({ agents, onVote, onlineCount }) => {
  const [votedAgent, setVotedAgent] = useState<string | null>(null)

  const handleVote = (agentId: string) => {
    if (votedAgent) return // 已经投过票
    setVotedAgent(agentId)
    onVote(agentId)
  }

  return (
    <div className="vote-bar">
      <div className="vote-bar-content">
        <div className="vote-question">
          <span className="question-text">你支持哪个观点？</span>
          <span className="viewer-count">
            <EyeOutlined /> {onlineCount}+ 人在围观
          </span>
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
