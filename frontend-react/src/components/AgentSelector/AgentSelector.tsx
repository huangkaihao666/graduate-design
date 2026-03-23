import React from 'react'
import { CheckCircleFilled } from '@ant-design/icons'
import './AgentSelector.less'

interface Agent {
  id: string
  name: string
  description: string
  avatar?: string
  personality?: string
}

interface AgentSelectorProps {
  agents: Agent[]
  selectedAgents: string[]
  onChange: (selectedIds: string[]) => void
  maxSelect?: number
  minSelect?: number
}

// 三个 Agent 固定的视觉配置（按顺序映射）
const AGENT_VISUAL: Array<{
  emoji: string
  color: string
  bg: string
  border: string
  gradient: string
  tags: string[]
  role: string
}> = [
  {
    emoji: '⚡',
    color: '#F97316',
    bg: '#FFF7ED',
    border: 'rgba(249,115,22,0.25)',
    gradient: 'linear-gradient(135deg, #F97316, #FB923C)',
    tags: ['博弈论', '逻辑谬误', '社会学'],
    role: '直言现实者',
  },
  {
    emoji: '💚',
    color: '#10B981',
    bg: '#ECFDF5',
    border: 'rgba(16,185,129,0.25)',
    gradient: 'linear-gradient(135deg, #10B981, #34D399)',
    tags: ['心理学', 'NVC', 'NLP'],
    role: '共情辅导师',
  },
  {
    emoji: '⚖️',
    color: '#3B82F6',
    bg: '#EFF6FF',
    border: 'rgba(59,130,246,0.25)',
    gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
    tags: ['民法', '劳动法', '合同法'],
    role: '理性律师',
  },
]

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  agents,
  selectedAgents,
  onChange,
  maxSelect = 3,
  minSelect = 3,
}) => {
  const handleAgentClick = (agentId: string) => {
    const isSelected = selectedAgents.includes(agentId)
    if (isSelected) {
      onChange(selectedAgents.filter((id) => id !== agentId))
    } else {
      if (selectedAgents.length < maxSelect) {
        onChange([...selectedAgents, agentId])
      }
    }
  }

  const isSelected = (agentId: string) => selectedAgents.includes(agentId)
  const isDisabled = (agentId: string) =>
    !isSelected(agentId) && selectedAgents.length >= maxSelect

  const allSelected = selectedAgents.length === maxSelect

  return (
    <div className="agent-selector">
      {/* 头部 */}
      <div className="selector-header">
        <div className="selector-title-row">
          <h3 className="selector-title">
            <span className="selector-title-icon">🤖</span>
            选择 AI 辩论团队
          </h3>
          <div className={`selector-count ${allSelected ? 'complete' : ''}`}>
            <span className="count-num">{selectedAgents.length}</span>
            <span className="count-sep">/</span>
            <span className="count-max">{maxSelect}</span>
            {allSelected && <CheckCircleFilled className="count-check" />}
          </div>
        </div>
        <p className="selector-desc">
          {allSelected
            ? '✅ 三位 AI 专家就位，可以发起辩论了！'
            : `请选择 ${minSelect} 位 AI 专家参与辩论（需全部选中）`}
        </p>
      </div>

      {/* Agent 卡片网格 */}
      <div className="agent-grid">
        {agents.map((agent, idx) => {
          const visual = AGENT_VISUAL[idx % AGENT_VISUAL.length]
          const selected = isSelected(agent.id)
          const disabled = isDisabled(agent.id)

          return (
            <div
              key={agent.id}
              className={`agent-item ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => !disabled && handleAgentClick(agent.id)}
              style={{
                '--agent-color': visual.color,
                '--agent-bg': visual.bg,
                '--agent-border': visual.border,
                '--agent-gradient': visual.gradient,
              } as React.CSSProperties}
            >
              {/* 选中勾 */}
              {selected && (
                <div className="agent-check">
                  <CheckCircleFilled />
                </div>
              )}

              {/* Agent 头像 */}
              <div className="agent-avatar-wrap">
                {agent.avatar
                  ? <img src={agent.avatar} alt={agent.name} className="agent-avatar-img" />
                  : <span className="agent-avatar-emoji">{visual.emoji}</span>
                }
                <div className="agent-avatar-ring" />
              </div>

              {/* 角色标签 */}
              <div className="agent-role-badge">{visual.role}</div>

              {/* Agent 名称 */}
              <div className="agent-name">{agent.name}</div>

              {/* Agent 介绍 */}
              <p className="agent-desc">{agent.description}</p>

              {/* 专长标签 */}
              <div className="agent-tags">
                {(agent.personality
                  ? [agent.personality, ...visual.tags.slice(0, 2)]
                  : visual.tags
                ).map((tag) => (
                  <span key={tag} className="agent-tag">{tag}</span>
                ))}
              </div>

              {/* Hover 蒙层 */}
              <div className="agent-overlay">
                <span className="overlay-text">
                  {selected ? '取消选择' : '选择此专家'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 底部进度提示 */}
      <div className="selector-footer">
        <div className="selector-progress">
          {Array.from({ length: maxSelect }).map((_, i) => (
            <div
              key={i}
              className={`progress-dot ${i < selectedAgents.length ? 'filled' : ''}`}
            />
          ))}
        </div>
        {!allSelected && (
          <span className="progress-hint">
            还需选择 {minSelect - selectedAgents.length} 位专家
          </span>
        )}
      </div>
    </div>
  )
}

export default AgentSelector
