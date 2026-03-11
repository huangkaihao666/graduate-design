import React from 'react'
import { CheckCircleFilled } from '@ant-design/icons'
import './AgentSelector.less'

interface Agent {
  id: string
  name: string
  description: string
  avatar: string
  personality?: string
}

interface AgentSelectorProps {
  agents: Agent[]
  selectedAgents: string[]
  onChange: (selectedIds: string[]) => void
  maxSelect?: number
  minSelect?: number
}

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
      // 取消选择
      onChange(selectedAgents.filter(id => id !== agentId))
    } else {
      // 选择
      if (selectedAgents.length < maxSelect) {
        onChange([...selectedAgents, agentId])
      }
    }
  }

  const isSelected = (agentId: string) => selectedAgents.includes(agentId)
  const isDisabled = (agentId: string) => 
    !isSelected(agentId) && selectedAgents.length >= maxSelect

  return (
    <div className="agent-selector">
      <div className="agent-selector-header">
        <h3 className="agent-selector-title">
          🤖 选择 AI 辩论组队
        </h3>
        <div className="agent-selector-tips">
          <span className="selected-count">
            已选择 <strong>{selectedAgents.length}</strong> / {maxSelect}
          </span>
          {selectedAgents.length < minSelect && (
            <span className="warning-text">
              请选择 {minSelect} 个 Agent 组队
            </span>
          )}
        </div>
      </div>

      <div className="agent-cards-grid">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`agent-card ${isSelected(agent.id) ? 'selected' : ''} ${
              isDisabled(agent.id) ? 'disabled' : ''
            }`}
            onClick={() => !isDisabled(agent.id) && handleAgentClick(agent.id)}
          >
            {isSelected(agent.id) && (
              <div className="selected-badge">
                <CheckCircleFilled />
              </div>
            )}

            <div className="agent-avatar">
              <img src={agent.avatar} alt={agent.name} />
            </div>

            <div className="agent-info">
              <h4 className="agent-name">{agent.name}</h4>
              <p className="agent-description">{agent.description}</p>
              {agent.personality && (
                <div className="agent-personality">
                  <span className="personality-tag">{agent.personality}</span>
                </div>
              )}
            </div>

            <div className="agent-hover-overlay">
              <span className="select-text">
                {isSelected(agent.id) ? '点击取消' : '点击选择'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AgentSelector
