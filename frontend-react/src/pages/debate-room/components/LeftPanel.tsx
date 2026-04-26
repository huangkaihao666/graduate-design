import React from 'react'
import { Avatar, Button, Progress, Tooltip } from 'antd'
import { ArrowLeftOutlined, CheckCircleFilled, HeartOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import './LeftPanel.less'

interface LeftPanelProps {
  room: any
  agents: Record<string, any>
  currentRound: number
  myVotedAgentId?: string | null
  onBack?: () => void
}

const ROUND_LABELS = ['初见', '交锋', '总结']

export const LeftPanel: React.FC<LeftPanelProps> = ({
  room,
  agents,
  currentRound,
  myVotedAgentId,
  onBack,
}) => {
  const navigate = useNavigate()
  const roomAgents: string[] = room.agents || []
  const voteStats = room.votes || {}
  const totalVotes = Object.values(voteStats).reduce((sum: number, c: any) => sum + (c || 0), 0)

  return (
    <div className="left-panel-wrap">
      {/* 顶部：返回按钮 + 案件标题 */}
      <div className="lp-header">
        {onBack && (
          <button className="lp-back-btn" onClick={onBack}>
            <ArrowLeftOutlined />
            <span>返回</span>
          </button>
        )}
        <div className="lp-title">{room.title}</div>
      </div>

      {/* 滚动内容区 */}
      <div className="lp-body">
        {/* 案件描述 */}
        {room.content && (
          <div className="lp-desc">{room.content}</div>
        )}

        {/* 案件图片 */}
        {room.image && (
          <div className="lp-image">
            <img src={room.image} alt="case" />
          </div>
        )}

        {/* 轮次进度 */}
        <div className="lp-section">
          <div className="lp-section-header">
            <span className="lp-section-label">当前轮次</span>
            <span className="lp-round-tag">Round {currentRound}</span>
          </div>
          <div className="lp-progress-track">
            {ROUND_LABELS.map((label, i) => (
              <div key={i} className={`lp-progress-step ${currentRound > i ? 'done' : ''} ${currentRound === i + 1 ? 'active' : ''}`}>
                <div className="lp-step-dot" />
                <span className="lp-step-label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI 参与者 */}
        {roomAgents.length > 0 && (
          <div className="lp-section">
            <div className="lp-section-label" style={{ marginBottom: 8 }}>参与 AI</div>
            <div className="lp-agents">
              {roomAgents.map((agentId: string) => {
                const agent = agents[agentId]
                if (!agent) return null
                const votes = voteStats[agentId] || 0
                const pct = totalVotes > 0 ? parseFloat(((votes / totalVotes) * 100).toFixed(1)) : 0
                const isMyVote = myVotedAgentId === agentId

                return (
                  <div key={agentId} className={`lp-agent-item ${isMyVote ? 'voted' : ''}`}>
                    <div className="lp-agent-avatar-wrap">
                      <Avatar src={agent.avatar} size={36} />
                      {isMyVote && (
                        <Tooltip title="我的投票">
                          <CheckCircleFilled className="lp-voted-badge" />
                        </Tooltip>
                      )}
                    </div>
                    <div className="lp-agent-info">
                      <div className="lp-agent-name">
                        {agent.name}
                        {isMyVote && <span className="lp-voted-tag">我的选择</span>}
                      </div>
                      {agent.personality && (
                        <div className="lp-agent-personality">{agent.personality}</div>
                      )}
                      <div className="lp-agent-bar-row">
                        <div className="lp-agent-bar">
                          <div className="lp-agent-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="lp-agent-pct">{pct}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 发起人 */}
        {room.owner && (
          <div className="lp-section lp-owner">
            <span className="lp-section-label">发起人</span>
            <div className="lp-owner-info">
              <Avatar src={room.owner.avatar} size={24} />
              <span className="lp-owner-name">{room.owner.name || room.owner.email}</span>
            </div>
          </div>
        )}

      </div>

      {/* AI 共情师入口 — 固定在面板底部 */}
      <div className="lp-counseling-entry">
        <div className="lp-counseling-card">
          <div className="lp-counseling-card-left">
            <span className="lp-counseling-icon">💚</span>
            <div>
              <div className="lp-counseling-card-title">有话想说？</div>
              <div className="lp-counseling-card-sub">和 AI 情绪伙伴聊聊这个话题</div>
            </div>
          </div>
          <Button
            size="small"
            icon={<HeartOutlined />}
            className="lp-counseling-btn"
            onClick={() =>
              navigate(
                `/counseling?roomId=${room.id}&roomTitle=${encodeURIComponent(room.title || '')}`
              )
            }
          >
            去聊聊
          </Button>
        </div>
      </div>
    </div>
  )
}
