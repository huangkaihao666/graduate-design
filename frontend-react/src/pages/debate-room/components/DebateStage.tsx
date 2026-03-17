import React, { useEffect, useRef } from 'react'
import { Avatar, Empty, Button } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import './DebateStage.less'

interface Message {
  id: string
  agentId: string
  content: string
  roundNumber: number
  createdAt: Date
  isTyping?: boolean
}

interface DebateStageProps {
  messages: Message[]
  agents: Record<string, any>
  typingAgents: Set<string>
  currentRound: number
  isOwner?: boolean
  canStart?: boolean
  onStartDebate?: () => void
}

export const DebateStage: React.FC<DebateStageProps> = ({
  messages,
  agents,
  typingAgents,
  currentRound,
  isOwner,
  canStart,
  onStartDebate,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="debate-stage">
      <div className="stage-header">
        <h2>🎭 AI 辩论舞台</h2>
        <div className="stage-header-right">
          <span className="round-badge">Round {currentRound}</span>
          {isOwner && canStart && onStartDebate && (
            <Button type="primary" size="small" onClick={onStartDebate} style={{ marginLeft: 12 }}>
              🚀 开始辩论
            </Button>
          )}
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <Empty
            description="辩论尚未开始，请等待..."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          messages.map((message) => {
            const agent = agents[message.agentId]
            if (!agent) return null

            return (
              <div key={message.id} className="message-item">
                <div className="message-header">
                  <Avatar src={agent.avatar} size={40} />
                  <div className="message-meta">
                    <span className="agent-name">{agent.name}</span>
                    <span className="message-time">
                      Round {message.roundNumber} · {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="message-content">
                  {message.content}
                  {message.isTyping && (
                    <span className="typing-cursor">▊</span>
                  )}
                </div>
              </div>
            )
          })
        )}

        {/* 正在输入指示器 */}
        {Array.from(typingAgents).map((agentId) => {
          const agent = agents[agentId]
          if (!agent) return null

          return (
            <div key={`typing-${agentId}`} className="typing-indicator">
              <Avatar src={agent.avatar} size={32} />
              <span className="typing-text">
                {agent.name} 正在输入
                <LoadingOutlined style={{ marginLeft: 8 }} />
              </span>
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
