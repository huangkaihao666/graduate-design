import React from 'react'
import { Card, Avatar, Progress, Tag } from 'antd'
import './LeftPanel.less'

interface LeftPanelProps {
  room: any
  agents: Record<string, any>
  currentRound: number
}

export const LeftPanel: React.FC<LeftPanelProps> = ({ room, agents, currentRound }) => {
  const roomAgents = room.agents || []
  const voteStats = room.votes || {}

  // 计算每个 Agent 的支持率
  const totalVotes = Object.values(voteStats).reduce((sum: number, count: any) => sum + (count || 0), 0)

  return (
    <div className="left-panel-content">
      {/* 案件信息 */}
      <Card className="case-info-card" bordered={false}>
        <h2 className="case-title">{room.title}</h2>
        <p className="case-description">{room.content}</p>
        
        {room.image && (
          <div className="case-image">
            <img src={room.image} alt="case" />
          </div>
        )}
      </Card>

      {/* 辩论进度 */}
      <Card className="round-indicator" bordered={false}>
        <div className="round-header">
          <span className="round-label">当前轮次</span>
          <Tag color="blue" className="round-tag">Round {currentRound}</Tag>
        </div>
        <Progress
          percent={(currentRound / 3) * 100}
          steps={3}
          strokeColor="#667eea"
          showInfo={false}
        />
        <div className="round-labels">
          <span className={currentRound >= 1 ? 'active' : ''}>初见</span>
          <span className={currentRound >= 2 ? 'active' : ''}>交锋</span>
          <span className={currentRound >= 3 ? 'active' : ''}>总结</span>
        </div>
      </Card>

      {/* 参与 AI Agents */}
      <Card className="agents-card" title="参与 AI Agents" bordered={false}>
        <div className="agents-list">
          {roomAgents.map((agentId: string) => {
            const agent = agents[agentId]
            if (!agent) return null

            const votes = voteStats[agentId] || 0
            const supportRate = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0.0'

            return (
              <div key={agentId} className="agent-item">
                <Avatar src={agent.avatar} size={48} className="agent-avatar" />
                <div className="agent-info">
                  <div className="agent-name">{agent.name}</div>
                  <div className="agent-personality">{agent.personality}</div>
                  <div className="agent-support">
                    <span className="support-label">支持率</span>
                    <span className="support-value">{supportRate}%</span>
                  </div>
                  <Progress
                    percent={parseFloat(supportRate)}
                    size="small"
                    strokeColor={{
                      '0%': '#667eea',
                      '100%': '#764ba2',
                    }}
                    showInfo={false}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 发起人信息 */}
      {room.owner && (
        <Card className="owner-card" title="发起人" bordered={false} size="small">
          <div className="owner-info">
            <Avatar src={room.owner.avatar} size={32} />
            <span className="owner-name">{room.owner.name}</span>
          </div>
        </Card>
      )}
    </div>
  )
}
